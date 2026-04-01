# UfitMotion — Restructure & Production Deployment Design

**Date:** 2026-03-31
**Status:** Approved
**Author:** Jahleel (brainstormed with Claude)

---

## 1. Problem Statement

UfitMotion is a working Flask + vanilla JS staff-facing PE operations app built to a Codex Build Prompt spec. All four features from the spec are fully implemented. The problem is not functionality — it's structure and deployability.

The current package is demo-ready but not production-ready:
- `server.py` is 3,618 lines (monolithic)
- `app.js` is 4,272 lines (monolithic)
- SQLite database is committed to the repo
- Secrets have hardcoded fallbacks
- Deployment is macOS `.command` shell scripts
- No tests, no migrations, no CI

**Goal:** Restructure the project using KB best practices, then deploy to Railway (app) + Supabase (Postgres).

---

## 2. Source Audit

### Current Package (`UfitMotion-app-package`)

| File | Lines | Role |
|---|---|---|
| `server.py` | 3,618 | Flask backend — all routes, DB, auth, seeds, OCR, email |
| `static/app.js` | 4,272 | SPA frontend — all views, state, API calls |
| `static/styles.css` | — | Ufit blue/yellow branded styles |
| `templates/index.html` | — | Single HTML shell |
| `scripts/vision_ocr.swift` | — | Apple Vision OCR for score sheet photos |
| `scripts/vision_ocr` | — | Compiled OCR binary |
| `ufit_motion.db` | — | SQLite DB committed to repo |
| `requirements.txt` | 3 lines | Flask, gunicorn, psycopg (range-pinned) |

### Codex Build Prompt (PDF) — Features Already Implemented

1. **Role-Based Access Control** — admin and coach portals, session-based auth
2. **School Filter System** — admin dashboard filters by school via `?school_id=` query param
3. **Coach Performance Score** — deterministic formula: `(avg_engagement/5)*50 + (eod_completion_rate)*50`
4. **Incident Alert System** — coach submits incident → `alerts` table → red banner in admin dashboard with dismiss

---

## 3. Architecture Classification

Per `ai-system-design.md` Section 8 — **AI-Augmented Architecture** (not AI-native).

The core logic is deterministic throughout:
- Performance scoring = pure math formula
- Role-based access = explicit permission checks
- School filtering = SQL WHERE clause
- Alert system = DB row insert + query

The single AI component is the **Swift Vision OCR** for score sheet photo parsing. It is correctly isolated — the rest of the system does not depend on it (manual entry is always available as fallback).

This classification matters: we keep deterministic code deterministic. No LLM is introduced for tasks that can be expressed as rules.

---

## 4. Target Architecture

### Deployment Stack

```
GitHub (main branch)
    ↓ push
Railway (auto-deploy)
    ├── Flask app (gunicorn, 1 dyno)
    ├── Reads: DATABASE_URL (Supabase Postgres)
    ├── Reads: UFIT_SECRET_KEY
    └── /health endpoint → Railway uptime checks

Supabase
    └── Postgres database
        └── Migrations applied from migrations/ directory
```

### Backend — Flask App Factory + Blueprints

Split `server.py` into focused modules:

```
app/
├── __init__.py       # create_app() factory
├── config.py         # DevelopmentConfig / ProductionConfig
│                     # ProductionConfig raises ValueError if SECRET_KEY missing
├── database.py       # DB abstraction layer (SQLite ↔ Postgres, one place)
├── auth.py           # login_required, role_required decorators
├── logging.py        # Structured request logging
├── seeds.py          # All seed data (schools, grades, skills, users)
├── scoring.py        # Pure deterministic scoring function
│
├── routes/
│   ├── __init__.py
│   ├── auth.py       # /login, /logout, /verify-email
│   ├── admin.py      # Dashboard, school filter, alerts, reports
│   ├── coach.py      # EOD, incidents, PE sessions, capture
│   ├── api.py        # JSON data endpoints (refresh, score, export)
│   └── health.py     # GET /health → 200 OK for Railway
│
└── ocr/
    ├── __init__.py
    └── vision.py     # OCR wrapper: calls Swift binary, structured logging
```

**Why app factory (`create_app()`):** Enables test isolation — each test gets a fresh app instance with a test config. Without this, tests share global state and interfere with each other.

**Why blueprints:** Each blueprint handles one domain. A bug in admin routes does not require reading coach routes. A new developer can understand the admin surface in 200 lines instead of navigating a 3,600-line file.

**Why `database.py` abstraction:** Routes never call `sqlite3` or `psycopg` directly. All DB calls go through `database.py`. When switching from SQLite (local dev) to Postgres (Railway), only one file changes.

**Why `scoring.py` isolated:** The performance formula is a pure function — `performance_score(avg_engagement, eod_count, expected=20) -> float`. Pure functions are trivially testable. Isolating it means the formula can be tested without a running database or Flask app.

### Frontend — ES Module Split

Split `app.js` into focused modules:

```
static/js/
├── main.js           # Entry point, state init, view router
├── api.js            # All fetch() calls centralized here
├── auth.js           # Login/logout/verify UI
├── admin/
│   ├── dashboard.js  # Overview stats, alert banners, school filter
│   ├── reports.js    # Performance table, EOD report review
│   └── incidents.js  # Incident center, admin replies, follow-up
└── coach/
    ├── capture.js    # PE session entry, OCR photo upload, skill scores
    ├── activity.js   # EOD report submission, score impact card
    └── incidents.js  # Coach incident submission form
```

**Why vanilla JS (not React):** All 4 Codex features are implemented and working. A React rewrite would take 2–3 weeks with no user-facing change. ES modules give us the same organizational benefits (named imports, isolated scope) with zero build tooling.

**Why `api.js` centralized:** Every `fetch()` call in one file means one place to add auth headers, handle 401 redirects, and log API errors. Currently these are scattered throughout the monolith.

### Migrations — Versioned SQL

```
migrations/
├── 001_initial_schema.sql    # All tables: schools, grades, skills, users,
│                             # pe_sessions, session_results, eod_reports,
│                             # incidents, alerts, comments
├── 002_add_email_settings.sql
└── README.md                 # How to apply against Supabase
```

**Why this matters (from `meta-workflow.md` Phase 5, Rule 1):** The current app runs `CREATE TABLE IF NOT EXISTS` in Python on startup. This is not versioned, not reversible, and will silently fail on Postgres when schema changes. Numbered SQL migration files are immutable once committed — you never edit them, only add new ones.

### Deployment Config

```
Procfile        → web: gunicorn "app:create_app()"
runtime.txt     → python-3.11.9
railway.toml    → build command, healthcheck path, restart policy
.env.example    → UFIT_SECRET_KEY, DATABASE_URL, UFIT_APP_BASE_URL
.gitignore      → .env, *.db, __pycache__, .DS_Store, Ufit Motion.app/
```

### CI — GitHub Actions

```
.github/workflows/ci.yml
```

On every push to `main`:
1. Install dependencies
2. Run `pytest tests/` with SQLite (no external DB needed for unit tests)
3. If tests pass → Railway auto-deploys

---

## 5. What the KB Changed vs. Initial Draft

| KB Source | Principle | Applied |
|---|---|---|
| `meta-workflow.md` Phase 5 Rule 1 | Migrations immutable + versioned | `migrations/` directory with numbered SQL files |
| `meta-workflow.md` Phase 5 Rule 5 | Dependencies pinned exactly | `requirements.txt` uses `==` only |
| `meta-workflow.md` Phase 5 Rule 4 | Infrastructure as code | GitHub Actions CI + Railway config files |
| `ai-system-design.md` Section 8 | AI-augmented over AI-native | Scoring stays deterministic; OCR stays isolated |
| `ai-system-design.md` 12-Factor #11 | Observability first-class | `logging.py` — structured logs per request + OCR call |
| `ai-system-design.md` Anti-pattern 8 | Security not an afterthought | `ProductionConfig` raises on missing `SECRET_KEY` |
| `specification-clarity.md` | Bounded scope | Out-of-scope list below |

---

## 6. Out of Scope

The following are explicitly NOT part of this restructure:

- No new features beyond the 4 from the Codex Build Prompt
- No React or frontend framework migration
- No auth overhaul (session-based auth stays)
- No email notification system (already optional in the spec)
- No mobile packaging (noted as future work in WRITTEN_EXPLANATION.md)
- No multi-tenancy or district-level supervisor dashboards
- No bulk CSV import

---

## 7. Acceptance Criteria

```
Feature: App starts in production

Given: Railway environment with UFIT_SECRET_KEY + DATABASE_URL set
When: Deployment completes
Then: GET /health returns 200 within 10 seconds

---

Feature: App refuses to start without secrets

Given: UFIT_SECRET_KEY is not set and APP_ENV=production
When: gunicorn starts
Then: App raises ValueError and exits (no silent fallback to weak key)

---

Feature: School filter

Given: Admin is logged in
When: GET /api/dashboard?school_id=2
Then: Response contains only EOD reports, incidents, and engagement data
      for school with id=2

---

Feature: Incident alert flow

Given: Coach submits an incident report
When: Admin loads dashboard
Then: A red alert banner appears with coach name, school, title, timestamp
      AND is_read=0 in the alerts table

---

Feature: Scoring formula correctness

Given: avg_engagement=4.0, eod_count=18, expected=20
When: performance_score(4.0, 18, 20) is called
Then: Returns 85.0 (=(4.0/5)*50 + (18/20)*50, rounded to 1 decimal)

---

Feature: Role enforcement

Given: A coach session
When: GET /api/admin/dashboard is requested
Then: Response is 403 Forbidden

Given: An admin session
When: GET /api/coach/submit-eod is requested (POST)
Then: Response is 403 Forbidden
```

---

## 8. Success Metrics

- App deploys to Railway on `git push origin main` with zero manual steps
- All 4 Codex features pass acceptance criteria on Railway + Supabase
- `pytest tests/` passes locally and in CI
- No secrets hardcoded anywhere in the codebase
- `ufit_motion.db` not present in the new repo

---

## 9. Files to Archive (Not Carry Forward)

The following files from the source package are not included in the new project:

- `Ufit Motion.app/` — macOS app bundle (local demo artifact)
- `build_macos_app.command` — macOS packaging script
- `export_app.command` — zip packaging script
- `share_app.command` — demo sharing script
- `launch_live.command` — local network demo script
- `start_app.command` — local launcher
- `ufit_motion.db` — SQLite DB (never committed to new repo)
- `SHARE_GUIDE.md` — demo sharing guide (superseded by DEPLOYMENT.md)

---

## 10. Next Step

Invoke `writing-plans` skill to generate the implementation plan.

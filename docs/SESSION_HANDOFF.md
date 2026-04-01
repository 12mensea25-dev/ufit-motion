# UfitMotion — Session Handoff

## What Was Built
UfitMotion is a staff-facing PE operations app for a school district. Flask + vanilla JS + Postgres.

**4 core features (all working):**
1. Role-Based Access Control — admin and coach portals, session-based auth
2. School Filter System — admin filters all data by school via `?school_id=`
3. Coach Performance Score — `(avg_engagement/5)*50 + (eod_completion_rate)*50`
4. Incident Alert System — coach submits incident → red banner in admin dashboard

---

## Live Deployment

| Resource | Value |
|---|---|
| Live URL | https://web-production-ab8fd4.up.railway.app |
| GitHub repo | https://github.com/12mensea25-dev/ufit-motion |
| Railway project | https://railway.com/project/8d379da7-fa7e-4244-9220-bc788abb2bcd |
| Supabase DB | db.dmtrcxyvycgnjwcphmhe.supabase.co |
| Database password | f11Wn95E7ALQiKYd |

**Login credentials (defaults — should be changed):**
- Admin: `admin` / `admin123`
- Coach: `coach1` / `coach123` (Lincoln Elementary)
- Coach: `coach2` / `coach123` (Maple Grove Elementary)
- Coach: `coach3` / `coach123` (Summit Hills Academy)
- Coach: `coach4` / `coach123` (Lincoln Elementary)

**Railway env vars already set:**
- `UFIT_SECRET_KEY` = `2dd6a7f37cd0e3f9001e0b1498452785f9af0ee6d192d1623fcad0c4351c7727`
- `APP_ENV` = `production`

**⚠️ CRITICAL — NOT YET SET:**
- `DATABASE_URL` = `postgresql://postgres:f11Wn95E7ALQiKYd@db.dmtrcxyvycgnjwcphmhe.supabase.co:5432/postgres`

This env var must be added in the Railway dashboard (Service → Variables tab) or all coach data
is saved to ephemeral SQLite and wiped on every deploy. Until it is set, the app runs on SQLite.

---

## Project Structure

```
ufit-motion/
├── app/
│   ├── __init__.py       # create_app() factory
│   ├── config.py         # Dev/Prod config, raises on missing SECRET_KEY
│   ├── database.py       # SQLite + Postgres abstraction (get_db())
│   ├── auth.py           # login_required, roles_required, local_or_admin_required
│   ├── scoring.py        # Pure scoring function (no DB dependency)
│   ├── seeds.py          # Schema creation + seed data
│   ├── logging.py        # Structured per-request JSON logging
│   └── routes/
│       ├── pages.py          # HTML page routes
│       ├── auth_routes.py    # /api/login, /api/logout, /api/register
│       ├── shared_routes.py  # /api/health, /api/bootstrap, /api/session
│       ├── admin_routes.py   # /api/schools, /api/grades, /api/skills, /api/users
│       ├── coach_routes.py   # /api/sessions, /api/eod-reports, /api/incidents
│       └── _helpers.py       # bootstrap_payload(), fetch_*, serialize_* helpers
├── migrations/
│   └── 001_initial_schema.sql
├── static/
│   ├── app.js            # Full SPA frontend (vanilla JS, 4272 lines)
│   ├── styles.css
│   ├── score-sheet.html  # Printable PE class score sheet (at /static/score-sheet.html)
│   └── ...
├── templates/index.html
├── tests/
│   ├── conftest.py       # app/client/admin_client/coach_client fixtures
│   ├── test_scoring.py   # 5 tests
│   ├── test_auth.py      # 4 tests
│   ├── test_health.py    # 5 tests
│   └── test_validation.py # 4 tests
├── Procfile              # web: gunicorn "app:create_app()"
├── requirements.txt      # pinned deps
└── .github/workflows/ci.yml  # pytest on every push
```

---

## Test Suite

18 tests, all passing. Run with:
```bash
python3 -m pytest tests/ -v
```

---

## What Was Fixed This Session

1. **Skill score inputs wiped on 15-second refresh** — `renderSkillInputs()` was rebuilding
   `innerHTML` on every background poll, destroying typed values. Fixed in `static/app.js`:
   now saves/restores input values around the DOM rebuild.

2. **Bootstrap 500 on live app** — Was a transient crash during Railway deployment restarts
   (~30 second window where the app is restarting after a new push). Not a code bug.
   Added/removed traceback capture during debugging; final code is clean.

3. **DATABASE_URL not set** — Root cause of all data persistence issues. Confirmed via
   `/api/debug-db` probe (now removed). App runs on SQLite when DATABASE_URL is missing;
   SQLite lives on Railway's ephemeral container filesystem and is wiped on every deploy.

4. **Score sheet** — Added printable HTML score sheet at `static/score-sheet.html`.
   Accessible at `/static/score-sheet.html` on the live URL.

---

## Known Issues / To Fix Next

1. **⚠️ Set DATABASE_URL in Railway** — #1 priority. Without it all data is lost on deploy.
   Go to Railway project → Service → Variables → add `DATABASE_URL` with the Supabase URL above.

2. **Change default passwords** — `admin123` and `coach123` are live on a public URL

3. **Email alerts** — incident alert shows in dashboard but email delivery not configured
   (SMTP settings panel exists in admin but not wired to send)

4. **Bootstrap performance** — loads all data at once; needs pagination at scale

5. **OCR on Railway** — Swift binary (`scripts/vision_ocr`) won't run on Railway's Linux
   container; needs a cloud OCR alternative (e.g. Google Vision API)

6. **Add password change flow** for coaches/admins

---

## UFIT Build Phase Assignment

Assignment was submitted to UFIT (University of Fitness Information and Technology).
Submission document saved at: `/Users/jahleel/Downloads/UFIT_Submission.html`

**Still needed:**
- Loom walkthrough video (required by UFIT, not yet recorded)

Walkthrough should cover:
1. Admin portal login
2. Coach portal login
3. Coach submitting EOD report
4. Coach submitting incident
5. Admin seeing red alert banner
6. Admin filtering by school
7. Coach performance scores table

---

## How to Run Locally

```bash
cd /Users/jahleel/ufit-motion
export UFIT_SECRET_KEY="dev-secret"
export APP_ENV="development"
/Users/jahleel/Library/Python/3.9/bin/gunicorn "app:create_app()" --bind 127.0.0.1:5000 --reload
```

Open: http://127.0.0.1:5000

---

## Next Steps (Prioritized)

1. Set DATABASE_URL in Railway (see above — critical)
2. Change default passwords on live app
3. Record Loom walkthrough and submit to UFIT
4. Wire email alerts for incidents (SMTP already has a settings panel)
5. Add password change flow for coaches/admins
6. Pagination on bootstrap endpoint
7. Mobile-responsive layout improvements
8. Coach-to-admin messaging on incidents
9. Weekly performance digest emails to admins

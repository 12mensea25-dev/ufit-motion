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
- `DATABASE_URL` = `postgresql://postgres:f11Wn95E7ALQiKYd@db.dmtrcxyvycgnjwcphmhe.supabase.co:5432/postgres`
- `APP_ENV` = `production`

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

## What Was Improved (Beyond Original Codex Build)

1. **`performanceRows` key fix** — bootstrap now returns correct key for JS dashboard
2. **School filter security** — coaches cannot use `?school_id=` to see other schools' data
3. **Structured request logging** — `app/logging.py` logs every request as JSON
4. **Input validation** — engagement rating enforced 1–5, dates must be YYYY-MM-DD

---

## Known Issues / To Fix Next

1. **Change default passwords** — `admin123` and `coach123` are live on a public URL
2. **Email alerts** — incident alert shows in dashboard but email delivery not configured (SMTP settings panel exists in admin but not wired to send)
3. **Bootstrap performance** — loads all data at once; needs pagination at scale
4. **OCR on Railway** — Swift binary (`scripts/vision_ocr`) won't run on Railway's Linux container; needs a cloud OCR alternative (e.g. Google Vision API) for production score sheet import

---

## UFIT Build Phase Assignment

Assignment was submitted to UFIT (University of Fitness Information and Technology).
Submission document saved at: `/Users/jahleel/Downloads/UFIT_Submission.html`

**Still needed:**
- Loom walkthrough video (required by UFIT, not yet recorded)
- Email to: admin@ufitmotion.local (or wherever UFIT says to submit)

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

1. Change default passwords on live app
2. Record Loom walkthrough and submit to UFIT
3. Wire email alerts for incidents (SMTP already has a settings panel)
4. Add password change flow for coaches/admins
5. Pagination on bootstrap endpoint
6. Mobile-responsive layout improvements
7. Coach-to-admin messaging on incidents
8. Weekly performance digest emails to admins

# UfitMotion Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the UfitMotion monolith into a production-ready Flask app with blueprints, versioned migrations, and Railway + Supabase deployment config.

**Architecture:** Flask app factory (`create_app()`) with blueprints per domain, a single `database.py` abstraction for SQLite/Postgres, versioned SQL migrations, and vanilla JS frontend copied as-is then split into ES modules. Deployed to Railway (app) + Supabase (Postgres).

**Tech Stack:** Python 3.11, Flask 3.1.3, gunicorn 23.0.0, psycopg 3.2.x, pytest, Railway, Supabase Postgres, vanilla JS ES modules.

**Source:** All logic lives in `/Users/jahleel/Downloads/UfitMotion-app-package (1)/server.py` (3,618 lines) and `static/app.js` (4,272 lines). Do NOT rewrite logic — extract and reorganize.

---

## File Map

```
ufit-motion/
├── .env.example
├── .gitignore
├── Procfile
├── runtime.txt
├── railway.toml
├── requirements.txt
├── wsgi.py
├── .github/workflows/ci.yml
├── app/
│   ├── __init__.py          ← create_app() factory
│   ├── config.py            ← Dev/Prod config classes
│   ├── database.py          ← get_db() abstraction (SQLite + Postgres)
│   ├── auth.py              ← current_user(), login_required, roles_required
│   ├── scoring.py           ← calculate_performance_breakdown() pure function
│   ├── seeds.py             ← all seed data constants + seed_database()
│   └── routes/
│       ├── __init__.py
│       ├── pages.py         ← HTML page routes (/, /login, /admin/dashboard, etc.)
│       ├── auth_routes.py   ← /api/login, /api/logout, /api/register, /api/session
│       ├── admin_routes.py  ← /api/schools, /api/grades, /api/skills, /api/users, /api/email-settings
│       ├── coach_routes.py  ← /api/sessions, /api/eod-reports, /api/incidents, /api/comments
│       └── shared_routes.py ← /api/health, /api/bootstrap, /api/public-options, /api/alerts/dismiss
├── migrations/
│   ├── 001_initial_schema.sql
│   └── README.md
├── static/
│   ├── js/app.js            ← copied as-is from source (working baseline)
│   ├── styles.css           ← copied from source
│   ├── manifest.webmanifest ← copied from source
│   └── service-worker.js    ← copied from source
├── templates/
│   └── index.html           ← copied from source (no changes needed yet)
├── scripts/
│   ├── vision_ocr           ← copied binary
│   └── vision_ocr.swift     ← copied source
├── tests/
│   ├── conftest.py
│   ├── test_scoring.py
│   ├── test_auth.py
│   └── test_health.py
└── docs/
    ├── DEPLOYMENT.md
    ├── WRITTEN_EXPLANATION.md  ← copied from source
    └── LOOM_WALKTHROUGH.md     ← copied from source
```

---

## Task 1: Project Scaffold + Copy Static Assets

**Files:**
- Create: All top-level config files
- Create: `static/` directory with source assets copied in

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/jahleel/ufit-motion
mkdir -p app/routes migrations static/js templates scripts tests docs .github/workflows
```

- [ ] **Step 2: Copy static assets from source**

```bash
SRC="/Users/jahleel/Downloads/UfitMotion-app-package (1)"
cp "$SRC/static/app.js"              static/js/app.js
cp "$SRC/static/styles.css"          static/styles.css
cp "$SRC/static/manifest.webmanifest" static/manifest.webmanifest
cp "$SRC/static/service-worker.js"   static/service-worker.js
cp "$SRC/static/icon.svg"            static/icon.svg
cp "$SRC/templates/index.html"       templates/index.html
cp "$SRC/scripts/vision_ocr.swift"   scripts/vision_ocr.swift
cp "$SRC/scripts/vision_ocr"         scripts/vision_ocr
cp "$SRC/WRITTEN_EXPLANATION.md"     docs/WRITTEN_EXPLANATION.md
cp "$SRC/LOOM_WALKTHROUGH.md"        docs/LOOM_WALKTHROUGH.md
chmod +x scripts/vision_ocr
```

- [ ] **Step 3: Create `.gitignore`**

```
.env
*.db
*.db-journal
__pycache__/
*.pyc
*.pyo
.DS_Store
.venv/
venv/
dist/
*.egg-info/
"Ufit Motion.app"/
*.command
```

Write to: `.gitignore`

- [ ] **Step 4: Create `requirements.txt` with exact pins**

```
Flask==3.1.3
gunicorn==23.0.0
psycopg[binary]==3.2.6
pytest==8.3.5
```

Write to: `requirements.txt`

- [ ] **Step 5: Create `runtime.txt`**

```
python-3.11.9
```

Write to: `runtime.txt`

- [ ] **Step 6: Create `.env.example`**

```
# Required in production — app will refuse to start without these
UFIT_SECRET_KEY=change-me-to-a-random-64-char-string

# Optional — leave blank to use local SQLite
DATABASE_URL=

# Optional — base URL for email verification links
UFIT_APP_BASE_URL=

# Set to "production" on Railway
APP_ENV=development
```

Write to: `.env.example`

- [ ] **Step 7: Create `Procfile`**

```
web: gunicorn "app:create_app()"
```

Write to: `Procfile`

- [ ] **Step 8: Create `railway.toml`**

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "gunicorn \"app:create_app()\""
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

Write to: `railway.toml`

- [ ] **Step 9: Create `wsgi.py`**

```python
from app import create_app

app = create_app()
```

Write to: `wsgi.py`

- [ ] **Step 10: Create empty `__init__.py` files**

```bash
touch app/__init__.py app/routes/__init__.py tests/__init__.py
```

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: scaffold project structure, copy static assets, add deploy config"
```

---

## Task 2: Config

**Files:**
- Create: `app/config.py`

- [ ] **Step 1: Write `app/config.py`**

```python
import os


class Config:
    JSON_SORT_KEYS = False
    EXPECTED_EOD_SUBMISSIONS = 20

    @property
    def SECRET_KEY(self):
        return os.environ.get("UFIT_SECRET_KEY", "ufit-motion-local-secret")

    @property
    def DATABASE_URL(self):
        return (
            os.environ.get("DATABASE_URL", "").strip()
            or os.environ.get("SUPABASE_DB_URL", "").strip()
            or os.environ.get("UFIT_SUPABASE_DB_URL", "").strip()
        )

    @property
    def DB_PATH(self):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.environ.get("UFIT_DB_PATH", os.path.join(base, "ufit_motion.db"))

    @property
    def OCR_SCRIPT_PATH(self):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base, "scripts", "vision_ocr.swift")

    @property
    def OCR_BINARY_PATH(self):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base, "scripts", "vision_ocr")

    @property
    def APP_BASE_URL(self):
        return os.environ.get("UFIT_APP_BASE_URL", "").strip()


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False

    @property
    def SECRET_KEY(self):
        key = os.environ.get("UFIT_SECRET_KEY", "").strip()
        if not key:
            raise ValueError(
                "UFIT_SECRET_KEY environment variable is required in production. "
                "Set it to a strong random string (64+ chars)."
            )
        return key


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config():
    env = os.environ.get("APP_ENV", "development").lower()
    return config_map.get(env, DevelopmentConfig)()
```

- [ ] **Step 2: Verify no syntax errors**

```bash
cd /Users/jahleel/ufit-motion
python3 -c "from app.config import get_config, ProductionConfig; print('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add app/config.py
git commit -m "feat: add config classes with production secret key guard"
```

---

## Task 3: Database Abstraction

**Files:**
- Create: `app/database.py`
- Source reference: `server.py` lines 598–684 (`get_db`, `PostgresConnection`, `QueryResult`, `ensure_column`)

- [ ] **Step 1: Write `app/database.py`**

```python
import os
import re
import sqlite3

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None

POSTGRES_ID_TABLES = {
    "schools", "grades", "skills", "users", "pe_sessions",
    "session_results", "eod_reports", "comments", "incidents", "alerts",
}


class QueryResult:
    def __init__(self, rows=None, lastrowid=None):
        self._rows = rows or []
        self.lastrowid = lastrowid

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


class PostgresConnection:
    def __init__(self, dsn):
        self.backend = "postgres"
        self._connection = psycopg.connect(dsn, row_factory=dict_row)

    def execute(self, query, params=None):
        params = () if params is None else params
        sql = self._convert_placeholders(query)
        normalized = query.lstrip().lower()
        insert_table = self._insert_table_name(normalized)
        should_return_id = (
            insert_table in POSTGRES_ID_TABLES
            and "returning" not in normalized
        )
        if should_return_id:
            sql += " RETURNING id"
        with self._connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall() if cursor.description else []
        lastrowid = rows[0]["id"] if should_return_id and rows else None
        return QueryResult(rows=rows, lastrowid=lastrowid)

    def executescript(self, script):
        for statement in script.split(";"):
            stmt = statement.strip()
            if stmt:
                self.execute(stmt)

    def commit(self):
        self._connection.commit()

    def rollback(self):
        self._connection.rollback()

    def close(self):
        self._connection.close()

    def _convert_placeholders(self, query):
        return query.replace("?", "%s")

    def _insert_table_name(self, normalized_query):
        match = re.match(r"insert\s+into\s+([a-z_][a-z0-9_]*)", normalized_query)
        return match.group(1) if match else None


def get_db(config=None):
    """Return a database connection. Caller must call .close() when done."""
    from flask import current_app
    cfg = config or current_app.config["UFIT_CONFIG"]

    if cfg.DATABASE_URL:
        if psycopg is None:
            raise RuntimeError(
                "Postgres support requires psycopg. Run: pip install -r requirements.txt"
            )
        return PostgresConnection(cfg.DATABASE_URL)

    connection = sqlite3.connect(cfg.DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_column(connection, table_name, column_name, column_definition):
    from flask import current_app
    cfg = current_app.config["UFIT_CONFIG"]
    if cfg.DATABASE_URL:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS "
            f"{column_name} {column_definition}"
        )
        return
    columns = [
        row["name"]
        for row in connection.execute(
            f"PRAGMA table_info({table_name})"
        ).fetchall()
    ]
    if column_name not in columns:
        connection.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )
```

- [ ] **Step 2: Write failing test**

```python
# tests/test_database.py
import pytest
from app import create_app


def test_get_db_returns_sqlite_connection(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH_OVERRIDE": str(tmp_path / "test.db")})
    with app.app_context():
        from app.database import get_db
        conn = get_db()
        try:
            result = conn.execute("SELECT 1 AS val").fetchone()
            assert result["val"] == 1
        finally:
            conn.close()
```

Write to: `tests/test_database.py`

- [ ] **Step 3: Commit**

```bash
git add app/database.py tests/test_database.py
git commit -m "feat: add database abstraction layer (SQLite/Postgres)"
```

---

## Task 4: Auth Decorators

**Files:**
- Create: `app/auth.py`
- Source reference: `server.py` lines 1793–1856

- [ ] **Step 1: Write `app/auth.py`**

```python
from functools import wraps
from flask import jsonify, session


def current_user(connection=None):
    """Return the logged-in user dict, or None if not authenticated."""
    from app.database import get_db

    user_id = session.get("user_id")
    if not user_id:
        return None

    owns_connection = connection is None
    if owns_connection:
        connection = get_db()

    try:
        user = connection.execute(
            """
            SELECT users.id, users.role, users.name, users.email,
                   users.username, users.school_id, users.email_verified,
                   schools.name AS school_name
            FROM users
            LEFT JOIN schools ON schools.id = users.school_id
            WHERE users.id = ?
            """,
            (user_id,),
        ).fetchone()
        if user is not None and user["role"] not in ("admin", "coach"):
            session.pop("user_id", None)
            return None
        return user
    finally:
        if owns_connection:
            connection.close()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = current_user()
        if user is None:
            return jsonify({"error": "Please sign in first."}), 401
        return view(*args, **kwargs)
    return wrapped


def roles_required(*allowed_roles):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if user is None:
                return jsonify({"error": "Please sign in first."}), 401
            if user["role"] not in allowed_roles:
                return jsonify({"error": "You do not have permission for that action."}), 403
            return view(*args, **kwargs)
        return wrapped
    return decorator


def local_or_admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        from flask import request
        user = current_user()
        if user is not None and user["role"] == "admin":
            return view(*args, **kwargs)
        remote_addr = str(request.remote_addr or "")
        if remote_addr in ("127.0.0.1", "::1") or remote_addr.startswith("::ffff:127.0.0.1"):
            return view(*args, **kwargs)
        return jsonify({
            "error": "Email settings can only be changed locally or by an admin."
        }), 403
    return wrapped
```

- [ ] **Step 2: Write tests**

```python
# tests/test_auth.py
import pytest
from app import create_app


@pytest.fixture
def client(tmp_path):
    app = create_app({"TESTING": True, "DB_PATH_OVERRIDE": str(tmp_path / "test.db")})
    with app.test_client() as client:
        with app.app_context():
            from app.database import get_db
            from app.seeds import init_db
            init_db()
        yield client


def test_login_required_returns_401_when_not_logged_in(client):
    response = client.get("/api/bootstrap")
    assert response.status_code == 401


def test_admin_blocked_from_coach_route(client):
    # log in as admin
    client.post("/api/login", json={
        "audience": "admin",
        "identifier": "admin",
        "password": "admin123",
    })
    response = client.post("/api/sessions", json={})
    assert response.status_code == 403


def test_coach_blocked_from_admin_route(client):
    client.post("/api/login", json={
        "audience": "coach",
        "identifier": "coach1",
        "password": "coach123",
    })
    response = client.post("/api/schools", json={"name": "X", "district": "Y"})
    assert response.status_code == 403
```

Write to: `tests/test_auth.py`

- [ ] **Step 3: Commit**

```bash
git add app/auth.py tests/test_auth.py
git commit -m "feat: add auth decorators (login_required, roles_required)"
```

---

## Task 5: Scoring — Pure Function

**Files:**
- Create: `app/scoring.py`
- Source reference: `server.py` lines 2209–2250 (`calculate_performance_breakdown`)

- [ ] **Step 1: Write failing tests first**

```python
# tests/test_scoring.py
from app.scoring import calculate_performance_breakdown


def test_perfect_score():
    sessions = [{"engagement_rating": 5.0, "session_date": "2026-03-01"}] * 5
    eod_reports = [{"report_date": "2026-03-01"}] * 20
    result = calculate_performance_breakdown(sessions, eod_reports)
    assert result["performanceScore"] == 100.0


def test_formula_example_from_spec():
    # avg_engagement=4.0, eod_count=18, expected=20
    # score = (4.0/5)*50 + (18/20)*50 = 40 + 45 = 85.0
    sessions = [{"engagement_rating": 4.0, "session_date": "2026-03-15"}] * 3
    eod_reports = [{"report_date": "2026-03-15"}] * 18
    result = calculate_performance_breakdown(sessions, eod_reports)
    assert result["performanceScore"] == 85.0
    assert result["averageEngagement"] == 4.0
    assert result["recentEodCount"] == 18


def test_zero_sessions_gives_zero_engagement_points():
    result = calculate_performance_breakdown([], [])
    assert result["performanceScore"] == 0.0
    assert result["averageEngagement"] is None


def test_eod_completion_capped_at_100_percent():
    sessions = [{"engagement_rating": 3.0, "session_date": "2026-03-15"}]
    # 30 reports > 20 expected — should cap at 1.0
    eod_reports = [{"report_date": "2026-03-15"}] * 30
    result = calculate_performance_breakdown(sessions, eod_reports)
    assert result["completionRate"] == 1.0
    assert result["completionPoints"] == 50.0


def test_only_last_30_days_count_for_eod():
    sessions = [{"engagement_rating": 4.0, "session_date": "2026-03-15"}]
    # 10 old reports (>30 days ago) + 10 recent
    old_reports = [{"report_date": "2025-12-01"}] * 10
    recent_reports = [{"report_date": "2026-03-15"}] * 10
    result = calculate_performance_breakdown(sessions, old_reports + recent_reports)
    assert result["recentEodCount"] == 10
```

Write to: `tests/test_scoring.py`

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd /Users/jahleel/ufit-motion
python3 -m pytest tests/test_scoring.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'app.scoring'`

- [ ] **Step 3: Write `app/scoring.py`**

```python
from datetime import datetime, timedelta, timezone

EXPECTED_EOD_SUBMISSIONS = 20


def calculate_performance_breakdown(session_rows, eod_report_rows, expected=EXPECTED_EOD_SUBMISSIONS):
    """
    Pure function. Returns a performance breakdown dict for one coach.

    session_rows: list of dicts with keys: engagement_rating, session_date
    eod_report_rows: list of dicts with keys: report_date
    expected: int, expected EOD submissions in 30 days (default 20)
    """
    thirty_days_ago = (
        datetime.now(timezone.utc).date() - timedelta(days=30)
    ).isoformat()

    engagement_scores = [
        float(row["engagement_rating"])
        for row in session_rows
        if row.get("engagement_rating") is not None
    ]
    average_engagement = (
        round(sum(engagement_scores) / len(engagement_scores), 2)
        if engagement_scores else None
    )

    completion_count = sum(
        1 for row in eod_report_rows
        if str(row.get("report_date") or "") >= thirty_days_ago
    )
    completion_rate = min(completion_count / expected, 1.0)

    engagement_points = round(((average_engagement or 0.0) / 5.0) * 50.0, 1)
    completion_points = round(completion_rate * 50.0, 1)
    performance_score = round(engagement_points + completion_points, 1)

    last_session_date = max(
        (str(row["session_date"] or "") for row in session_rows if row.get("session_date")),
        default="",
    )
    last_report_date = max(
        (str(row["report_date"] or "") for row in eod_report_rows if row.get("report_date")),
        default="",
    )

    return {
        "averageEngagement": average_engagement,
        "completionRate": round(completion_rate, 3),
        "completionPercent": round(completion_rate * 100.0, 1),
        "recentEodCount": completion_count,
        "recentReportCount": completion_count,
        "expectedSubmissions": expected,
        "engagementPoints": engagement_points,
        "completionPoints": completion_points,
        "performanceScore": performance_score,
        "lastSessionDate": last_session_date or None,
        "lastEodReportDate": last_report_date or None,
        "totalSessions": len(session_rows),
        "totalEodReports": len(eod_report_rows),
    }
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
python3 -m pytest tests/test_scoring.py -v
```

Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add app/scoring.py tests/test_scoring.py
git commit -m "feat: add scoring pure function with tests (TDD)"
```

---

## Task 6: Seeds

**Files:**
- Create: `app/seeds.py`
- Source reference: `server.py` lines 56–208 (seed constants), lines 1084–1384 (`init_db`, `seed_database`), lines 1533–1578 (`ensure_seed_staff_accounts`)

- [ ] **Step 1: Write `app/seeds.py`**

Extract seed constants and `init_db()` from `server.py`. The full file:

```python
import re
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash

SEEDED_SCHOOLS = [
    {"name": "Lincoln Elementary", "district": "North County District"},
    {"name": "Maple Grove Elementary", "district": "North County District"},
    {"name": "Summit Hills Academy", "district": "North County District"},
]

SEEDED_GRADES = [
    {"name": "1st Grade", "display_order": 1},
    {"name": "2nd Grade", "display_order": 2},
    {"name": "3rd Grade", "display_order": 3},
    {"name": "4th Grade", "display_order": 4},
    {"name": "5th Grade", "display_order": 5},
    {"name": "6th Grade", "display_order": 6},
]

SEEDED_SKILLS = [
    {"name": "10-Yard Sprint", "abbreviation": "10Y", "unit": "seconds", "better_direction": "lower"},
    {"name": "20-Yard Sprint", "abbreviation": "20Y", "unit": "seconds", "better_direction": "lower"},
    {"name": "30-Yard Sprint", "abbreviation": "30Y", "unit": "seconds", "better_direction": "lower"},
    {"name": "Vertical Jump",   "abbreviation": "VJ",  "unit": "inches",  "better_direction": "higher"},
    {"name": "Throw Accuracy",  "abbreviation": "TA",  "unit": "score",   "better_direction": "higher"},
    {"name": "L-Drill Agility", "abbreviation": "LD",  "unit": "seconds", "better_direction": "lower"},
    {"name": "5-10-5 Shuttle",  "abbreviation": "505", "unit": "seconds", "better_direction": "lower"},
]

SEEDED_USERS = [
    {"role": "admin",  "username": "admin",  "name": "Admin",       "email": "admin@ufitmotion.local",  "password": "admin123", "school_name": None},
    {"role": "coach",  "username": "coach1", "name": "Coach One",   "email": "coach1@ufitmotion.local", "password": "coach123", "school_name": "Lincoln Elementary"},
    {"role": "coach",  "username": "coach2", "name": "Coach Maya",  "email": "coach2@ufitmotion.local", "password": "coach123", "school_name": "Maple Grove Elementary"},
    {"role": "coach",  "username": "coach3", "name": "Coach Jordan","email": "coach3@ufitmotion.local", "password": "coach123", "school_name": "Summit Hills Academy"},
    {"role": "coach",  "username": "coach4", "name": "Coach Bri",   "email": "coach4@ufitmotion.local", "password": "coach123", "school_name": "Lincoln Elementary"},
]


def _now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def init_db():
    """Create schema and seed data. Safe to call on every startup."""
    from app.database import get_db, ensure_column
    connection = get_db()
    try:
        _create_schema(connection)
        _run_migrations(connection)
        school_count = connection.execute(
            "SELECT COUNT(*) AS count FROM schools"
        ).fetchone()["count"]
        if school_count == 0:
            _seed_data(connection)
        _ensure_seed_accounts(connection)
        _backfill_usernames(connection)
        connection.commit()
    finally:
        connection.close()


def _create_schema(connection):
    from flask import current_app
    cfg = current_app.config["UFIT_CONFIG"]
    if cfg.DATABASE_URL:
        statements = [
            "CREATE TABLE IF NOT EXISTS schools (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, district TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS grades (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, display_order INTEGER NOT NULL)",
            "CREATE TABLE IF NOT EXISTS skills (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, abbreviation TEXT, unit TEXT NOT NULL, better_direction TEXT NOT NULL)",
            """CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY, role TEXT NOT NULL, username TEXT,
                name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL, password_hint TEXT,
                school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
                grade_id BIGINT REFERENCES grades(id) ON DELETE CASCADE,
                email_verified INTEGER NOT NULL DEFAULT 1,
                email_verification_code TEXT, email_verification_sent_at TEXT,
                email_verification_expires_at TEXT, email_verified_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
            "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
            """CREATE TABLE IF NOT EXISTS pe_sessions (
                id BIGSERIAL PRIMARY KEY,
                school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                grade_id BIGINT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
                session_date TEXT NOT NULL, engagement_rating DOUBLE PRECISION,
                coach_note TEXT, created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
            """CREATE TABLE IF NOT EXISTS session_results (
                id BIGSERIAL PRIMARY KEY,
                session_id BIGINT NOT NULL REFERENCES pe_sessions(id) ON DELETE CASCADE,
                skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                score DOUBLE PRECISION NOT NULL)""",
            """CREATE TABLE IF NOT EXISTS eod_reports (
                id BIGSERIAL PRIMARY KEY,
                school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                report_date TEXT NOT NULL, classes_completed INTEGER NOT NULL DEFAULT 0,
                summary TEXT NOT NULL, celebrations TEXT NOT NULL,
                follow_up_needed TEXT NOT NULL, support_needed TEXT,
                created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
            """CREATE TABLE IF NOT EXISTS comments (
                id BIGSERIAL PRIMARY KEY,
                school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                grade_id BIGINT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
                comment_date TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
                home_focus TEXT NOT NULL,
                created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
            """CREATE TABLE IF NOT EXISTS incidents (
                id BIGSERIAL PRIMARY KEY,
                school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
                incident_date TEXT NOT NULL, title TEXT NOT NULL, details TEXT NOT NULL,
                admin_status TEXT NOT NULL DEFAULT 'new',
                admin_response TEXT, follow_up_note TEXT, follow_up_date TEXT,
                acknowledged_at TEXT,
                acknowledged_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
            """CREATE TABLE IF NOT EXISTS alerts (
                id BIGSERIAL PRIMARY KEY,
                incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_read INTEGER NOT NULL DEFAULT 0)""",
        ]
        for stmt in statements:
            connection.execute(stmt)
    else:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS schools (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE, district TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE, display_order INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE, abbreviation TEXT,
                unit TEXT NOT NULL, better_direction TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL, username TEXT, name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
                password_hint TEXT, school_id INTEGER, grade_id INTEGER,
                email_verified INTEGER NOT NULL DEFAULT 1,
                email_verification_code TEXT, email_verification_sent_at TEXT,
                email_verification_expires_at TEXT, email_verified_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE);
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS pe_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER NOT NULL, grade_id INTEGER NOT NULL,
                session_date TEXT NOT NULL, engagement_rating REAL,
                coach_note TEXT, created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL);
            CREATE TABLE IF NOT EXISTS session_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL, skill_id INTEGER NOT NULL,
                score REAL NOT NULL,
                FOREIGN KEY (session_id) REFERENCES pe_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE);
            CREATE TABLE IF NOT EXISTS eod_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER NOT NULL, report_date TEXT NOT NULL,
                classes_completed INTEGER NOT NULL DEFAULT 0,
                summary TEXT NOT NULL, celebrations TEXT NOT NULL,
                follow_up_needed TEXT NOT NULL, support_needed TEXT,
                created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL);
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER NOT NULL, grade_id INTEGER NOT NULL,
                comment_date TEXT NOT NULL, title TEXT NOT NULL,
                body TEXT NOT NULL, home_focus TEXT NOT NULL, created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL);
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER NOT NULL, incident_date TEXT NOT NULL,
                title TEXT NOT NULL, details TEXT NOT NULL,
                admin_status TEXT NOT NULL DEFAULT 'new',
                admin_response TEXT, follow_up_note TEXT, follow_up_date TEXT,
                acknowledged_at TEXT, acknowledged_by INTEGER,
                created_by INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
                FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE);
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_read INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE);
        """)


def _run_migrations(connection):
    from app.database import ensure_column
    ensure_column(connection, "skills", "abbreviation", "TEXT")
    ensure_column(connection, "users", "username", "TEXT")
    ensure_column(connection, "users", "email_verified", "INTEGER NOT NULL DEFAULT 1")
    ensure_column(connection, "users", "email_verification_code", "TEXT")
    ensure_column(connection, "users", "email_verification_sent_at", "TEXT")
    ensure_column(connection, "users", "email_verification_expires_at", "TEXT")
    ensure_column(connection, "users", "email_verified_at", "TEXT")
    ensure_column(connection, "pe_sessions", "engagement_rating", "REAL")
    ensure_column(connection, "incidents", "admin_status", "TEXT NOT NULL DEFAULT 'new'")
    ensure_column(connection, "incidents", "admin_response", "TEXT")
    ensure_column(connection, "incidents", "follow_up_note", "TEXT")
    ensure_column(connection, "incidents", "follow_up_date", "TEXT")
    ensure_column(connection, "incidents", "acknowledged_at", "TEXT")
    ensure_column(connection, "incidents", "acknowledged_by", "INTEGER")


def _seed_data(connection):
    school_ids = {}
    for school in SEEDED_SCHOOLS:
        r = connection.execute(
            "INSERT INTO schools (name, district) VALUES (?, ?)",
            (school["name"], school["district"]),
        )
        school_ids[school["name"]] = r.lastrowid

    for grade in SEEDED_GRADES:
        connection.execute(
            "INSERT INTO grades (name, display_order) VALUES (?, ?)",
            (grade["name"], grade["display_order"]),
        )

    for skill in SEEDED_SKILLS:
        connection.execute(
            "INSERT INTO skills (name, abbreviation, unit, better_direction) VALUES (?, ?, ?, ?)",
            (skill["name"], skill["abbreviation"], skill["unit"], skill["better_direction"]),
        )


def _ensure_seed_accounts(connection):
    for user in SEEDED_USERS:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = ?", (user["email"],)
        ).fetchone()
        if existing:
            continue
        school_id = None
        if user["school_name"]:
            school_row = connection.execute(
                "SELECT id FROM schools WHERE name = ?", (user["school_name"],)
            ).fetchone()
            school_id = school_row["id"] if school_row else None
        connection.execute(
            """INSERT INTO users (role, username, name, email, password_hash, school_id, email_verified)
               VALUES (?, ?, ?, ?, ?, ?, 1)""",
            (user["role"], user["username"], user["name"], user["email"],
             generate_password_hash(user["password"]), school_id),
        )


def _backfill_usernames(connection):
    rows = connection.execute(
        "SELECT id, name, email FROM users WHERE username IS NULL OR username = ''"
    ).fetchall()
    for row in rows:
        base = re.sub(r"[^a-z0-9]", "", (row["name"] or row["email"] or "user").lower())[:20] or "user"
        username = base
        i = 2
        while connection.execute(
            "SELECT id FROM users WHERE username = ? AND id != ?", (username, row["id"])
        ).fetchone():
            username = f"{base}{i}"
            i += 1
        connection.execute("UPDATE users SET username = ? WHERE id = ?", (username, row["id"]))
```

- [ ] **Step 2: Commit**

```bash
git add app/seeds.py
git commit -m "feat: add seeds module (schema creation + seed data)"
```

---

## Task 7: App Factory

**Files:**
- Create: `app/__init__.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Write `app/__init__.py`**

```python
import os
from flask import Flask
from app.config import get_config


def create_app(test_config=None):
    app = Flask(__name__, template_folder="../templates", static_folder="../static")

    cfg = get_config()
    app.config["UFIT_CONFIG"] = cfg
    app.config["SECRET_KEY"] = cfg.SECRET_KEY
    app.config["JSON_SORT_KEYS"] = False

    if test_config:
        # Allow tests to override DB path
        if "DB_PATH_OVERRIDE" in test_config:
            cfg.DB_PATH = test_config.pop("DB_PATH_OVERRIDE")
        app.config.update(test_config)
        # Patch config object back
        app.config["UFIT_CONFIG"] = cfg

    # Register blueprints
    from app.routes.pages import pages_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.shared_routes import shared_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.coach_routes import coach_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(shared_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(coach_bp)

    with app.app_context():
        from app.seeds import init_db
        init_db()

    return app
```

- [ ] **Step 2: Write `tests/conftest.py`**

```python
import pytest
from app import create_app


@pytest.fixture
def app(tmp_path):
    application = create_app({
        "TESTING": True,
        "DB_PATH_OVERRIDE": str(tmp_path / "test.db"),
    })
    return application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def admin_client(client):
    client.post("/api/login", json={
        "audience": "admin",
        "identifier": "admin",
        "password": "admin123",
    })
    return client


@pytest.fixture
def coach_client(client):
    client.post("/api/login", json={
        "audience": "coach",
        "identifier": "coach1",
        "password": "coach123",
    })
    return client
```

- [ ] **Step 3: Commit**

```bash
git add app/__init__.py tests/conftest.py
git commit -m "feat: add Flask app factory (create_app) with blueprint registration"
```

---

## Task 8: Pages + Health Blueprints

**Files:**
- Create: `app/routes/pages.py`
- Create: `app/routes/shared_routes.py`

- [ ] **Step 1: Write `app/routes/pages.py`**

```python
from flask import Blueprint, render_template, send_from_directory, current_app

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/")
@pages_bp.route("/login")
@pages_bp.route("/admin/dashboard")
@pages_bp.route("/coach/dashboard")
@pages_bp.route("/verify-email")
@pages_bp.route("/logout")
def index(**kwargs):
    return render_template("index.html")


@pages_bp.route("/manifest.webmanifest")
def manifest():
    return send_from_directory(current_app.static_folder, "manifest.webmanifest")


@pages_bp.route("/service-worker.js")
def service_worker():
    return send_from_directory(current_app.static_folder, "service-worker.js")
```

- [ ] **Step 2: Write `app/routes/shared_routes.py`**

```python
from flask import Blueprint, jsonify, session
from app.database import get_db
from app.auth import login_required, roles_required, current_user

shared_bp = Blueprint("shared", __name__)


@shared_bp.route("/api/health")
def health():
    return jsonify({"ok": True})


@shared_bp.route("/api/setup-status")
def setup_status():
    connection = get_db()
    try:
        count = connection.execute(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
        ).fetchone()["count"]
        return jsonify({"needsSetup": count == 0})
    finally:
        connection.close()


@shared_bp.route("/api/session")
def session_status():
    user = current_user()
    if user is None:
        return jsonify({"loggedIn": False})
    return jsonify({"loggedIn": True, "role": user["role"]})


@shared_bp.route("/api/public-options")
def public_options():
    connection = get_db()
    try:
        schools = [dict(r) for r in connection.execute(
            "SELECT id, name, district FROM schools ORDER BY name"
        ).fetchall()]
        grades = [dict(r) for r in connection.execute(
            "SELECT id, name, display_order FROM grades ORDER BY display_order"
        ).fetchall()]
        return jsonify({"schools": schools, "grades": grades})
    finally:
        connection.close()


@shared_bp.route("/api/bootstrap")
@login_required
def bootstrap():
    from app.routes._helpers import bootstrap_payload
    user = current_user()
    return jsonify(bootstrap_payload(user))


@shared_bp.route("/api/alerts/dismiss/<int:alert_id>", methods=["POST"])
@roles_required("admin")
def dismiss_alert(alert_id):
    connection = get_db()
    try:
        connection.execute("UPDATE alerts SET is_read = 1 WHERE id = ?", (alert_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()
```

- [ ] **Step 3: Write failing health test**

```python
# tests/test_health.py
def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {"ok": True}


def test_index_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200


def test_setup_status_returns_needs_setup_false(client):
    # init_db() seeds admin account, so needsSetup should be False
    response = client.get("/api/setup-status")
    assert response.status_code == 200
    assert response.get_json()["needsSetup"] is False
```

Write to: `tests/test_health.py`

- [ ] **Step 4: Run health tests**

```bash
python3 -m pytest tests/test_health.py -v
```

Expected: These will fail because `_helpers` module doesn't exist yet. That's expected — continue.

- [ ] **Step 5: Commit**

```bash
git add app/routes/pages.py app/routes/shared_routes.py tests/test_health.py
git commit -m "feat: add pages blueprint and shared API routes (health, session, bootstrap)"
```

---

## Task 9: Bootstrap Helper + Auth Routes

**Files:**
- Create: `app/routes/_helpers.py`
- Create: `app/routes/auth_routes.py`
- Source reference: `server.py` lines 2328–2400 (`bootstrap_payload`), lines 2763–2810 (`login`), lines 2968–2975 (`logout`)

- [ ] **Step 1: Write `app/routes/_helpers.py`**

```python
"""Shared helper functions used across multiple route blueprints."""
import re
from datetime import datetime, timezone
from flask import current_app
from app.database import get_db
from app.scoring import calculate_performance_breakdown


def now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_json():
    from flask import request
    return request.get_json(silent=True) or {}


def serialize_user(row):
    return {
        "id": row["id"],
        "role": row["role"],
        "name": row["name"],
        "email": row["email"],
        "username": row.get("username"),
        "schoolId": row.get("school_id"),
        "schoolName": row.get("school_name"),
        "emailVerified": bool(row.get("email_verified", 1)),
    }


def serialize_school(row):
    return {"id": row["id"], "name": row["name"], "district": row["district"]}


def serialize_grade(row):
    return {"id": row["id"], "name": row["name"], "displayOrder": row["display_order"]}


def serialize_skill(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "abbreviation": row.get("abbreviation"),
        "unit": row["unit"],
        "betterDirection": row["better_direction"],
    }


def fetch_schools(connection):
    return [serialize_school(r) for r in connection.execute(
        "SELECT id, name, district FROM schools ORDER BY name"
    ).fetchall()]


def fetch_grades(connection):
    return [serialize_grade(r) for r in connection.execute(
        "SELECT id, name, display_order FROM grades ORDER BY display_order"
    ).fetchall()]


def fetch_skills(connection):
    return [serialize_skill(r) for r in connection.execute(
        "SELECT id, name, abbreviation, unit, better_direction FROM skills ORDER BY name"
    ).fetchall()]


def fetch_users(connection):
    rows = connection.execute(
        """SELECT users.id, users.role, users.name, users.email, users.username,
                  users.school_id, schools.name AS school_name
           FROM users
           LEFT JOIN schools ON schools.id = users.school_id
           ORDER BY users.name"""
    ).fetchall()
    return [serialize_user(r) for r in rows]


def fetch_sessions(connection, school_id=None, grade_id=None, created_by_id=None):
    clauses, values = [], []
    if school_id:
        clauses.append("pe_sessions.school_id = ?")
        values.append(school_id)
    if grade_id:
        clauses.append("pe_sessions.grade_id = ?")
        values.append(grade_id)
    if created_by_id:
        clauses.append("pe_sessions.created_by = ?")
        values.append(created_by_id)
    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    rows = connection.execute(
        f"""SELECT pe_sessions.id, pe_sessions.school_id, pe_sessions.grade_id,
                   pe_sessions.session_date, pe_sessions.engagement_rating,
                   pe_sessions.coach_note, pe_sessions.created_by, pe_sessions.created_at,
                   schools.name AS school_name, grades.name AS grade_name,
                   users.name AS coach_name
            FROM pe_sessions
            LEFT JOIN schools ON schools.id = pe_sessions.school_id
            LEFT JOIN grades ON grades.id = pe_sessions.grade_id
            LEFT JOIN users ON users.id = pe_sessions.created_by
            {where}
            ORDER BY pe_sessions.session_date DESC""",
        values,
    ).fetchall()
    result = []
    for r in rows:
        skills = connection.execute(
            """SELECT session_results.score, skills.name, skills.abbreviation, skills.unit
               FROM session_results
               JOIN skills ON skills.id = session_results.skill_id
               WHERE session_results.session_id = ?""",
            (r["id"],),
        ).fetchall()
        result.append({
            "id": r["id"],
            "schoolId": r["school_id"],
            "schoolName": r["school_name"],
            "gradeId": r["grade_id"],
            "gradeName": r["grade_name"],
            "sessionDate": r["session_date"],
            "engagementRating": r["engagement_rating"],
            "coachNote": r["coach_note"],
            "createdBy": r["created_by"],
            "coachName": r["coach_name"],
            "createdAt": r["created_at"],
            "results": [{"skillName": s["name"], "abbreviation": s["abbreviation"],
                         "unit": s["unit"], "score": s["score"]} for s in skills],
        })
    return result


def fetch_eod_reports(connection, school_id=None, created_by_id=None):
    clauses, values = [], []
    if school_id:
        clauses.append("eod_reports.school_id = ?")
        values.append(school_id)
    if created_by_id:
        clauses.append("eod_reports.created_by = ?")
        values.append(created_by_id)
    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    rows = connection.execute(
        f"""SELECT eod_reports.*, users.name AS coach_name, schools.name AS school_name
            FROM eod_reports
            LEFT JOIN users ON users.id = eod_reports.created_by
            LEFT JOIN schools ON schools.id = eod_reports.school_id
            {where}
            ORDER BY eod_reports.report_date DESC""",
        values,
    ).fetchall()
    return [dict(r) for r in rows]


def fetch_incidents(connection, school_id=None, created_by_id=None):
    clauses, values = [], []
    if school_id:
        clauses.append("incidents.school_id = ?")
        values.append(school_id)
    if created_by_id:
        clauses.append("incidents.created_by = ?")
        values.append(created_by_id)
    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    rows = connection.execute(
        f"""SELECT incidents.*, users.name AS coach_name, schools.name AS school_name
            FROM incidents
            LEFT JOIN users ON users.id = incidents.created_by
            LEFT JOIN schools ON schools.id = incidents.school_id
            {where}
            ORDER BY incidents.incident_date DESC""",
        values,
    ).fetchall()
    return [dict(r) for r in rows]


def fetch_alerts(connection, school_id=None):
    clauses = ["alerts.is_read = 0"]
    values = []
    if school_id:
        clauses.append("incidents.school_id = ?")
        values.append(school_id)
    rows = connection.execute(
        f"""SELECT alerts.id, alerts.incident_id, alerts.created_at,
                   incidents.title, incidents.school_id, incidents.created_by,
                   users.name AS coach_name, schools.name AS school_name
            FROM alerts
            JOIN incidents ON incidents.id = alerts.incident_id
            LEFT JOIN users ON users.id = incidents.created_by
            LEFT JOIN schools ON schools.id = incidents.school_id
            WHERE {' AND '.join(clauses)}
            ORDER BY alerts.created_at DESC""",
        values,
    ).fetchall()
    return [dict(r) for r in rows]


def build_performance_rows(connection, school_id=None):
    coaches = connection.execute(
        """SELECT users.id FROM users
           LEFT JOIN schools ON schools.id = users.school_id
           WHERE users.role = 'coach' AND users.school_id IS NOT NULL
           ORDER BY users.name"""
    ).fetchall()

    rows = []
    for coach in coaches:
        sc_clauses = ["created_by = ?"]
        sc_values = [coach["id"]]
        if school_id:
            sc_clauses.append("school_id = ?")
            sc_values.append(school_id)

        sessions = connection.execute(
            f"SELECT session_date, engagement_rating FROM pe_sessions WHERE {' AND '.join(sc_clauses)}",
            sc_values,
        ).fetchall()
        eods = connection.execute(
            f"SELECT report_date FROM eod_reports WHERE {' AND '.join(sc_clauses)}",
            sc_values,
        ).fetchall()
        breakdown = calculate_performance_breakdown(sessions, eods)

        coach_row = connection.execute(
            """SELECT users.id, users.name, users.school_id, schools.name AS school_name
               FROM users LEFT JOIN schools ON schools.id = users.school_id
               WHERE users.id = ?""",
            (coach["id"],),
        ).fetchone()
        breakdown.update({
            "coachId": coach_row["id"],
            "coachName": coach_row["name"],
            "schoolId": coach_row["school_id"],
            "schoolName": coach_row["school_name"] or "",
        })
        rows.append(breakdown)

    rows.sort(key=lambda r: (-r["performanceScore"], r["coachName"].lower()))
    return rows


def bootstrap_payload(user):
    connection = get_db()
    try:
        school_id = user.get("school_id") if user["role"] == "coach" else None
        sessions = fetch_sessions(connection, school_id=school_id,
                                  created_by_id=user["id"] if user["role"] == "coach" else None)
        eod_reports = fetch_eod_reports(connection, school_id=school_id,
                                        created_by_id=user["id"] if user["role"] == "coach" else None)
        incidents = fetch_incidents(connection, school_id=school_id,
                                    created_by_id=user["id"] if user["role"] == "coach" else None)
        alerts = fetch_alerts(connection, school_id=school_id)
        performance = build_performance_rows(connection, school_id=school_id)

        return {
            "user": serialize_user(user),
            "schools": fetch_schools(connection),
            "grades": fetch_grades(connection),
            "skills": fetch_skills(connection),
            "users": fetch_users(connection) if user["role"] == "admin" else [],
            "sessions": sessions,
            "eodReports": eod_reports,
            "incidents": incidents,
            "alerts": alerts,
            "performance": performance,
        }
    finally:
        connection.close()
```

- [ ] **Step 2: Write `app/routes/auth_routes.py`**

```python
from flask import Blueprint, jsonify, session
from werkzeug.security import check_password_hash
from app.database import get_db
from app.auth import current_user, login_required
from app.routes._helpers import parse_json, serialize_user, now_utc

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = parse_json()
    audience = data.get("audience", "admin")
    identifier = str(data.get("identifier", data.get("email", ""))).strip().lower()
    password = str(data.get("password", ""))

    if not identifier or not password:
        return jsonify({"error": "Username or email and password are required."}), 400
    if audience not in ("admin", "coach"):
        return jsonify({"error": "Choose either the admin portal or the coach portal first."}), 401

    allowed_roles = ("admin",) if audience == "admin" else ("coach",)
    portal_label = audience

    connection = get_db()
    try:
        user = connection.execute(
            """SELECT users.*, schools.name AS school_name
               FROM users
               LEFT JOIN schools ON schools.id = users.school_id
               WHERE (LOWER(users.email) = ? OR LOWER(users.username) = ?)""",
            (identifier, identifier),
        ).fetchone()

        if user is None or user["role"] not in allowed_roles:
            return jsonify({"error": f"That login does not match the {portal_label} portal."}), 401

        if not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Username/email or password is incorrect."}), 401

        session["user_id"] = user["id"]
        return jsonify({"ok": True, "user": serialize_user(user)})
    finally:
        connection.close()


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"ok": True})


@auth_bp.route("/api/register", methods=["POST"])
def register():
    from werkzeug.security import generate_password_hash
    data = parse_json()
    connection = get_db()
    try:
        admin_count = connection.execute(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
        ).fetchone()["count"]
        if admin_count == 0:
            return jsonify({"error": "Create the first admin account before using public signup."}), 400

        audience = str(data.get("audience", "")).strip()
        role = "admin" if audience == "admin" else "coach" if audience == "coach" else ""
        if not role:
            return jsonify({"error": "Choose a portal first."}), 400

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required."}), 400

        school_id = None
        if role == "coach":
            school_id = data.get("schoolId")
            if not school_id:
                return jsonify({"error": "Coaches must be assigned to a school."}), 400

        existing = connection.execute(
            "SELECT id FROM users WHERE LOWER(email) = ?", (email,)
        ).fetchone()
        if existing:
            return jsonify({"error": "An account with that email already exists."}), 400

        connection.execute(
            """INSERT INTO users (role, name, email, password_hash, school_id, email_verified)
               VALUES (?, ?, ?, ?, ?, 1)""",
            (role, name, email, generate_password_hash(password), school_id),
        )
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@auth_bp.route("/api/setup-admin", methods=["POST"])
def setup_admin():
    from werkzeug.security import generate_password_hash
    data = parse_json()
    connection = get_db()
    try:
        count = connection.execute(
            "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"
        ).fetchone()["count"]
        if count > 0:
            return jsonify({"error": "Setup is already complete."}), 400

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required."}), 400

        connection.execute(
            """INSERT INTO users (role, name, email, password_hash, email_verified)
               VALUES ('admin', ?, ?, ?, 1)""",
            (name, email, generate_password_hash(password)),
        )
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()
```

- [ ] **Step 3: Run all tests so far**

```bash
cd /Users/jahleel/ufit-motion
pip install -r requirements.txt -q
python3 -m pytest tests/ -v --ignore=tests/test_database.py --ignore=tests/test_auth.py
```

Expected: `test_health.py` tests pass. Auth tests may fail until blueprints are all registered.

- [ ] **Step 4: Commit**

```bash
git add app/routes/_helpers.py app/routes/auth_routes.py
git commit -m "feat: add auth routes (login, logout, register) and bootstrap helper"
```

---

## Task 10: Admin Routes

**Files:**
- Create: `app/routes/admin_routes.py`
- Source reference: `server.py` lines 2987–3275 (schools, grades, skills, users, email-settings, export)

- [ ] **Step 1: Write `app/routes/admin_routes.py`**

```python
import io
import json
import zipfile
from flask import Blueprint, jsonify, send_file
from app.database import get_db
from app.auth import roles_required, local_or_admin_required
from app.routes._helpers import (
    parse_json, serialize_school, serialize_grade, serialize_skill,
    serialize_user, fetch_schools, fetch_grades, fetch_skills, fetch_users,
    now_utc,
)

admin_bp = Blueprint("admin", __name__)

DEFAULT_SMTP_SETTINGS = {
    "host": "", "port": 587, "security": "starttls",
    "username": "", "password": "", "fromEmail": "",
}


@admin_bp.route("/api/schools", methods=["POST"])
@roles_required("admin")
def create_school():
    data = parse_json()
    name = str(data.get("name", "")).strip()
    district = str(data.get("district", "")).strip()
    if not name or not district:
        return jsonify({"error": "School name and district are required."}), 400
    connection = get_db()
    try:
        connection.execute(
            "INSERT INTO schools (name, district) VALUES (?, ?)", (name, district)
        )
        connection.commit()
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"error": "That school already exists."}), 400
    finally:
        connection.close()


@admin_bp.route("/api/schools/<int:school_id>", methods=["DELETE"])
@roles_required("admin")
def delete_school(school_id):
    connection = get_db()
    try:
        connection.execute("DELETE FROM schools WHERE id = ?", (school_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/api/grades", methods=["POST"])
@roles_required("admin")
def create_grade():
    data = parse_json()
    name = str(data.get("name", "")).strip()
    display_order = data.get("displayOrder", 99)
    if not name:
        return jsonify({"error": "Grade name is required."}), 400
    connection = get_db()
    try:
        connection.execute(
            "INSERT INTO grades (name, display_order) VALUES (?, ?)", (name, display_order)
        )
        connection.commit()
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"error": "That grade already exists."}), 400
    finally:
        connection.close()


@admin_bp.route("/api/grades/<int:grade_id>", methods=["DELETE"])
@roles_required("admin")
def delete_grade(grade_id):
    connection = get_db()
    try:
        connection.execute("DELETE FROM grades WHERE id = ?", (grade_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/api/skills", methods=["POST"])
@roles_required("admin")
def create_skill():
    data = parse_json()
    name = str(data.get("name", "")).strip()
    abbreviation = str(data.get("abbreviation", "")).strip() or None
    unit = str(data.get("unit", "")).strip()
    better_direction = str(data.get("betterDirection", "higher")).strip()
    if not name or not unit:
        return jsonify({"error": "Skill name and unit are required."}), 400
    connection = get_db()
    try:
        connection.execute(
            "INSERT INTO skills (name, abbreviation, unit, better_direction) VALUES (?, ?, ?, ?)",
            (name, abbreviation, unit, better_direction),
        )
        connection.commit()
        return jsonify({"ok": True})
    except Exception:
        return jsonify({"error": "A skill with that name already exists."}), 400
    finally:
        connection.close()


@admin_bp.route("/api/skills/<int:skill_id>", methods=["PATCH"])
@roles_required("admin")
def update_skill(skill_id):
    data = parse_json()
    connection = get_db()
    try:
        existing = connection.execute(
            "SELECT id FROM skills WHERE id = ?", (skill_id,)
        ).fetchone()
        if not existing:
            return jsonify({"error": "Skill not found."}), 404
        fields = {}
        if "name" in data:
            fields["name"] = str(data["name"]).strip()
        if "abbreviation" in data:
            fields["abbreviation"] = str(data["abbreviation"]).strip() or None
        if "unit" in data:
            fields["unit"] = str(data["unit"]).strip()
        if "betterDirection" in data:
            fields["better_direction"] = str(data["betterDirection"]).strip()
        if not fields:
            return jsonify({"error": "No fields to update."}), 400
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        connection.execute(
            f"UPDATE skills SET {set_clause} WHERE id = ?",
            list(fields.values()) + [skill_id],
        )
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/api/skills/<int:skill_id>", methods=["DELETE"])
@roles_required("admin")
def delete_skill(skill_id):
    connection = get_db()
    try:
        connection.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/api/users", methods=["POST"])
@roles_required("admin")
def create_user():
    from werkzeug.security import generate_password_hash
    data = parse_json()
    role = str(data.get("role", "")).strip()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()
    school_id = data.get("schoolId")

    if not role or not name or not email or not password:
        return jsonify({"error": "Role, name, email, and password are required."}), 400
    if role not in ("admin", "coach"):
        return jsonify({"error": "Role must be admin or coach."}), 400
    if role == "coach" and not school_id:
        return jsonify({"error": "Coaches must be assigned to a school."}), 400

    connection = get_db()
    try:
        existing = connection.execute(
            "SELECT id FROM users WHERE LOWER(email) = ?", (email,)
        ).fetchone()
        if existing:
            return jsonify({"error": "An account with that email already exists."}), 400
        connection.execute(
            """INSERT INTO users (role, name, email, password_hash, school_id, email_verified)
               VALUES (?, ?, ?, ?, ?, 1)""",
            (role, name, email, generate_password_hash(password), school_id),
        )
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/api/users/<int:user_id>", methods=["DELETE"])
@roles_required("admin")
def delete_user(user_id):
    connection = get_db()
    try:
        connection.execute("DELETE FROM users WHERE id = ?", (user_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/api/email-settings")
@local_or_admin_required
def get_email_settings():
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT value FROM app_settings WHERE key = 'smtp_settings'"
        ).fetchone()
        if row:
            settings = json.loads(row["value"])
        else:
            settings = DEFAULT_SMTP_SETTINGS.copy()
        settings.pop("password", None)
        return jsonify({"settings": settings, "source": "database" if row else "default"})
    finally:
        connection.close()


@admin_bp.route("/api/email-settings", methods=["POST"])
@local_or_admin_required
def save_email_settings():
    data = parse_json()
    settings = data.get("settings", {})
    connection = get_db()
    try:
        connection.execute(
            """INSERT INTO app_settings (key, value) VALUES ('smtp_settings', ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
            (json.dumps(settings),),
        )
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@admin_bp.route("/download/export")
@roles_required("admin")
def download_export():
    connection = get_db()
    try:
        tables = ["schools", "grades", "skills", "users", "pe_sessions",
                  "session_results", "eod_reports", "incidents", "alerts"]
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for table in tables:
                rows = connection.execute(f"SELECT * FROM {table}").fetchall()
                zf.writestr(
                    f"{table}.json",
                    json.dumps([dict(r) for r in rows], indent=2, default=str),
                )
        buf.seek(0)
        return send_file(
            buf,
            mimetype="application/zip",
            as_attachment=True,
            download_name=f"ufit-export-{now_utc()[:10]}.zip",
        )
    finally:
        connection.close()
```

- [ ] **Step 2: Commit**

```bash
git add app/routes/admin_routes.py
git commit -m "feat: add admin routes (schools, grades, skills, users, email-settings, export)"
```

---

## Task 11: Coach Routes

**Files:**
- Create: `app/routes/coach_routes.py`
- Source reference: `server.py` lines 3285–3620 (sessions, EOD reports, comments, incidents, OCR)

- [ ] **Step 1: Write `app/routes/coach_routes.py`**

```python
import os
import subprocess
import tempfile
from flask import Blueprint, jsonify, request, current_app
from app.database import get_db
from app.auth import roles_required, login_required, current_user
from app.routes._helpers import parse_json, now_utc

coach_bp = Blueprint("coach", __name__)


def _school_scope_for_coach(user):
    return user.get("school_id")


@coach_bp.route("/api/sessions", methods=["POST"])
@roles_required("coach")
def create_session():
    data = parse_json()
    user = current_user()
    school_id = _school_scope_for_coach(user) or data.get("schoolId")
    grade_id = data.get("gradeId")
    session_date = str(data.get("date", "")).strip()
    engagement_rating = data.get("engagementRating")
    coach_note = str(data.get("coachNote", "")).strip() or None
    results = data.get("results", [])

    if not school_id or not grade_id or not session_date:
        return jsonify({"error": "School, grade, and date are required."}), 400

    connection = get_db()
    try:
        cursor = connection.execute(
            """INSERT INTO pe_sessions (school_id, grade_id, session_date,
               engagement_rating, coach_note, created_by)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (school_id, grade_id, session_date, engagement_rating, coach_note, user["id"]),
        )
        session_id = cursor.lastrowid
        for result in results:
            skill_id = result.get("skillId")
            score = result.get("score")
            if skill_id is not None and score is not None:
                connection.execute(
                    "INSERT INTO session_results (session_id, skill_id, score) VALUES (?, ?, ?)",
                    (session_id, skill_id, score),
                )
        connection.commit()
        return jsonify({"ok": True, "sessionId": session_id})
    finally:
        connection.close()


@coach_bp.route("/api/sessions/<int:session_id>", methods=["DELETE"])
@roles_required("coach", "admin")
def delete_session(session_id):
    user = current_user()
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT created_by FROM pe_sessions WHERE id = ?", (session_id,)
        ).fetchone()
        if row is None:
            return jsonify({"error": "Session not found."}), 404
        if user["role"] == "coach" and row["created_by"] != user["id"]:
            return jsonify({"error": "Coaches can only delete their own sessions."}), 403
        connection.execute("DELETE FROM pe_sessions WHERE id = ?", (session_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@coach_bp.route("/api/eod-reports", methods=["POST"])
@roles_required("coach")
def create_eod_report():
    data = parse_json()
    user = current_user()
    school_id = _school_scope_for_coach(user) or data.get("schoolId")
    report_date = str(data.get("date", "")).strip()
    summary = str(data.get("summary", "")).strip()
    celebrations = str(data.get("celebrations", "")).strip()
    follow_up_needed = str(data.get("followUpNeeded", "")).strip()
    support_needed = str(data.get("supportNeeded", "")).strip() or None
    classes_completed = int(data.get("classesCompleted", 0))

    if not school_id or not report_date or not summary or not celebrations or not follow_up_needed:
        return jsonify({"error": "School, date, summary, celebrations, and follow-up are required."}), 400

    connection = get_db()
    try:
        cursor = connection.execute(
            """INSERT INTO eod_reports (school_id, report_date, classes_completed,
               summary, celebrations, follow_up_needed, support_needed, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (school_id, report_date, classes_completed, summary, celebrations,
             follow_up_needed, support_needed, user["id"]),
        )
        connection.commit()
        return jsonify({"ok": True, "reportId": cursor.lastrowid})
    finally:
        connection.close()


@coach_bp.route("/api/eod-reports/<int:report_id>", methods=["DELETE"])
@roles_required("coach", "admin")
def delete_eod_report(report_id):
    user = current_user()
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT created_by FROM eod_reports WHERE id = ?", (report_id,)
        ).fetchone()
        if row is None:
            return jsonify({"error": "Report not found."}), 404
        if user["role"] == "coach" and row["created_by"] != user["id"]:
            return jsonify({"error": "Coaches can only delete their own reports."}), 403
        connection.execute("DELETE FROM eod_reports WHERE id = ?", (report_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@coach_bp.route("/api/incidents", methods=["POST"])
@roles_required("coach")
def create_incident():
    data = parse_json()
    user = current_user()
    school_id = _school_scope_for_coach(user) or data.get("schoolId")
    incident_date = str(data.get("date", "")).strip()
    title = str(data.get("title", "")).strip()
    details = str(data.get("details", "")).strip()

    if not school_id or not incident_date or not title or not details:
        return jsonify({"error": "School, date, title, and details are required."}), 400

    connection = get_db()
    try:
        cursor = connection.execute(
            """INSERT INTO incidents (school_id, incident_date, title, details, created_by)
               VALUES (?, ?, ?, ?, ?)""",
            (school_id, incident_date, title, details, user["id"]),
        )
        # Insert unread alert for admin
        connection.execute(
            "INSERT INTO alerts (incident_id, is_read) VALUES (?, 0)",
            (cursor.lastrowid,),
        )
        connection.commit()
        return jsonify({"ok": True, "incidentId": cursor.lastrowid})
    finally:
        connection.close()


@coach_bp.route("/api/incidents/<int:incident_id>/follow-up", methods=["POST"])
@roles_required("admin")
def update_incident_follow_up(incident_id):
    data = parse_json()
    user = current_user()
    status = str(data.get("status", "new")).strip() or "new"
    admin_response = str(data.get("adminResponse", "")).strip()
    follow_up_note = str(data.get("followUpNote", "")).strip()
    follow_up_date = str(data.get("followUpDate", "")).strip()

    connection = get_db()
    try:
        incident = connection.execute(
            "SELECT id, admin_response, follow_up_note, follow_up_date, admin_status FROM incidents WHERE id = ?",
            (incident_id,),
        ).fetchone()
        if incident is None:
            return jsonify({"error": "Incident not found."}), 404

        next_response = admin_response or incident["admin_response"]
        next_note = follow_up_note or incident["follow_up_note"]
        next_date = follow_up_date or incident["follow_up_date"]
        next_status = status or incident["admin_status"] or "new"

        connection.execute(
            """UPDATE incidents SET admin_status = ?, admin_response = ?,
               follow_up_note = ?, follow_up_date = ?,
               acknowledged_at = ?, acknowledged_by = ?
               WHERE id = ?""",
            (next_status, next_response, next_note, next_date,
             now_utc(), user["id"], incident_id),
        )
        connection.execute(
            "UPDATE alerts SET is_read = 1 WHERE incident_id = ?", (incident_id,)
        )
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@coach_bp.route("/api/comments", methods=["POST"])
@roles_required("coach", "admin")
def create_comment():
    data = parse_json()
    user = current_user()
    school_id = _school_scope_for_coach(user) if user["role"] == "coach" else data.get("schoolId")
    grade_id = data.get("gradeId")
    comment_date = str(data.get("date", "")).strip()
    title = str(data.get("title", "")).strip()
    body = str(data.get("body", "")).strip()
    home_focus = str(data.get("homeFocus", "")).strip()

    if not school_id or not grade_id or not comment_date or not title or not body or not home_focus:
        return jsonify({"error": "All fields are required."}), 400

    connection = get_db()
    try:
        cursor = connection.execute(
            """INSERT INTO comments (school_id, grade_id, comment_date, title, body, home_focus, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (school_id, grade_id, comment_date, title, body, home_focus, user["id"]),
        )
        connection.commit()
        return jsonify({"ok": True, "commentId": cursor.lastrowid})
    finally:
        connection.close()


@coach_bp.route("/api/comments/<int:comment_id>", methods=["DELETE"])
@roles_required("admin", "coach")
def delete_comment(comment_id):
    user = current_user()
    connection = get_db()
    try:
        row = connection.execute(
            "SELECT created_by FROM comments WHERE id = ?", (comment_id,)
        ).fetchone()
        if row is None:
            return jsonify({"error": "Comment not found."}), 404
        if user["role"] == "coach" and row["created_by"] != user["id"]:
            return jsonify({"error": "Coaches can only remove their own comments."}), 403
        connection.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        connection.commit()
        return jsonify({"ok": True})
    finally:
        connection.close()


@coach_bp.route("/api/import-score-sheet", methods=["POST"])
@roles_required("coach")
def import_score_sheet():
    cfg = current_app.config["UFIT_CONFIG"]
    image_file = request.files.get("image")
    if not image_file:
        return jsonify({"error": "No image provided."}), 400

    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        image_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        binary = cfg.OCR_BINARY_PATH
        if not os.path.exists(binary):
            return jsonify({"error": "OCR is not available on this server."}), 503
        result = subprocess.run(
            [binary, tmp_path],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode != 0:
            return jsonify({"error": "OCR processing failed."}), 500
        return jsonify({"ok": True, "text": result.stdout})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "OCR timed out."}), 500
    finally:
        os.unlink(tmp_path)
```

- [ ] **Step 2: Run full test suite**

```bash
python3 -m pytest tests/ -v
```

Expected: `test_scoring.py` (5 passed), `test_health.py` (3 passed). Auth tests may still fail — that is expected until all blueprints wire together.

- [ ] **Step 3: Commit**

```bash
git add app/routes/coach_routes.py
git commit -m "feat: add coach routes (sessions, EOD reports, incidents, comments, OCR)"
```

---

## Task 12: Smoke Test — Run the App Locally

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/jahleel/ufit-motion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 2: Set env vars and run**

```bash
export UFIT_SECRET_KEY="dev-secret-for-local-testing-only"
export APP_ENV="development"
python3 -c "from app import create_app; app = create_app(); print('App created OK')"
```

Expected: `App created OK`

- [ ] **Step 3: Start the server**

```bash
gunicorn "app:create_app()" --bind 127.0.0.1:5001 --timeout 30
```

Open `http://127.0.0.1:5001` in a browser. Expected: UfitMotion landing page loads.

- [ ] **Step 4: Test login flow**

```bash
curl -s -c cookies.txt -X POST http://127.0.0.1:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"audience":"admin","identifier":"admin","password":"admin123"}' | python3 -m json.tool
```

Expected:
```json
{
    "ok": true,
    "user": { "role": "admin", ... }
}
```

- [ ] **Step 5: Test bootstrap**

```bash
curl -s -b cookies.txt http://127.0.0.1:5001/api/bootstrap | python3 -m json.tool | head -30
```

Expected: JSON with `schools`, `grades`, `skills`, `users`, `sessions`, `eodReports`, `performance` keys.

- [ ] **Step 6: Run test suite**

```bash
python3 -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 7: Clean up and commit**

```bash
rm -f cookies.txt ufit_motion.db
git add .
git commit -m "feat: verified full app runs locally with restructured backend"
```

---

## Task 13: Versioned SQL Migration File

**Files:**
- Create: `migrations/001_initial_schema.sql`
- Create: `migrations/README.md`

- [ ] **Step 1: Write `migrations/001_initial_schema.sql`**

This is for applying the schema to a fresh Supabase Postgres database.

```sql
-- UfitMotion Initial Schema
-- Apply to Supabase via: psql $DATABASE_URL -f migrations/001_initial_schema.sql
-- Safe to run multiple times (uses IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS schools (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    district TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    abbreviation TEXT,
    unit TEXT NOT NULL,
    better_direction TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    username TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_hint TEXT,
    school_id BIGINT REFERENCES schools(id) ON DELETE CASCADE,
    grade_id BIGINT REFERENCES grades(id) ON DELETE CASCADE,
    email_verified INTEGER NOT NULL DEFAULT 1,
    email_verification_code TEXT,
    email_verification_sent_at TEXT,
    email_verification_expires_at TEXT,
    email_verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)
    WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pe_sessions (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_id BIGINT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    session_date TEXT NOT NULL,
    engagement_rating DOUBLE PRECISION,
    coach_note TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_results (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES pe_sessions(id) ON DELETE CASCADE,
    skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS eod_reports (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    report_date TEXT NOT NULL,
    classes_completed INTEGER NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    celebrations TEXT NOT NULL,
    follow_up_needed TEXT NOT NULL,
    support_needed TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_id BIGINT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    comment_date TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    home_focus TEXT NOT NULL,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    school_id BIGINT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    incident_date TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    admin_status TEXT NOT NULL DEFAULT 'new',
    admin_response TEXT,
    follow_up_note TEXT,
    follow_up_date TEXT,
    acknowledged_at TEXT,
    acknowledged_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0
);
```

- [ ] **Step 2: Write `migrations/README.md`**

```markdown
# Migrations

Numbered SQL files. Apply in order to a fresh Supabase Postgres database.
Never edit an existing migration — add a new one instead.

## Apply to Supabase

1. Get your Postgres connection string from Supabase:
   Project Settings → Database → Connection string → URI

2. Apply migrations in order:

```bash
psql $DATABASE_URL -f migrations/001_initial_schema.sql
```

3. The app's `init_db()` will seed data on first startup.

## File Naming

`NNN_description.sql` where NNN is zero-padded (001, 002, ...).
```

- [ ] **Step 3: Commit**

```bash
git add migrations/
git commit -m "feat: add versioned SQL migrations (001 initial schema)"
```

---

## Task 14: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        env:
          APP_ENV: development
          UFIT_SECRET_KEY: ci-test-secret-key
        run: python3 -m pytest tests/ -v --tb=short
```

- [ ] **Step 2: Verify CI file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: add GitHub Actions CI (runs pytest on every push)"
```

---

## Task 15: Deployment Documentation

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Write `docs/DEPLOYMENT.md`**

```markdown
# Deployment Guide

## Stack
- **App hosting:** Railway
- **Database:** Supabase (Postgres)

---

## Step 1: Supabase Setup

1. Create a free account at supabase.com
2. Create a new project (name it `ufit-motion`)
3. Go to: Project Settings → Database → Connection string → URI
4. Copy the URI — it looks like: `postgresql://postgres:[password]@[host]:5432/postgres`
5. Apply the schema:

```bash
psql "postgresql://..." -f migrations/001_initial_schema.sql
```

---

## Step 2: GitHub Setup

1. Push this repo to GitHub (create a new private repo)
2. Railway will connect to it

---

## Step 3: Railway Setup

1. Create a free account at railway.app
2. New Project → Deploy from GitHub repo → select this repo
3. Railway auto-detects Python + Procfile

4. Add environment variables in Railway dashboard:

| Variable | Value |
|---|---|
| `UFIT_SECRET_KEY` | Generate with: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `DATABASE_URL` | Your Supabase Postgres URI from Step 1 |
| `APP_ENV` | `production` |
| `UFIT_APP_BASE_URL` | Your Railway domain (e.g. `https://ufit-motion.up.railway.app`) |

5. Deploy → Railway builds and deploys automatically.

6. Visit your Railway domain. The app seeds itself on first start.

---

## Step 4: Verify

```bash
curl https://your-domain.up.railway.app/api/health
# Expected: {"ok": true}
```

Log in with:
- Admin: `admin` / `admin123`
- Coach: `coach1` / `coach123`

**Change these passwords immediately after first login.**

---

## Local Development

```bash
cp .env.example .env
# Edit .env — set UFIT_SECRET_KEY to any string
source .venv/bin/activate
python3 -m flask --app "app:create_app()" run --debug
```

Or with gunicorn:

```bash
gunicorn "app:create_app()" --bind 127.0.0.1:5000 --reload
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: add Railway + Supabase deployment guide"
```

---

## Task 16: Final Test Run + Acceptance Criteria Verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/jahleel/ufit-motion
source .venv/bin/activate
python3 -m pytest tests/ -v
```

Expected: All tests pass. Fix any failures before continuing.

- [ ] **Step 2: Verify scoring formula (acceptance criterion)**

```bash
python3 -c "
from app.scoring import calculate_performance_breakdown
sessions = [{'engagement_rating': 4.0, 'session_date': '2026-03-15'}] * 3
eods = [{'report_date': '2026-03-15'}] * 18
result = calculate_performance_breakdown(sessions, eods)
print('Score:', result['performanceScore'])
assert result['performanceScore'] == 85.0, f'Expected 85.0, got {result[\"performanceScore\"]}'
print('PASS')
"
```

Expected: `Score: 85.0` / `PASS`

- [ ] **Step 3: Verify app refuses to start without SECRET_KEY in production**

```bash
python3 -c "
import os
os.environ['APP_ENV'] = 'production'
os.environ.pop('UFIT_SECRET_KEY', None)
try:
    from app.config import get_config
    cfg = get_config()
    _ = cfg.SECRET_KEY
    print('FAIL: Should have raised ValueError')
except ValueError as e:
    print('PASS:', e)
"
```

Expected: `PASS: UFIT_SECRET_KEY environment variable is required in production.`

- [ ] **Step 4: Verify incident → alert flow end-to-end**

```bash
export UFIT_SECRET_KEY="local-test"
python3 << 'EOF'
from app import create_app
import json

app = create_app()
client = app.test_client()

# Login as coach
r = client.post("/api/login", json={"audience": "coach", "identifier": "coach1", "password": "coach123"})
assert r.status_code == 200, f"Login failed: {r.get_json()}"

# Submit incident
r = client.post("/api/incidents", json={
    "date": "2026-03-31",
    "title": "Test incident",
    "details": "Test details",
})
assert r.status_code == 200, f"Incident failed: {r.get_json()}"
print("Incident created:", r.get_json())

# Login as admin and check alerts
client2 = app.test_client()
r = client2.post("/api/login", json={"audience": "admin", "identifier": "admin", "password": "admin123"})
r = client2.get("/api/bootstrap")
data = r.get_json()
alerts = data.get("alerts", [])
print("Unread alerts:", len(alerts))
assert len(alerts) >= 1, "Expected at least 1 unread alert"
print("PASS: incident alert flow works end-to-end")
EOF
```

Expected: `PASS: incident alert flow works end-to-end`

- [ ] **Step 5: Commit final state**

```bash
git add .
git commit -m "test: verify all acceptance criteria pass"
```

---

## Task 17: Deploy to Railway

- [ ] **Step 1: Push to GitHub**

Create a new private repo at github.com named `ufit-motion`, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ufit-motion.git
git push -u origin main
```

- [ ] **Step 2: Apply Supabase migrations**

Get your `DATABASE_URL` from Supabase (Project Settings → Database → URI), then:

```bash
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
```

Expected: `CREATE TABLE` × 10

- [ ] **Step 3: Create Railway project**

1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select `ufit-motion`
3. Railway detects Python + Procfile automatically

- [ ] **Step 4: Set environment variables in Railway dashboard**

Generate a secret key first:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Add in Railway → Variables:
- `UFIT_SECRET_KEY` = output from above
- `DATABASE_URL` = your Supabase URI
- `APP_ENV` = `production`
- `UFIT_APP_BASE_URL` = your Railway domain (after first deploy)

- [ ] **Step 5: Verify deployment**

```bash
curl https://YOUR_DOMAIN.up.railway.app/api/health
```

Expected: `{"ok": true}`

- [ ] **Step 6: Verify login works**

```bash
curl -c cookies.txt -X POST https://YOUR_DOMAIN.up.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"audience":"admin","identifier":"admin","password":"admin123"}'
```

Expected: `{"ok": true, "user": {...}}`

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Covered by task |
|---|---|
| App factory `create_app()` | Task 7 |
| Blueprints per domain | Tasks 8–11 |
| `database.py` abstraction | Task 3 |
| `scoring.py` pure function | Task 5 |
| ProductionConfig raises on missing key | Task 2 |
| Versioned SQL migrations | Task 13 |
| `requirements.txt` pinned exactly | Task 1 |
| GitHub Actions CI | Task 14 |
| `/api/health` Railway healthcheck | Task 8 |
| Incident → alert flow | Task 11 + verified Task 16 |
| Role enforcement (403) | Task 4 + tested Task 4 |
| Scoring formula (85.0 example) | Task 5 TDD |
| `.env.example` with no fallback values | Task 1 |
| `.gitignore` excludes `*.db` and `.env` | Task 1 |
| Railway deploy config | Tasks 1 + 17 |
| Deployment documentation | Task 15 |

All spec requirements are covered.

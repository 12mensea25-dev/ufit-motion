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

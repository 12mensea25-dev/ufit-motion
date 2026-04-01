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

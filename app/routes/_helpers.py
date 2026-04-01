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
    d = dict(row)
    return {
        "id": d["id"],
        "role": d["role"],
        "name": d["name"],
        "email": d["email"],
        "username": d.get("username"),
        "schoolId": d.get("school_id"),
        "schoolName": d.get("school_name"),
        "emailVerified": bool(d.get("email_verified", 1)),
    }


def serialize_school(row):
    return {"id": row["id"], "name": row["name"], "district": row["district"]}


def serialize_grade(row):
    return {"id": row["id"], "name": row["name"], "displayOrder": row["display_order"]}


def serialize_skill(row):
    d = dict(row)
    return {
        "id": d["id"],
        "name": d["name"],
        "abbreviation": d.get("abbreviation"),
        "unit": d["unit"],
        "betterDirection": d["better_direction"],
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
        school_id = dict(user).get("school_id") if user["role"] == "coach" else None
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

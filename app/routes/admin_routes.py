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

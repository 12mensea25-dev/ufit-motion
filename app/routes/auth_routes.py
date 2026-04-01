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

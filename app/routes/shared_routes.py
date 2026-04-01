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

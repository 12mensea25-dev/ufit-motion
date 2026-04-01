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
    import traceback
    from flask import request
    from app.routes._helpers import bootstrap_payload
    user = current_user()
    school_id = None
    if dict(user).get("role") == "admin":
        school_id_param = request.args.get("school_id")
        school_id = int(school_id_param) if school_id_param and school_id_param.isdigit() else None
    try:
        return jsonify(bootstrap_payload(user, admin_school_filter=school_id))
    except Exception:
        tb = traceback.format_exc()
        import logging
        logging.getLogger("ufit").error("bootstrap error:\n%s", tb)
        return jsonify({"error": tb}), 500


@shared_bp.route("/api/debug-db")
@login_required
def debug_db():
    import traceback
    connection = get_db()
    try:
        from flask import current_app
        cfg = current_app.config["UFIT_CONFIG"]
        backend = "postgres" if cfg.DATABASE_URL else "sqlite"
        counts = {}
        for table in ["schools", "grades", "skills", "users", "pe_sessions", "eod_reports", "incidents"]:
            try:
                row = connection.execute(f"SELECT COUNT(*) AS c FROM {table}").fetchone()
                counts[table] = row["c"]
            except Exception as e:
                counts[table] = f"ERROR: {e}"
        return jsonify({"backend": backend, "counts": counts})
    except Exception:
        return jsonify({"error": traceback.format_exc()}), 500
    finally:
        connection.close()


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

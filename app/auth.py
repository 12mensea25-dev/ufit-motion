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

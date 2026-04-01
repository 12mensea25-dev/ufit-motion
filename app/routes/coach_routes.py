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

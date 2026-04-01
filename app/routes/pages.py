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

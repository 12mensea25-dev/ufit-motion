import os
from flask import Flask
from app.config import get_config


def create_app(test_config=None):
    app = Flask(__name__, template_folder="../templates", static_folder="../static")

    cfg = get_config()
    app.config["UFIT_CONFIG"] = cfg
    app.config["SECRET_KEY"] = cfg.SECRET_KEY
    app.config["JSON_SORT_KEYS"] = False

    if test_config:
        if "DB_PATH_OVERRIDE" in test_config:
            cfg.DB_PATH = test_config.pop("DB_PATH_OVERRIDE")
        app.config.update(test_config)
        app.config["UFIT_CONFIG"] = cfg

    # Register blueprints
    from app.routes.pages import pages_bp
    from app.routes.auth_routes import auth_bp
    from app.routes.shared_routes import shared_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.coach_routes import coach_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(shared_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(coach_bp)

    from app.logging import init_logging
    init_logging(app)

    with app.app_context():
        from app.seeds import init_db
        import logging
        import traceback as _tb
        try:
            init_db()
            app.config["INIT_DB_ERROR"] = None
        except Exception as exc:
            app.config["INIT_DB_ERROR"] = _tb.format_exc()
            logging.getLogger("ufit").error("init_db failed: %s", exc, exc_info=True)

    return app

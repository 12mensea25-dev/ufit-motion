import time
import json
import logging
from flask import request, g

logger = logging.getLogger("ufit")


def init_logging(app):
    """Register before/after request hooks for structured per-request logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
    )

    @app.before_request
    def _before():
        g.request_start = time.monotonic()

    @app.after_request
    def _after(response):
        duration_ms = round((time.monotonic() - g.request_start) * 1000)
        user_id = None
        role = None
        try:
            from flask import session
            from app.database import get_db
            uid = session.get("user_id")
            if uid:
                user_id = uid
                # role cached on g to avoid extra DB hit
                if hasattr(g, "_log_role"):
                    role = g._log_role
        except Exception:
            pass

        record = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "ms": duration_ms,
            "user_id": user_id,
        }
        if role:
            record["role"] = role
        logger.info(json.dumps(record))
        return response

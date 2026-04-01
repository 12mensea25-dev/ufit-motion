import os


class Config:
    JSON_SORT_KEYS = False
    EXPECTED_EOD_SUBMISSIONS = 20
    _db_path_override = None

    @property
    def SECRET_KEY(self):
        return os.environ.get("UFIT_SECRET_KEY", "ufit-motion-local-secret")

    @property
    def DATABASE_URL(self):
        return (
            os.environ.get("DATABASE_URL", "").strip()
            or os.environ.get("SUPABASE_DB_URL", "").strip()
            or os.environ.get("UFIT_SUPABASE_DB_URL", "").strip()
        )

    @property
    def DB_PATH(self):
        if self._db_path_override is not None:
            return self._db_path_override
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.environ.get("UFIT_DB_PATH", os.path.join(base, "ufit_motion.db"))

    @DB_PATH.setter
    def DB_PATH(self, value):
        self._db_path_override = value

    @property
    def OCR_SCRIPT_PATH(self):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base, "scripts", "vision_ocr.swift")

    @property
    def OCR_BINARY_PATH(self):
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(base, "scripts", "vision_ocr")

    @property
    def APP_BASE_URL(self):
        return os.environ.get("UFIT_APP_BASE_URL", "").strip()


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False

    @property
    def SECRET_KEY(self):
        key = os.environ.get("UFIT_SECRET_KEY", "").strip()
        if not key:
            raise ValueError(
                "UFIT_SECRET_KEY environment variable is required in production. "
                "Set it to a strong random string (64+ chars)."
            )
        return key


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config():
    env = os.environ.get("APP_ENV", "development").lower()
    return config_map.get(env, DevelopmentConfig)()

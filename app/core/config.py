from typing import List, Optional
from pydantic_settings import BaseSettings

_DEFAULT_SECRET_KEY = "8af675b3c4109403d159e847c219a12c85e28a07c1266e74581f1816e8db2b53"
_DEFAULT_REFRESH_SECRET_KEY = "cf98ea8368593a1059f3d917f8db8c1c4e97a3014a66f7a6344f686c123ea32f"

_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5180",
    "http://127.0.0.1:5180",
    "http://localhost:5181",
    "http://127.0.0.1:5181",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

_DEFAULT_PROD_ORIGINS = [
    "https://kaizen.abhiyantatech.com",
]


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env."""

    # Runtime Environment: development | staging | production
    ENVIRONMENT: str = "development"

    # Database Settings
    DATABASE_URL: str = "postgresql+psycopg2://elearning_user:postgres@localhost:5432/elearning"
    BACKUP_DATABASE_URL: Optional[str] = None

    # JWT Settings
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
    REFRESH_SECRET_KEY: str = _DEFAULT_REFRESH_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Origins (comma-separated URLs)
    ALLOWED_ORIGINS: str = ""

    # Upload Limits & Directory
    UPLOAD_DIR: str = "uploads"
    MAX_MEDIA_UPLOAD_BYTES: int = 100 * 1024 * 1024  # 100 MB
    MAX_DOC_UPLOAD_BYTES: int = 15 * 1024 * 1024     # 15 MB

    # Startup Seeding
    RUN_SEED_ON_START: bool = False

    # SMTP Email Settings for OTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@lms.com"
    SMTP_TLS: bool = True

    @property
    def is_production(self) -> bool:
        return (self.ENVIRONMENT or "").strip().lower() == "production"

    @property
    def allowed_origins_list(self) -> List[str]:
        configured = [o.strip().rstrip("/") for o in (self.ALLOWED_ORIGINS or "").split(",") if o.strip()]
        if configured:
            origins = list(configured)
        else:
            origins = list(_DEFAULT_PROD_ORIGINS)
        if not self.is_production:
            for dev_origin in _DEV_ORIGINS:
                if dev_origin not in origins:
                    origins.append(dev_origin)
        return origins

    def validate_production_security(self) -> None:
        """Fail fast in production if insecure default secrets or configs are active."""
        if not self.is_production:
            return
        if self.SECRET_KEY == _DEFAULT_SECRET_KEY or len(self.SECRET_KEY) < 32:
            raise RuntimeError("SECURITY ERROR: SECRET_KEY must be overridden with a >=32-char secret in production.")
        if self.REFRESH_SECRET_KEY == _DEFAULT_REFRESH_SECRET_KEY or len(self.REFRESH_SECRET_KEY) < 32:
            raise RuntimeError("SECURITY ERROR: REFRESH_SECRET_KEY must be overridden with a >=32-char secret in production.")
        if self.SECRET_KEY == self.REFRESH_SECRET_KEY:
            raise RuntimeError("SECURITY ERROR: SECRET_KEY and REFRESH_SECRET_KEY must be distinct in production.")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

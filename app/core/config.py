from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database Settings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/elearning"

    # JWT Settings
    SECRET_KEY: str = "8af675b3c4109403d159e847c219a12c85e28a07c1266e74581f1816e8db2b53"
    REFRESH_SECRET_KEY: str = "cf98ea8368593a1059f3d917f8db8c1c4e97a3014a66f7a6344f686c123ea32f"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # SMTP Email Settings for OTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@lms.com"
    SMTP_TLS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

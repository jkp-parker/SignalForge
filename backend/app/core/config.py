from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://signalforge:signalforge_dev@postgres:5432/signalforge"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ADMIN_EMAIL: str = "admin@signalforge.local"
    ADMIN_PASSWORD: str = "admin123"
    LOKI_URL: str = "http://loki:3100"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://signalforge:signalforge_dev@postgres:5432/signalforge"
    LOKI_URL: str = "http://loki:3100"
    INGESTION_INTERVAL_SECONDS: int = 30
    ISA182_ANALYSIS_INTERVAL_MINUTES: int = 60

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

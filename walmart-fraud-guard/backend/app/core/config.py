from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Walmart Fraud Guard"
    app_env: str = "development"
    api_prefix: str = "/api/v1"

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "WalmartFraudGuard"

    postgres_dsn: str = "postgresql+asyncpg://fraud_user:fraud_pass@localhost:5432/fraud_db"

    redis_url: str = "redis://localhost:6379/0"

    model_path: str = "ml/artifacts/model.pkl"
    scaler_path: str = "ml/artifacts/scaler.pkl"
    model_threshold: float = 0.75
    model_version: str = "xgb-v1"

    duplicate_ttl_seconds: int = 3600
    rate_limit_window_seconds: int = 60
    rate_limit_max_requests: int = 10

    openai_api_key: str | None = None
    llm_model_name: str = "gpt-4o-mini"
    llm_temperature: float = 0.0
    llm_max_tokens: int = 220

    drift_reference_data_path: str = str(Path(__file__).resolve().parents[4] / "fraudsummaryall.csv")
    drift_window_hours: int = 24
    drift_z_threshold: float = 3.0
    drift_min_sample_size: int = 25

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=(),
    )


settings = Settings()

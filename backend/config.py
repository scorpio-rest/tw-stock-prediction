"""Application configuration management."""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "台股實驗預測及模擬倉"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/twstock.db"

    # Google Generative AI (Gemma / Gemini)
    GOOGLE_API_KEY: str = ""
    AI_ENABLED: bool = True
    AI_MODEL: str = "gemma-4-31b-it"

    # Scheduler
    PREDICTION_INTERVAL: int = 1800  # Check for matured predictions every 30 minutes
    QUOTE_INTERVAL: int = 5

    # Portfolio
    INITIAL_CAPITAL: float = 10_000_000
    FEE_RATE: float = 0.001425
    FEE_DISCOUNT: float = 0.6
    TAX_RATE: float = 0.003
    MIN_FEE: float = 20

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), ".env"),
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()

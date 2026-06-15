"""
Configuración centralizada de la aplicación.
Lee variables de entorno y provee defaults sensatos para desarrollo.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ──
    PROJECT_NAME: str = "SDD API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ── Base de datos ──
    DATABASE_URL: str = "postgresql+asyncpg://sdd_dev:sdd_dev_2026@localhost:5432/sdd_local"

    # ── Seguridad / JWT ──
    JWT_SECRET_KEY: str = "cambia-esto-en-produccion"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── CORS ──
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    # ── IA (LiteLLM proxy) ──
    LITELLM_PROXY_URL: str = "http://localhost:4000"
    LITELLM_MASTER_KEY: str = "sk-local-dev"


@lru_cache
def get_settings() -> Settings:
    """Singleton de configuración (cacheado)."""
    return Settings()


settings = get_settings()

# Settings loader
from __future__ import annotations
import secrets
import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Get absolute path to project root
root_dir = Path(__file__).parent.parent.parent
env_path = root_dir / ".env"

# Load .env file explicitly
load_dotenv(str(env_path), override=True)

# Default absolute path to root app.db
default_db_path = root_dir / "app.db"
DEFAULT_DATABASE_URL = f"sqlite:///{default_db_path}"

class Settings(BaseSettings):
    # Database (use SQLite for dev; swap to Postgres URL in prod)
    DATABASE_URL: str = DEFAULT_DATABASE_URL

    # S3 / R2 / B2
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "inspection-reports"
    S3_ENDPOINT_URL: str | None = None  # keep None for AWS S3

    # Auth - Generate secure secret if not provided
    # In production, set this via environment variable
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # OpenAI (used by your existing scripts)
    OPENAI_API_KEY: str = ""

    # OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    APPLE_CLIENT_ID: str = ""
    APPLE_CLIENT_SECRET: str = ""
    APPLE_TEAM_ID: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "common"
    OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/portal/oauth/callback"

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = str(env_path)
        extra = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

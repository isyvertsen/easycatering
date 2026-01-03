"""Application configuration."""
import os
import secrets
from typing import List, Optional, Any, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, Field, validator


class Settings(BaseSettings):
    """Application settings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # Ignore extra environment variables
    )
    
    # Application
    APP_NAME: str = Field(default="Catering System API", env="APP_NAME")
    APP_ENV: str = Field(default="development", env="APP_ENV")
    DEBUG: bool = Field(default=False, env="DEBUG")
    API_PREFIX: str = Field(default="/api", env="API_PREFIX")
    AUTH_BYPASS: bool = Field(default=False, env="AUTH_BYPASS")
    ALLOWED_HOSTS: str = Field(default="*", env="ALLOWED_HOSTS")
    
    # Security
    SECRET_KEY: str = Field(default=None, env="SECRET_KEY")
    ALGORITHM: str = Field(default="HS256", env="ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/catering",
        env="DATABASE_URL"
    )
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=10, env="DATABASE_MAX_OVERFLOW")
    
    # CORS - Use Union to accept both string and list
    CORS_ORIGINS: Union[str, List[str]] = Field(default="http://localhost:3000")
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/google"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # ReportBro Configuration
    REPORTBRO_RUNSERVER: str = "https://www.reportbro.com/report/run"
    REPORTBRO_LABELLINKSERVER: str = "https://www.reportbro.com/report/run?OutputFormat=pdf&key="
    REPORTBRO_DEFAULTLABELID: str = ""
    REPORTBRO_APIKEY: str = ""
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # LLM Configuration
    ANYTHINGLLM_API_URL: str = "http://localhost:3001/api/v1"
    ANYTHINGLLM_API_KEY: str = ""
    ANYTHINGLLM_WORKSPACE_SLUG: str = "catering-products"
    
    # Optional: OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-3.5-turbo"

    # GitHub Integration for Feedback System
    GITHUB_TOKEN: str = Field(default="", env="GITHUB_TOKEN")
    GITHUB_REPO_BACKEND: str = Field(default="isyvertsen/LKCserver-backend", env="GITHUB_REPO_BACKEND")
    GITHUB_REPO_FRONTEND: str = Field(default="isyvertsen/LKCserver-frontend", env="GITHUB_REPO_FRONTEND")

    # Matinfo API Configuration
    MATINFO_API_KEY: str = Field(default="", env="MATINFO_API_KEY")
    MATINFO_API_URL: str = Field(default="https://api.matinfo.no/v2", env="MATINFO_API_URL")
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def ensure_cors_origins_list(cls, v: Union[str, List[str]]) -> List[str]:
        """Ensure CORS_ORIGINS is always a list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_secret_key(cls, v: Optional[str]) -> str:
        """Validate and generate SECRET_KEY if not provided."""
        if not v:
            # Generate a secure secret key if not provided
            if os.getenv("APP_ENV", "development") == "production":
                raise ValueError(
                    "SECRET_KEY must be explicitly set in production environment. "
                    "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )
            # Generate a development key
            return f"dev-{secrets.token_urlsafe(32)}"
        
        # Warn if using default development key
        if v == "development-secret-key-change-in-production":
            if os.getenv("APP_ENV", "development") == "production":
                raise ValueError(
                    "Cannot use default development SECRET_KEY in production. "
                    "Please set a secure SECRET_KEY in environment variables."
                )
        
        return v
    
    @field_validator("AUTH_BYPASS", mode="after")
    @classmethod
    def validate_auth_bypass(cls, v: bool) -> bool:
        """Ensure AUTH_BYPASS is only enabled in development."""
        if v and os.getenv("APP_ENV", "development") == "production":
            raise ValueError("AUTH_BYPASS cannot be enabled in production environment")
        return v
    
    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL is set."""
        # Basic validation - just ensure it's not empty
        # For internal pod networks, credentials in environment variables are acceptable
        if not v:
            raise ValueError("DATABASE_URL must be set")
        return v


settings = Settings()
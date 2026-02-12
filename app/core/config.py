"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database (set either DATABASE_URL or DB_* vars; DATABASE_URL takes precedence for deployment)
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "easyfoods"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    
    # Application
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS: in production set env CORS_ORIGINS to comma-separated URLs, e.g.:
    #   CORS_ORIGINS=https://your-app.vercel.app,https://vendor.vercel.app
    CORS_ORIGINS: list[str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):  # noqa: N805
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v
    
    # File uploads
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Payment Gateway Configuration: "stripe" or "helcim"
    PAYMENT_GATEWAY: str = "stripe"
    # Stripe (works embedded; no iframe blocking)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    # Helcim
    HELCIM_API_TOKEN: Optional[str] = None
    HELCIM_API_URL: str = "https://api.helcim.com/v2"
    HELCIM_TEST_MODE: bool = False  # True = sandbox/test; False = production
    
    # Google Maps API
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    # Google OAuth (for Sign in with Google on customer/vendor/chef/driver)
    GOOGLE_OAUTH_CLIENT_ID: Optional[str] = None
    
    # Debug
    DEBUG: bool = False

    # Admin/Marketing: set to False to disable public signup (invite-only)
    ADMIN_SIGNUP_ENABLED: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()


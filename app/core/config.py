"""
Application configuration settings
"""
from pydantic_settings import BaseSettings
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
    
    # CORS: in production set env CORS_ORIGINS to comma-separated frontend URLs, e.g.:
    #   CORS_ORIGINS=https://vendor.eazyfoods.ca,https://eazyfoods.ca,https://admin.eazyfoods.ca
    # Stored as str so Render/env never triggers JSON parse; use cors_origins_list in app.
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parsed CORS origins for middleware (comma-separated string -> list)."""
        if not self.CORS_ORIGINS or self.CORS_ORIGINS.strip() == "":
            return ["*"]
        return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()] or ["*"]
    
    # File uploads
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    # Return absolute image URLs when set (e.g. https://eazyfoods-api.onrender.com on Render)
    API_PUBLIC_URL: Optional[str] = None
    
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


def resolve_upload_url(url: Optional[str]) -> Optional[str]:
    """If API_PUBLIC_URL is set, return absolute URL for upload paths so frontends get working image URLs."""
    if not url or not settings.API_PUBLIC_URL:
        return url
    base = settings.API_PUBLIC_URL.rstrip("/")
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"{base}{url}" if url.startswith("/") else f"{base}/{url}"


def resolve_upload_urls(urls: Optional[list]) -> Optional[list]:
    """Resolve a list of upload paths to absolute URLs."""
    if not urls:
        return urls
    return [resolve_upload_url(u) if isinstance(u, str) else u for u in urls]


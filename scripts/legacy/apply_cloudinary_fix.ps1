# Run this from inside your local eazyfoods folder (PowerShell)

$content = @'
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
    #   CORS_ORIGINS=https://eazyfoods.ca,https://vendor.eazyfoods.ca,https://admin.eazyfoods.ca,https://marketing.eazyfoods.ca
    # Use "*" to allow all origins (allow_credentials will be False). Must include marketing.eazyfoods.ca for marketing portal.
    # Stored as str so Render/env never triggers JSON parse; use cors_origins_list in app.
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parsed CORS origins for middleware (comma-separated string -> list)."""
        raw = (self.CORS_ORIGINS or "").strip()
        if not raw or raw == "*":
            return ["*"]
        origins = [x.strip() for x in raw.split(",") if x.strip()]
        return origins if origins else ["*"]
    
    # File uploads
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    # Return absolute image URLs when set (e.g. https://eazyfoods-api.onrender.com on Render)
    API_PUBLIC_URL: Optional[str] = None

    # S3 (optional - when set, uploads go to S3 instead of local disk)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: Optional[str] = None
    # Custom domain/CDN URL for S3 (optional). If not set, uses bucket URL.
    S3_PUBLIC_URL: Optional[str] = None

    # Cloudinary (optional - when set, uploads go to Cloudinary instead of S3/local disk)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Payment Gateway Configuration: "stripe" or "helcim"
    PAYMENT_GATEWAY: str = "stripe"
    # Stripe (works embedded; no iframe blocking)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    # Stripe Connect: webhook secret for payment_intent.succeeded (create transfers)
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    # Portal base URLs for Connect return/refresh (optional)
    VENDOR_PORTAL_BASE_URL: Optional[str] = None
    CHEF_PORTAL_BASE_URL: Optional[str] = None
    DRIVER_PORTAL_BASE_URL: Optional[str] = None
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

    # Email (for password reset, etc.). If not set, reset links are logged only.
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    # Base URL for customer password reset link (e.g. https://eazyfoods.ca or http://localhost:5173)
    CUSTOMER_RESET_PASSWORD_BASE_URL: Optional[str] = None

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


'@
Set-Content -Path "app/core/config.py" -Value $content -NoNewline

$content = @'
"""
Cloudinary storage service for file uploads.
When CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are
set, uploads go to Cloudinary instead of S3 or local disk.
"""
from app.core.config import settings

_configured = False


def _ensure_configured():
    """Lazy-configure the cloudinary SDK with our credentials."""
    global _configured
    if not _configured:
        import cloudinary
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        _configured = True


def is_cloudinary_configured() -> bool:
    """Return True if Cloudinary should be used for uploads."""
    return bool(
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    )


def upload_to_cloudinary(
    content: bytes,
    key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload bytes to Cloudinary. Returns the public HTTPS URL.
    key: path/public_id within Cloudinary (e.g. "products/xxx.jpg", "ads/yyy.mp4")
    """
    _ensure_configured()
    import cloudinary.uploader

    # Cloudinary wants a public_id without the file extension, and a
    # resource_type of "video" for video content, "image" otherwise.
    public_id = key.rsplit(".", 1)[0]
    resource_type = "video" if content_type.startswith("video/") else "image"
    # "raw" lets PDFs and other non-image/video docs upload correctly.
    if not content_type.startswith("image/") and not content_type.startswith("video/"):
        resource_type = "raw"

    result = cloudinary.uploader.upload(
        content,
        public_id=public_id,
        resource_type=resource_type,
        overwrite=True,
    )
    return result["secure_url"]

'@
Set-Content -Path "app/core/cloudinary_storage.py" -Value $content -NoNewline

$content = @'
"""
File upload endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.dependencies import get_current_vendor, get_current_chef, get_current_admin, get_current_driver
from app.core.config import settings
from app.core.s3 import is_s3_configured, upload_to_s3
from app.core.cloudinary_storage import is_cloudinary_configured, upload_to_cloudinary
import os
import uuid
from pathlib import Path
from typing import List

router = APIRouter()


def _upload_url(path: str) -> str:
    """Return absolute URL when API_PUBLIC_URL set, else relative path."""
    base = (settings.API_PUBLIC_URL or "").rstrip("/")
    return f"{base}{path}" if base else path


def _save_file(
    content: bytes,
    folder: str,
    unique_filename: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Save to Cloudinary if configured, else S3 if configured, else local disk. Returns the URL to use."""
    if is_cloudinary_configured():
        key = f"{folder}/{unique_filename}"
        return upload_to_cloudinary(content, key, content_type)
    if is_s3_configured():
        key = f"{folder}/{unique_filename}"
        return upload_to_s3(content, key, content_type)
    # Local disk
    base = UPLOAD_BASE_DIR / folder
    base.mkdir(parents=True, exist_ok=True)
    path = base / unique_filename
    with open(path, "wb") as f:
        f.write(content)
    return _upload_url(f"/api/v1/uploads/{folder}/{unique_filename}")


# Create upload directories if they don't exist
UPLOAD_BASE_DIR = Path(settings.UPLOAD_DIR)
PRODUCT_UPLOAD_DIR = UPLOAD_BASE_DIR / "products"
PRODUCT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ADS_UPLOAD_DIR = UPLOAD_BASE_DIR / "ads"
ADS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RECIPES_UPLOAD_DIR = UPLOAD_BASE_DIR / "recipes"
RECIPES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/products", response_model=dict)
async def upload_product_image(
    file: UploadFile = File(...),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Upload a product image"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    try:
        file_url = _save_file(file_content, "products", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    return {
        "url": file_url,
        "filename": unique_filename,
        "size": len(file_content)
    }


@router.post("/products/multiple", response_model=dict)
async def upload_multiple_product_images(
    files: List[UploadFile] = File(...),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Upload multiple product images"""
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 files allowed per upload"
        )
    
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    uploaded_files = []
    
    for file in files:
        # Validate file type
        if file.content_type not in allowed_types:
            continue  # Skip invalid files
        
        # Read file
        file_content = await file.read()
        
        # Validate file size
        if len(file_content) > settings.MAX_UPLOAD_SIZE:
            continue  # Skip oversized files
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix or ".jpg"
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        try:
            file_url = _save_file(file_content, "products", unique_filename, file.content_type)
            uploaded_files.append({
                "url": file_url,
                "filename": unique_filename,
                "size": len(file_content)
            })
        except Exception as e:
            continue  # Skip files that fail to save
    
    return {
        "files": uploaded_files,
        "count": len(uploaded_files)
    }


@router.get("/products/{filename}")
async def get_uploaded_image(filename: str):
    """Serve uploaded product images"""
    file_path = PRODUCT_UPLOAD_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg"  # Default, browser will handle actual type
    )


@router.post("/ads", response_model=dict)
async def upload_ad_media(
    file: UploadFile = File(...),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Upload an ad image or video"""
    # Validate file type - allow images and videos
    allowed_image_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    allowed_video_types = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"]
    allowed_types = allowed_image_types + allowed_video_types
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: images (JPEG, PNG, WebP, GIF) or videos (MP4, WebM, OGG, QuickTime)"
        )
    
    # Validate file size (50MB max for videos, 10MB for images)
    file_content = await file.read()
    max_size = 50 * 1024 * 1024 if file.content_type in allowed_video_types else settings.MAX_UPLOAD_SIZE
    
    if len(file_content) > max_size:
        max_size_mb = max_size / (1024*1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {max_size_mb}MB"
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix or (".mp4" if file.content_type in allowed_video_types else ".jpg")
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    try:
        file_url = _save_file(file_content, "ads", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    return {
        "url": file_url,
        "filename": unique_filename,
        "size": len(file_content),
        "type": "video" if file.content_type in allowed_video_types else "image"
    }


@router.get("/ads/{filename}")
async def get_uploaded_ad_media(filename: str):
    """Serve uploaded ad images or videos"""
    file_path = ADS_UPLOAD_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Determine media type from extension
    ext = Path(filename).suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
        ".mov": "video/quicktime"
    }
    media_type = media_type_map.get(ext, "application/octet-stream")
    
    return FileResponse(
        path=str(file_path),
        media_type=media_type
    )


@router.post("/recipes", response_model=dict)
async def upload_recipe_image(
    file: UploadFile = File(...),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Upload a recipe image (admin/marketing only)"""
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    try:
        file_url = _save_file(file_content, "recipes", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    return {
        "url": file_url,
        "image_url": file_url,
        "filename": unique_filename,
        "size": len(file_content)
    }


@router.get("/recipes/{filename}")
async def get_recipe_image(filename: str):
    """Serve uploaded recipe images"""
    file_path = RECIPES_UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(path=str(file_path), media_type="image/jpeg")


# Create chef upload directory
CHEF_UPLOAD_DIR = UPLOAD_BASE_DIR / "chefs"
CHEF_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Vendor profile images
VENDOR_PROFILE_DIR = UPLOAD_BASE_DIR / "vendor_profile"
VENDOR_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

# Driver documents (signup - no auth required)
DRIVER_DOCS_DIR = UPLOAD_BASE_DIR / "driver_documents"
DRIVER_DOCS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/image", response_model=dict)
@router.post("/chefs", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Upload a generic image (for chefs) - supports both /image and /chefs endpoints"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    try:
        file_url = _save_file(file_content, "chefs", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    return {
        "url": file_url,
        "image_url": file_url,  # Alternative key for compatibility
        "filename": unique_filename,
        "size": len(file_content)
    }


@router.post("/chef-gallery", response_model=dict)
async def upload_chef_gallery(
    file: UploadFile = File(...),
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Upload a chef gallery image (saved under chef-gallery folder)."""
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
        )
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    try:
        file_url = _save_file(file_content, "chef-gallery", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    return {
        "url": file_url,
        "image_url": file_url,
        "filename": unique_filename,
        "size": len(file_content)
    }


@router.post("/vendor-profile", response_model=dict)
async def upload_vendor_profile_image(
    file: UploadFile = File(...),
    current_vendor: dict = Depends(get_current_vendor),
):
    """Upload vendor/store profile image."""
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
        )
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB",
        )
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    try:
        file_url = _save_file(file_content, "vendor_profile", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )
    return {"url": file_url, "filename": unique_filename, "size": len(file_content)}


@router.post("/driver-documents", response_model=dict)
async def upload_driver_document(
    file: UploadFile = File(...),
):
    """Upload driver licence, insurance, or vehicle registration during signup. No auth required."""
    allowed_types = [
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
        "application/pdf"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF",
        )
    file_content = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum 5MB.",
        )
    file_ext = Path(file.filename).suffix or ".pdf"
    if file_ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"):
        file_ext = ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    try:
        file_url = _save_file(file_content, "driver_documents", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )
    return {"url": file_url, "filename": unique_filename, "size": len(file_content)}


@router.post("/delivery-proof", response_model=dict)
async def upload_delivery_proof(
    file: UploadFile = File(...),
    current_driver: dict = Depends(get_current_driver),
):
    """Upload proof-of-delivery photo (driver only). Returns URL to pass when marking delivery as delivered."""
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF",
        )
    file_content = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum 5MB.",
        )
    file_ext = Path(file.filename).suffix or ".jpg"
    if file_ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        file_ext = ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    try:
        file_url = _save_file(file_content, "delivery_proof", unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}",
        )
    return {"url": file_url, "filename": unique_filename, "size": len(file_content)}


BUSINESS_DOCS_DIR = UPLOAD_BASE_DIR / "business_documents"
BUSINESS_DOCS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/vendor-documents", response_model=dict)
async def upload_vendor_document(file: UploadFile = File(...)):
    """Upload vendor license/document during signup. No auth required."""
    return await _upload_business_document(file, "business_documents")


@router.post("/chef-documents", response_model=dict)
async def upload_chef_document(file: UploadFile = File(...)):
    """Upload chef license/document during signup. No auth required."""
    return await _upload_business_document(file, "business_documents")


async def _upload_business_document(file: UploadFile, folder: str) -> dict:
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF")
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")
    file_ext = Path(file.filename).suffix or ".pdf"
    if file_ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"):
        file_ext = ".pdf"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    try:
        file_url = _save_file(file_content, folder, unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save file")
    return {"url": file_url, "filename": unique_filename, "size": len(file_content)}


@router.get("/vendor_profile/{filename}")
async def get_vendor_profile_image(filename: str):
    """Serve uploaded vendor profile images"""
    file_path = VENDOR_PROFILE_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(file_path), media_type="image/jpeg")


@router.get("/chefs/{filename}")
async def get_chef_uploaded_image(filename: str):
    """Serve uploaded chef images"""
    file_path = CHEF_UPLOAD_DIR / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg"  # Default, browser will handle actual type
    )


'@
Set-Content -Path "app/api/v1/endpoints/upload.py" -Value $content -NoNewline

$content = @'
psycopg2-binary>=2.9.9
pg8000>=1.30.0
python-dotenv>=1.0.0
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sqlalchemy>=2.0.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
email-validator>=2.0.0
stripe>=7.0.0
httpx>=0.24.0
boto3>=1.28.0
cloudinary>=1.40.0



'@
Set-Content -Path "requirements.txt" -Value $content -NoNewline

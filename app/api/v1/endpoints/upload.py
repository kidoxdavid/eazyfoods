"""
File upload endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.dependencies import get_current_vendor, get_current_chef, get_current_admin
from app.core.config import settings
from app.core.s3 import is_s3_configured, upload_to_s3
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
    """Save to S3 if configured, else local disk. Returns the URL to use."""
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


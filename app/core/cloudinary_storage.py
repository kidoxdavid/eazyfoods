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

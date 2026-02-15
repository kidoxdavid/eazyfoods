"""
S3 storage service for file uploads.
When AWS credentials and S3_BUCKET_NAME are set, uploads go to S3 instead of local disk.
"""
from app.core.config import settings
from typing import Optional

_client = None


def _get_client():
    """Lazy-init boto3 S3 client."""
    global _client
    if _client is None:
        import boto3
        _client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
    return _client


def is_s3_configured() -> bool:
    """Return True if S3 should be used for uploads."""
    return bool(
        settings.AWS_ACCESS_KEY_ID
        and settings.AWS_SECRET_ACCESS_KEY
        and settings.S3_BUCKET_NAME
    )


def upload_to_s3(
    content: bytes,
    key: str,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload bytes to S3. Returns the public URL.
    key: path within bucket (e.g. "products/xxx.jpg", "ads/yyy.mp4")
    """
    client = _get_client()
    bucket = settings.S3_BUCKET_NAME
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=content,
        ContentType=content_type,
    )

    # Build public URL
    if settings.S3_PUBLIC_URL:
        base = settings.S3_PUBLIC_URL.rstrip("/")
        return f"{base}/{key}"
    # Default S3 public URL format (bucket must have public read policy)
    return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

"""
Public config endpoints (no auth) for signup and other client needs.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.platform_settings import PlatformSettings

router = APIRouter()


@router.get("/signup-documentation")
async def get_signup_documentation_config(db: Session = Depends(get_db)):
    """
    Public config for vendor/driver/chef signup: whether documents are required.
    Used by signup pages to show/hide or enforce document upload.
    """
    row = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "documentation"
    ).first()
    data = (row.settings_data if row and row.settings_data else {}) or {}
    return {
        "require_vendor_docs": bool(data.get("require_vendor_docs", True)),
        "require_driver_docs": bool(data.get("require_driver_docs", True)),
        "require_chef_docs": bool(data.get("require_chef_docs", True)),
    }

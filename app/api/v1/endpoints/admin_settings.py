"""
Admin settings endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.platform_settings import PlatformSettings
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


class SettingsUpdate(BaseModel):
    settings: dict


@router.get("/settings/{setting_type}")
async def get_settings(
    setting_type: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get platform settings by type"""
    settings = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == setting_type
    ).first()
    
    if settings:
        return {
            "setting_type": settings.setting_type,
            "settings": settings.settings_data,
            "updated_at": settings.updated_at.isoformat() if settings.updated_at else None
        }
    
    # Return default settings if not found
    defaults = get_default_settings(setting_type)
    return {
        "setting_type": setting_type,
        "settings": defaults,
        "updated_at": None
    }


@router.put("/settings/{setting_type}")
async def update_settings(
    setting_type: str,
    settings_update: SettingsUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update platform settings by type"""
    admin_id = UUID(current_admin["admin_id"])
    
    # Validate setting type
    valid_types = ['general', 'commission', 'orders', 'payment', 'notifications', 'security', 'vendor', 'customer']
    if setting_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid setting type. Must be one of: {', '.join(valid_types)}")
    
    # Get or create settings record
    settings = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == setting_type
    ).first()
    
    if settings:
        settings.settings_data = settings_update.settings
        settings.updated_by = admin_id
        settings.updated_at = datetime.utcnow()
    else:
        settings = PlatformSettings(
            setting_type=setting_type,
            settings_data=settings_update.settings,
            updated_by=admin_id
        )
        db.add(settings)
    
    db.commit()
    db.refresh(settings)
    
    return {
        "message": f"{setting_type} settings updated successfully",
        "setting_type": settings.setting_type,
        "updated_at": settings.updated_at.isoformat()
    }


@router.get("/settings")
async def get_all_settings(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all platform settings"""
    all_settings = db.query(PlatformSettings).all()
    
    result = {}
    for setting in all_settings:
        result[setting.setting_type] = {
            "settings": setting.settings_data,
            "updated_at": setting.updated_at.isoformat() if setting.updated_at else None
        }
    
    # Include defaults for missing types
    valid_types = ['general', 'commission', 'orders', 'payment', 'notifications', 'security', 'vendor', 'customer']
    for setting_type in valid_types:
        if setting_type not in result:
            result[setting_type] = {
                "settings": get_default_settings(setting_type),
                "updated_at": None
            }
    
    return result


def get_default_settings(setting_type: str) -> dict:
    """Get default settings for a setting type"""
    defaults = {
        'general': {
            'platform_name': 'EAZy Foods',
            'platform_email': 'support@eazyfoods.com',
            'platform_phone': '+1 (555) 123-4567',
            'timezone': 'America/New_York',
            'currency': 'USD',
            'language': 'en',
            'maintenance_mode': False
        },
        'commission': {
            'default_commission_rate': 15,
            'min_commission_rate': 5,
            'max_commission_rate': 30,
            'commission_calculation': 'percentage'
        },
        'orders': {
            'min_order_amount': 10,
            'max_order_amount': 1000,
            'delivery_fee': 5.99,
            'free_delivery_threshold': 50,
            'order_timeout_minutes': 30,
            'auto_cancel_unpaid_hours': 24,
            'allow_order_modifications': True
        },
        'payment': {
            'payment_methods': ['credit_card', 'debit_card'],
            'helcim_enabled': True,
            'require_payment_verification': True,
            'refund_policy_days': 30,
            'payments_suspended': False
        },
        'notifications': {
            'email_notifications': True,
            'sms_notifications': False,
            'order_notifications': True,
            'vendor_notifications': True,
            'customer_notifications': True,
            'admin_notifications': True
        },
        'security': {
            'require_email_verification': True,
            'require_phone_verification': False,
            'password_min_length': 8,
            'session_timeout_minutes': 60,
            'two_factor_auth': False,
            'ip_whitelist': ''
        },
        'vendor': {
            'auto_approve_vendors': False,
            'require_verification': True,
            'min_products_to_go_live': 5,
            'allow_promotions': True,
            'promotion_approval_required': True
        },
        'customer': {
            'allow_guest_checkout': True,
            'require_account_for_orders': False,
            'loyalty_points_enabled': False,
            'points_per_dollar': 1,
            'referral_bonus': 10
        }
    }
    
    return defaults.get(setting_type, {})


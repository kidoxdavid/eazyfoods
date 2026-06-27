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
    valid_types = ['general', 'commission', 'pricing', 'orders', 'payment', 'notifications', 'security', 'vendor', 'customer', 'ad', 'documentation', 'marketing_occasions']
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
    valid_types = ['general', 'commission', 'pricing', 'orders', 'payment', 'notifications', 'security', 'vendor', 'customer', 'ad', 'documentation', 'marketing_occasions']
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
            'platform_email': 'support@eazyfoods.ca',
            'platform_phone': '+1 (555) 123-4567',
            'timezone': 'America/New_York',
            'currency': 'USD',
            'language': 'en',
            'maintenance_mode': False
        },
        'commission': {
            'fee_type': 'commission',
            'default_commission_rate': 15,
            'min_commission_rate': 5,
            'max_commission_rate': 30,
            'commission_calculation': 'percentage',
            'service_fee_amount': 0,
            'service_fee_percent': 0
        },
        'pricing': {
            'chef_markup_percent': 0,
            'vendor_markup_percent': 0
        },
        'orders': {
            'min_order_amount': 10,
            'max_order_amount': 1000,
            'delivery_fee': 5.99,
            'delivery_fee_per_km': 1.0,
            'use_distance_based_delivery': False,
            'delivery_fee_type': 'flat',
            'dynamic_base_fee': 3.0,
            'dynamic_distance_tiers': [
                {'max_km': 3, 'rate_per_km': 0.80},
                {'max_km': 8, 'rate_per_km': 0.55},
                {'rate_per_km': 0.40}
            ],
            'dynamic_traffic_multipliers': {'normal': 1.0, 'moderate': 1.2, 'heavy': 1.5},
            'dynamic_current_traffic': 'normal',
            'dynamic_demand_multipliers': {'low': 1.0, 'busy': 1.15, 'peak': 1.35},
            'dynamic_current_demand': 'low',
            'dynamic_small_order_threshold': 15.0,
            'dynamic_small_order_fee': 2.0,
            'free_delivery_threshold': 50,
            'order_timeout_minutes': 30,
            'auto_cancel_unpaid_hours': 24,
            'allow_order_modifications': True,
            'driver_earnings_percent': 80
        },
        'payment': {
            'payment_methods': ['credit_card', 'debit_card'],
            'helcim_enabled': True,
            'require_payment_verification': True,
            'refund_policy_days': 30,
            'payments_suspended': False,
            'suspend_vendor_ad_payments': False,
            'suspend_chef_ad_payments': False
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
        },
        'documentation': {
            'require_vendor_docs': True,
            'require_driver_docs': True,
            'require_chef_docs': True
        },
        'ad': {
            'placement_pricing': {
                'home_top_banner': {'day': 8, 'week': 35, '2weeks': 65, 'month': 120},
                'home_bottom_banner': {'day': 5, 'week': 22, '2weeks': 40, 'month': 75},
                'top_market_deals_top_banner': {'day': 6, 'week': 28, '2weeks': 52, 'month': 95},
                'top_market_deals_bottom_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'top_chef_deals_top_banner': {'day': 6, 'week': 28, '2weeks': 52, 'month': 95},
                'top_chef_deals_bottom_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'products_top_banner': {'day': 5, 'week': 22, '2weeks': 40, 'month': 75},
                'products_bottom_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'stores_top_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'chefs_top_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'meals_top_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'cart_top_banner': {'day': 5, 'week': 22, '2weeks': 40, 'month': 75},
                'orders_top_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'profile_top_banner': {'day': 4, 'week': 18, '2weeks': 32, 'month': 60},
                'about_top_banner': {'day': 3, 'week': 12, '2weeks': 22, 'month': 45},
                'contact_top_banner': {'day': 3, 'week': 12, '2weeks': 22, 'month': 45},
                'become_a_driver_top_banner': {'day': 3, 'week': 12, '2weeks': 22, 'month': 45}
            }
        }
    }
    
    return defaults.get(setting_type, {})


"""
Admin superior control endpoints for marketing
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.marketing import (
    Campaign, Ad, EmailCampaign, Audience, ABTest, SocialMediaPost,
    Notification, AutomationWorkflow, MarketingBudget
)
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel

router = APIRouter()


# Admin Override Schemas
class MarketingSettingsUpdate(BaseModel):
    auto_approve_vendor_ads: Optional[bool] = None
    auto_approve_chef_ads: Optional[bool] = None
    require_approval_for_campaigns: Optional[bool] = None
    require_approval_for_budgets: Optional[bool] = None
    max_budget_per_campaign: Optional[float] = None
    max_daily_notifications: Optional[int] = None
    max_daily_emails: Optional[int] = None
    max_daily_sms: Optional[int] = None


@router.get("/overview", response_model=dict)
async def get_marketing_overview(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive marketing overview for admin"""
    # Check if admin has marketing admin role
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied. Marketing admin role required.")
    
    # Get all marketing stats
    total_campaigns = db.query(func.count(Campaign.id)).scalar() or 0
    active_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.status == "active").scalar() or 0
    pending_campaigns = db.query(func.count(Campaign.id)).filter(Campaign.status == "pending").scalar() or 0
    
    total_ads = db.query(func.count(Ad.id)).scalar() or 0
    pending_ads = db.query(func.count(Ad.id)).filter(Ad.approval_status == "pending").scalar() or 0
    
    total_budgets = db.query(func.count(MarketingBudget.id)).scalar() or 0
    total_budget_amount = db.query(func.sum(MarketingBudget.total_budget)).scalar() or 0
    total_spent = db.query(func.sum(MarketingBudget.spent)).scalar() or 0
    
    total_automation = db.query(func.count(AutomationWorkflow.id)).scalar() or 0
    active_automation = db.query(func.count(AutomationWorkflow.id)).filter(AutomationWorkflow.status == "active").scalar() or 0
    
    return {
        "campaigns": {
            "total": total_campaigns,
            "active": active_campaigns,
            "pending": pending_campaigns
        },
        "ads": {
            "total": total_ads,
            "pending_approval": pending_ads
        },
        "budgets": {
            "total": total_budgets,
            "total_amount": float(total_budget_amount) if total_budget_amount else 0,
            "total_spent": float(total_spent) if total_spent else 0,
            "remaining": float(total_budget_amount - total_spent) if total_budget_amount and total_spent else 0
        },
        "automation": {
            "total": total_automation,
            "active": active_automation
        }
    }


@router.get("/pending-approvals", response_model=dict)
async def get_pending_approvals(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all items pending admin approval"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get pending ads
    pending_ads = db.query(Ad).filter(
        Ad.approval_status == "pending"
    ).order_by(Ad.created_at.desc()).limit(50).all()
    
    # Get pending campaigns
    pending_campaigns = db.query(Campaign).filter(
        Campaign.status == "pending"
    ).order_by(Campaign.created_at.desc()).limit(50).all()
    
    # Get pending budgets
    pending_budgets = db.query(MarketingBudget).filter(
        MarketingBudget.status == "pending"
    ).order_by(MarketingBudget.created_at.desc()).limit(50).all()
    
    return {
        "ads": [
            {
                "id": str(ad.id),
                "name": ad.name,
                "created_by_type": ad.created_by_type,
                "created_at": ad.created_at.isoformat(),
                "vendor_id": str(ad.vendor_id) if ad.vendor_id else None,
                "chef_id": str(ad.chef_id) if ad.chef_id else None
            }
            for ad in pending_ads
        ],
        "campaigns": [
            {
                "id": str(campaign.id),
                "name": campaign.name,
                "budget": float(campaign.budget) if campaign.budget else 0,
                "created_at": campaign.created_at.isoformat()
            }
            for campaign in pending_campaigns
        ],
        "budgets": [
            {
                "id": str(budget.id),
                "name": budget.name,
                "total_budget": float(budget.total_budget),
                "created_at": budget.created_at.isoformat()
            }
            for budget in pending_budgets
        ]
    }


@router.put("/ads/{ad_id}/admin-approve", response_model=dict)
async def admin_approve_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force approve any ad"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can force approve")
    
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    ad.approval_status = "approved"
    ad.status = "active"
    ad.approved_by = UUID(current_admin["admin_id"])
    ad.approved_at = datetime.utcnow()
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad approved by admin override", "ad_id": str(ad.id)}


@router.put("/ads/{ad_id}/admin-reject", response_model=dict)
async def admin_reject_ad(
    ad_id: str,
    reason: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force reject any ad"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can force reject")
    
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    ad.approval_status = "rejected"
    ad.status = "paused"
    ad.approved_by = UUID(current_admin["admin_id"])
    ad.approved_at = datetime.utcnow()
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad rejected by admin override", "ad_id": str(ad.id), "reason": reason}


@router.put("/campaigns/{campaign_id}/admin-approve", response_model=dict)
async def admin_approve_campaign(
    campaign_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force approve any campaign"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can force approve")
    
    campaign = db.query(Campaign).filter(Campaign.id == UUID(campaign_id)).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "active"
    campaign.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Campaign approved by admin override", "campaign_id": str(campaign.id)}


@router.put("/campaigns/{campaign_id}/admin-pause", response_model=dict)
async def admin_pause_campaign(
    campaign_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force pause any campaign"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can force pause")
    
    campaign = db.query(Campaign).filter(Campaign.id == UUID(campaign_id)).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "paused"
    campaign.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Campaign paused by admin override", "campaign_id": str(campaign.id)}


@router.delete("/campaigns/{campaign_id}/admin-delete", response_model=dict)
async def admin_delete_campaign(
    campaign_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Delete any campaign"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can delete campaigns")
    
    campaign = db.query(Campaign).filter(Campaign.id == UUID(campaign_id)).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    db.delete(campaign)
    db.commit()
    
    return {"message": "Campaign deleted by admin override", "campaign_id": str(campaign_id)}


@router.get("/all-campaigns", response_model=dict)
async def get_all_campaigns(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all campaigns (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(Campaign)
    if status_filter:
        query = query.filter(Campaign.status == status_filter)
    
    campaigns = query.order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    total = query.count()
    
    return {
        "campaigns": [
            {
                "id": str(c.id),
                "name": c.name,
                "status": c.status,
                "budget": float(c.budget) if c.budget else 0,
                "created_at": c.created_at.isoformat(),
                "created_by": str(c.created_by) if c.created_by else None
            }
            for c in campaigns
        ],
        "total": total
    }


@router.get("/all-ads", response_model=dict)
async def get_all_ads(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    approval_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all ads (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(Ad)
    if status_filter:
        query = query.filter(Ad.status == status_filter)
    if approval_filter:
        query = query.filter(Ad.approval_status == approval_filter)
    
    ads = query.order_by(desc(Ad.created_at)).offset(skip).limit(limit).all()
    total = query.count()
    
    return {
        "ads": [
            {
                "id": str(a.id),
                "name": a.name,
                "status": a.status,
                "approval_status": a.approval_status,
                "ad_type": a.ad_type,
                "created_at": a.created_at.isoformat(),
                "created_by_type": a.created_by_type,
                "vendor_id": str(a.vendor_id) if a.vendor_id else None
            }
            for a in ads
        ],
        "total": total
    }


@router.put("/ads/{ad_id}/admin-pause", response_model=dict)
async def admin_pause_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force pause any ad"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can pause ads")
    
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    ad.status = "paused"
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad paused by admin override", "ad_id": str(ad.id)}


@router.put("/ads/{ad_id}/admin-activate", response_model=dict)
async def admin_activate_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force activate any ad"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can activate ads")
    
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    ad.status = "active"
    ad.approval_status = "approved"
    ad.approved_by = UUID(current_admin["admin_id"])
    ad.approved_at = datetime.utcnow()
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad activated by admin override", "ad_id": str(ad.id)}


@router.delete("/ads/{ad_id}/admin-delete", response_model=dict)
async def admin_delete_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Delete any ad"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can delete ads")
    
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    db.delete(ad)
    db.commit()
    
    return {"message": "Ad deleted by admin override", "ad_id": str(ad_id)}


@router.put("/campaigns/{campaign_id}/admin-activate", response_model=dict)
async def admin_activate_campaign(
    campaign_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin override: Force activate any campaign"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only super admins can activate campaigns")
    
    campaign = db.query(Campaign).filter(Campaign.id == UUID(campaign_id)).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign.status = "active"
    campaign.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Campaign activated by admin override", "campaign_id": str(campaign.id)}


@router.get("/all-activities", response_model=dict)
async def get_all_marketing_activities(
    skip: int = 0,
    limit: int = 100,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all marketing activities across all users (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can view all activities")
    
    activities = []
    
    # Get all campaigns
    campaign_query = db.query(Campaign)
    if date_from:
        campaign_query = campaign_query.filter(Campaign.created_at >= date_from)
    if date_to:
        campaign_query = campaign_query.filter(Campaign.created_at <= date_to)
    
    campaigns = campaign_query.order_by(desc(Campaign.created_at)).offset(skip).limit(limit).all()
    
    for campaign in campaigns:
        activities.append({
            "type": "campaign",
            "id": str(campaign.id),
            "name": campaign.name,
            "status": campaign.status,
            "created_at": campaign.created_at.isoformat()
        })
    
    return {
        "activities": activities,
        "total": len(activities)
    }


@router.get("/settings", response_model=dict)
async def get_marketing_settings(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get marketing settings (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Fetch from database
    from app.models.platform_settings import PlatformSettings
    settings_record = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "marketing"
    ).first()
    
    if settings_record and settings_record.settings_data:
        return settings_record.settings_data
    
    # Return default settings if not found
    defaults = {
        "auto_approve_vendor_ads": False,
        "auto_approve_chef_ads": False,
        "require_approval_for_campaigns": True,
        "require_approval_for_budgets": True,
        "max_budget_per_campaign": 100000.0,
        "max_daily_notifications": 10000,
        "max_daily_emails": 10000,
        "max_daily_sms": 5000
    }
    return defaults


@router.put("/settings", response_model=dict)
async def update_marketing_settings(
    settings: MarketingSettingsUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update marketing settings (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update settings")
    
    from app.models.platform_settings import PlatformSettings
    from uuid import UUID
    
    admin_id = UUID(current_admin["admin_id"])
    
    # Get existing settings or create new
    settings_record = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "marketing"
    ).first()
    
    # Get current settings data or defaults
    current_data = {}
    if settings_record and settings_record.settings_data:
        current_data = settings_record.settings_data
    
    # Merge new settings with existing
    updated_data = {**current_data, **settings.model_dump(exclude_unset=True)}
    
    if settings_record:
        settings_record.settings_data = updated_data
        settings_record.updated_by = admin_id
        settings_record.updated_at = datetime.utcnow()
    else:
        settings_record = PlatformSettings(
            setting_type="marketing",
            settings_data=updated_data,
            updated_by=admin_id
        )
        db.add(settings_record)
    
    db.commit()
    db.refresh(settings_record)
    
    return {
        "message": "Settings updated successfully",
        "settings": settings_record.settings_data
    }


@router.get("/analytics-settings", response_model=dict)
async def get_analytics_settings(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get analytics settings (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from app.models.platform_settings import PlatformSettings
    settings_record = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "marketing_analytics"
    ).first()
    
    if settings_record and settings_record.settings_data:
        return settings_record.settings_data
    
    # Return default settings
    return {}


@router.put("/analytics-settings", response_model=dict)
async def update_analytics_settings(
    settings_data: dict,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update analytics settings (admin only)"""
    admin_role = current_admin.get("role", "")
    if admin_role not in ["admin", "super_admin", "marketing"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    from app.models.platform_settings import PlatformSettings
    from uuid import UUID
    
    admin_id = UUID(current_admin["admin_id"])
    
    settings_record = db.query(PlatformSettings).filter(
        PlatformSettings.setting_type == "marketing_analytics"
    ).first()
    
    if settings_record:
        settings_record.settings_data = settings_data
        settings_record.updated_by = admin_id
        settings_record.updated_at = datetime.utcnow()
    else:
        settings_record = PlatformSettings(
            setting_type="marketing_analytics",
            settings_data=settings_data,
            updated_by=admin_id
        )
        db.add(settings_record)
    
    db.commit()
    db.refresh(settings_record)
    
    return {
        "message": "Analytics settings updated successfully",
        "settings": settings_record.settings_data
    }


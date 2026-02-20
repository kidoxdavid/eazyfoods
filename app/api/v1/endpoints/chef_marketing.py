"""
Chef marketing endpoints - chefs can create ads that require marketing approval
"""
import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.core.config import settings
from app.models.marketing import Ad, Campaign
from app.models.platform_settings import PlatformSettings
from app.api.v1.dependencies import get_current_chef
from pydantic import BaseModel

router = APIRouter()


def _chef_ad_payments_suspended(db: Session) -> bool:
    ps = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "payment").first()
    data = (ps.settings_data or {}) if ps else {}
    return bool(data.get("suspend_chef_ad_payments"))


class ChefAdCreate(BaseModel):
    campaign_id: Optional[str] = None
    name: str
    ad_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    design_data: Optional[dict] = None
    placement: str
    priority: Optional[int] = 0
    target_audience: Optional[dict] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    slideshow_duration: Optional[int] = 5
    transition_style: Optional[str] = 'fade'
    ad_duration: Optional[str] = None  # day, week, 2weeks, month
    ad_cost: Optional[float] = None
    payment_intent_id: Optional[str] = None


def _get_ad_placement_pricing(db: Session) -> dict:
    ps = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "ad").first()
    data = (ps.settings_data or {}) if ps else {}
    return data.get("placement_pricing") or {}


@router.get("/config", response_model=dict)
async def get_chef_marketing_config(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Return config for chef marketing (ad payments suspended, placement pricing)."""
    suspended = _chef_ad_payments_suspended(db)
    placement_pricing = _get_ad_placement_pricing(db)
    return {
        "ad_payments_suspended": suspended,
        "ad_placement_pricing": placement_pricing,
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY or "",
    }


class CreateAdPaymentIntentRequest(BaseModel):
    amount: float  # Ad cost in dollars (e.g. 25.00)


@router.post("/create-ad-payment-intent", response_model=dict)
async def create_chef_ad_payment_intent(
    body: CreateAdPaymentIntentRequest,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db),
):
    """Create a Stripe PaymentIntent for ad payment. Returns client_secret for Stripe Elements."""
    if _chef_ad_payments_suspended(db):
        raise HTTPException(status_code=400, detail="Ad payments are suspended; no payment required.")
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured. Please contact support.")
    amount_cents = int(round(float(body.amount) * 100))
    if amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="cad",
            automatic_payment_methods={"enabled": True},
        )
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
        }
    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(getattr(e, "user_message", None) or str(e)))


@router.get("/ads", response_model=List[dict])
async def get_chef_ads(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get all ads for the current chef"""
    try:
        chef_id = UUID(current_chef["chef_id"])
        
        ads = db.query(Ad).filter(
            Ad.chef_id == chef_id
        ).order_by(Ad.created_at.desc()).all()
        
    except Exception as e:
        print(f"Error fetching chef ads: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching ads: {str(e)}")
    
    return [
        {
            "id": str(ad.id),
            "campaign_id": str(ad.campaign_id) if ad.campaign_id else None,
            "name": ad.name,
            "ad_type": ad.ad_type,
            "status": ad.status,
            "approval_status": ad.approval_status,
            "title": ad.title,
            "description": ad.description,
            "image_url": ad.image_url,
            "video_url": ad.video_url,
            "cta_text": ad.cta_text,
            "cta_link": ad.cta_link,
            "design_data": ad.design_data,
            "placement": ad.placement,
            "priority": ad.priority,
            "start_date": ad.start_date.isoformat() if ad.start_date else None,
            "end_date": ad.end_date.isoformat() if ad.end_date else None,
            "impressions": ad.impressions,
            "clicks": ad.clicks,
            "conversions": ad.conversions,
            "ctr": float(ad.ctr) if ad.ctr else 0.0,
            "approved_at": ad.approved_at.isoformat() if ad.approved_at else None,
            "created_at": ad.created_at.isoformat()
        }
        for ad in ads
    ]


@router.post("/ads", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_chef_ad(
    ad_data: ChefAdCreate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Create a new ad (requires marketing approval). When ad payments are suspended, ads can be created without payment; when not suspended, payment is required."""
    payments_suspended = _chef_ad_payments_suspended(db)
    if not payments_suspended:
        if not ad_data.ad_cost or ad_data.ad_cost <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is required for ad creation. Please select a duration and complete payment.")
        if not ad_data.payment_intent_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment is required. Please complete card payment before submitting.")
    chef_id = UUID(current_chef["chef_id"])
    
    # Verify campaign belongs to chef if provided
    if ad_data.campaign_id:
        campaign = db.query(Campaign).filter(
            Campaign.id == UUID(ad_data.campaign_id),
            Campaign.chef_id == chef_id
        ).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found or doesn't belong to chef")
    
    ad = Ad(
        campaign_id=UUID(ad_data.campaign_id) if ad_data.campaign_id else None,
        name=ad_data.name,
        ad_type=ad_data.ad_type,
        title=ad_data.title,
        description=ad_data.description,
        image_url=ad_data.image_url,
        video_url=ad_data.video_url,
        cta_text=ad_data.cta_text,
        cta_link=ad_data.cta_link,
        design_data=ad_data.design_data,
        placement=ad_data.placement,
        priority=ad_data.priority or 0,
        target_audience=ad_data.target_audience,
        start_date=ad_data.start_date,
        end_date=ad_data.end_date,
        slideshow_duration=ad_data.slideshow_duration or 5,
        transition_style=ad_data.transition_style or 'fade',
        ad_duration=ad_data.ad_duration,
        ad_cost=ad_data.ad_cost,
        payment_intent_id=ad_data.payment_intent_id,
        chef_id=chef_id,
        created_by=chef_id,  # Use chef_id as created_by for chefs
        created_by_type="chef",
        status="pending",  # Chef ads need approval
        approval_status="pending"
    )
    
    db.add(ad)
    db.commit()
    db.refresh(ad)
    
    return {
        "id": str(ad.id),
        "name": ad.name,
        "approval_status": ad.approval_status,
        "message": "Ad created successfully. It will be reviewed by Marketing before going live."
    }


@router.get("/ads/{ad_id}", response_model=dict)
async def get_chef_ad(
    ad_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get a specific ad by ID"""
    chef_id = UUID(current_chef["chef_id"])
    
    ad = db.query(Ad).filter(
        Ad.id == UUID(ad_id),
        Ad.chef_id == chef_id
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {
        "id": str(ad.id),
        "campaign_id": str(ad.campaign_id) if ad.campaign_id else None,
        "name": ad.name,
        "ad_type": ad.ad_type,
        "status": ad.status,
        "approval_status": ad.approval_status,
        "title": ad.title,
        "description": ad.description,
        "image_url": ad.image_url,
        "video_url": ad.video_url,
        "cta_text": ad.cta_text,
        "cta_link": ad.cta_link,
        "design_data": ad.design_data,
        "placement": ad.placement,
        "priority": ad.priority,
        "start_date": ad.start_date.isoformat() if ad.start_date else None,
        "end_date": ad.end_date.isoformat() if ad.end_date else None,
        "impressions": ad.impressions,
        "clicks": ad.clicks,
        "conversions": ad.conversions,
        "ctr": float(ad.ctr) if ad.ctr else 0.0,
        "approved_at": ad.approved_at.isoformat() if ad.approved_at else None,
        "created_at": ad.created_at.isoformat(),
        "slideshow_duration": ad.slideshow_duration,
        "slideshow_enabled": ad.slideshow_enabled,
        "transition_style": ad.transition_style
    }


@router.put("/ads/{ad_id}", response_model=dict)
async def update_chef_ad(
    ad_id: str,
    ad_data: ChefAdCreate,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Update a chef ad (only if pending approval)"""
    chef_id = UUID(current_chef["chef_id"])
    
    ad = db.query(Ad).filter(
        Ad.id == UUID(ad_id),
        Ad.chef_id == chef_id
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Only allow updates if ad is pending approval
    if ad.approval_status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Can only update ads that are pending approval"
        )
    
    if ad_data.name:
        ad.name = ad_data.name
    if ad_data.title is not None:
        ad.title = ad_data.title
    if ad_data.description is not None:
        ad.description = ad_data.description
    if ad_data.image_url is not None:
        ad.image_url = ad_data.image_url
    if ad_data.video_url is not None:
        ad.video_url = ad_data.video_url
    if ad_data.cta_text is not None:
        ad.cta_text = ad_data.cta_text
    if ad_data.cta_link is not None:
        ad.cta_link = ad_data.cta_link
    if ad_data.design_data:
        ad.design_data = ad_data.design_data
    if ad_data.placement:
        ad.placement = ad_data.placement
    if ad_data.priority is not None:
        ad.priority = ad_data.priority
    if ad_data.start_date:
        ad.start_date = ad_data.start_date
    if ad_data.end_date:
        ad.end_date = ad_data.end_date
    if ad_data.slideshow_duration is not None:
        ad.slideshow_duration = ad_data.slideshow_duration
    if ad_data.transition_style:
        ad.transition_style = ad_data.transition_style
    
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad updated successfully"}


@router.put("/ads/{ad_id}/pause", response_model=dict)
async def pause_chef_ad(
    ad_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Pause a chef ad"""
    chef_id = UUID(current_chef["chef_id"])
    
    ad = db.query(Ad).filter(
        Ad.id == UUID(ad_id),
        Ad.chef_id == chef_id
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    if ad.status == "paused":
        raise HTTPException(status_code=400, detail="Ad is already paused")
    
    ad.status = "paused"
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad paused successfully"}


@router.put("/ads/{ad_id}/activate", response_model=dict)
async def activate_chef_ad(
    ad_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Activate a chef ad (only if approved)"""
    chef_id = UUID(current_chef["chef_id"])
    
    ad = db.query(Ad).filter(
        Ad.id == UUID(ad_id),
        Ad.chef_id == chef_id
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    if ad.approval_status != "approved":
        raise HTTPException(status_code=400, detail="Can only activate approved ads")
    
    ad.status = "active"
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad activated successfully"}


@router.delete("/ads/{ad_id}", response_model=dict)
async def delete_chef_ad(
    ad_id: str,
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Delete a chef ad"""
    chef_id = UUID(current_chef["chef_id"])
    
    ad = db.query(Ad).filter(
        Ad.id == UUID(ad_id),
        Ad.chef_id == chef_id
    ).first()
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    db.delete(ad)
    db.commit()
    
    return {"message": "Ad deleted successfully"}


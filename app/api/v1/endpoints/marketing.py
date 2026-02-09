"""
Marketing endpoints for campaigns, ads, and email marketing
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
from app.core.database import get_db
from app.models.marketing import (
    Campaign, Ad, EmailCampaign, EmailTemplate, AdPlacement, CampaignAnalytics,
    Audience, ABTest, SocialMediaPost, Notification, AutomationWorkflow, MarketingBudget,
    Contact, ContentLibrary
)
from app.models.meal_plan import MealPlan, MealPlanMeal
from app.models.recipe import Recipe, RecipeIngredient
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.models.vendor import Vendor
from app.models.product import Product
from app.models.review import Review
from app.models.promotion import Promotion
from app.models.driver import Driver
from app.api.v1.dependencies import get_current_admin
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()


# Campaign Schemas
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    campaign_type: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[Decimal] = None
    target_audience: Optional[dict] = None


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[Decimal] = None
    target_audience: Optional[dict] = None


# Ad Schemas
class AdCreate(BaseModel):
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
    slideshow_duration: Optional[int] = 5  # Duration in seconds
    slideshow_enabled: Optional[bool] = True  # Whether to include in slideshow
    transition_style: Optional[str] = 'fade'  # fade, slide, none


class AdUpdate(BaseModel):
    name: Optional[str] = None
    ad_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    design_data: Optional[dict] = None
    placement: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    target_audience: Optional[dict] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    slideshow_duration: Optional[int] = None
    slideshow_enabled: Optional[bool] = None
    transition_style: Optional[str] = None


# Email Campaign Schemas
class EmailCampaignCreate(BaseModel):
    campaign_id: Optional[str] = None
    name: str
    subject: str
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    template_id: Optional[str] = None
    recipient_list: Optional[dict] = None
    scheduled_at: Optional[datetime] = None


# Email Template Schemas
class EmailTemplateCreate(BaseModel):
    name: str
    category: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_public: bool = False


# Campaign Endpoints
@router.get("/campaigns", response_model=List[dict])
async def get_campaigns(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    campaign_type: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all marketing campaigns"""
    query = db.query(Campaign)
    
    if status_filter:
        query = query.filter(Campaign.status == status_filter)
    if campaign_type:
        query = query.filter(Campaign.campaign_type == campaign_type)
    
    campaigns = query.order_by(Campaign.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "description": c.description,
            "campaign_type": c.campaign_type,
            "status": c.status,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "budget": float(c.budget) if c.budget else None,
            "spent": float(c.spent) if c.spent else 0.0,
            "target_audience": c.target_audience,
            "vendor_id": str(c.vendor_id) if c.vendor_id else None,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        }
        for c in campaigns
    ]


@router.post("/campaigns", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: CampaignCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new marketing campaign"""
    campaign = Campaign(
        name=campaign_data.name,
        description=campaign_data.description,
        campaign_type=campaign_data.campaign_type,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date,
        budget=campaign_data.budget,
        target_audience=campaign_data.target_audience,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "campaign_type": campaign.campaign_type,
        "status": campaign.status,
        "message": "Campaign created successfully"
    }


@router.put("/campaigns/{campaign_id}", response_model=dict)
async def update_campaign(
    campaign_id: str,
    campaign_data: CampaignUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a marketing campaign"""
    campaign = db.query(Campaign).filter(Campaign.id == UUID(campaign_id)).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign_data.name:
        campaign.name = campaign_data.name
    if campaign_data.description is not None:
        campaign.description = campaign_data.description
    if campaign_data.status:
        campaign.status = campaign_data.status
    if campaign_data.start_date:
        campaign.start_date = campaign_data.start_date
    if campaign_data.end_date:
        campaign.end_date = campaign_data.end_date
    if campaign_data.budget is not None:
        campaign.budget = campaign_data.budget
    if campaign_data.target_audience:
        campaign.target_audience = campaign_data.target_audience
    
    campaign.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Campaign updated successfully"}


# Ad Endpoints
@router.get("/ads", response_model=List[dict])
async def get_ads(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    approval_status: Optional[str] = None,
    placement: Optional[str] = None,
    vendor_id: Optional[str] = None,
    pending_vendor_ads: Optional[bool] = False,  # Filter for pending vendor ads
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all ads"""
    query = db.query(Ad)
    
    if status_filter:
        query = query.filter(Ad.status == status_filter)
    if approval_status:
        query = query.filter(Ad.approval_status == approval_status)
    if placement:
        query = query.filter(Ad.placement == placement)
    if vendor_id:
        query = query.filter(Ad.vendor_id == UUID(vendor_id))
    if pending_vendor_ads:
        # Show only vendor and chef ads pending approval
        query = query.filter(
            (Ad.vendor_id.isnot(None) | Ad.chef_id.isnot(None)),
            Ad.approval_status == "pending"
        )
    
    ads = query.order_by(Ad.priority.desc(), Ad.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get vendor and chef names
    from app.models.vendor import Vendor
    from app.models.chef import Chef
    
    result = []
    now = datetime.utcnow()
    for ad in ads:
        vendor_name = None
        chef_name = None
        
        if ad.vendor_id:
            vendor = db.query(Vendor).filter(Vendor.id == ad.vendor_id).first()
            vendor_name = vendor.business_name if vendor else None
        
        if ad.chef_id:
            chef = db.query(Chef).filter(Chef.id == ad.chef_id).first()
            chef_name = chef.chef_name if chef else None
        
        # Calculate actual status based on dates
        actual_status = ad.status
        if ad.end_date and ad.end_date < now:
            # Ad has expired
            actual_status = "expired"
        elif ad.start_date and ad.start_date > now:
            # Ad hasn't started yet
            if actual_status == "active":
                actual_status = "pending"
        elif ad.status == "active" and (not ad.end_date or ad.end_date >= now):
            # Ad is currently active
            actual_status = "active"
        
        result.append({
            "id": str(ad.id),
            "campaign_id": str(ad.campaign_id) if ad.campaign_id else None,
            "name": ad.name,
            "ad_type": ad.ad_type,
            "status": actual_status,
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
            "target_audience": ad.target_audience,
            "start_date": ad.start_date.isoformat() if ad.start_date else None,
            "end_date": ad.end_date.isoformat() if ad.end_date else None,
            "impressions": ad.impressions,
            "clicks": ad.clicks,
            "conversions": ad.conversions,
            "ctr": float(ad.ctr) if ad.ctr else 0.0,
            "vendor_id": str(ad.vendor_id) if ad.vendor_id else None,
            "vendor_name": vendor_name,
            "chef_id": str(ad.chef_id) if ad.chef_id else None,
            "chef_name": chef_name,
            "created_by_type": ad.created_by_type,
            "created_at": ad.created_at.isoformat(),
            "updated_at": ad.updated_at.isoformat(),
            "slideshow_duration": ad.slideshow_duration,
            "slideshow_enabled": ad.slideshow_enabled,
            "transition_style": ad.transition_style
        })
    
    return result


@router.post("/ads", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_ad(
    ad_data: AdCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new ad"""
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
        slideshow_enabled=ad_data.slideshow_enabled if ad_data.slideshow_enabled is not None else True,
        transition_style=ad_data.transition_style or 'fade',
        created_by=UUID(current_admin["admin_id"]),
        created_by_type="admin",
        status="active",  # Admin ads are auto-approved
        approval_status="approved"
    )
    
    db.add(ad)
    db.commit()
    db.refresh(ad)
    
    return {
        "id": str(ad.id),
        "name": ad.name,
        "status": ad.status,
        "message": "Ad created successfully"
    }


@router.get("/ads/{ad_id}", response_model=dict)
async def get_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get a specific ad by ID"""
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Calculate actual status based on dates
    now = datetime.utcnow()
    actual_status = ad.status
    if ad.end_date and ad.end_date < now:
        # Ad has expired
        actual_status = "expired"
    elif ad.start_date and ad.start_date > now:
        # Ad hasn't started yet
        if actual_status == "active":
            actual_status = "pending"
    elif ad.status == "active" and (not ad.end_date or ad.end_date >= now):
        # Ad is currently active
        actual_status = "active"
    
    return {
        "id": str(ad.id),
        "campaign_id": str(ad.campaign_id) if ad.campaign_id else None,
        "name": ad.name,
        "ad_type": ad.ad_type,
        "status": actual_status,
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
        "target_audience": ad.target_audience,
        "start_date": ad.start_date.isoformat() if ad.start_date else None,
        "end_date": ad.end_date.isoformat() if ad.end_date else None,
        "impressions": ad.impressions,
        "clicks": ad.clicks,
        "conversions": ad.conversions,
        "ctr": float(ad.ctr) if ad.ctr else 0.0,
        "vendor_id": str(ad.vendor_id) if ad.vendor_id else None,
        "created_by_type": ad.created_by_type,
        "created_at": ad.created_at.isoformat(),
        "updated_at": ad.updated_at.isoformat(),
        "slideshow_duration": ad.slideshow_duration,
        "slideshow_enabled": ad.slideshow_enabled,
        "transition_style": ad.transition_style
    }


@router.put("/ads/{ad_id}", response_model=dict)
async def update_ad(
    ad_id: str,
    ad_data: AdUpdate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update an ad"""
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    if ad_data.name:
        ad.name = ad_data.name
    if ad_data.ad_type:
        ad.ad_type = ad_data.ad_type
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
    if ad_data.status:
        ad.status = ad_data.status
    if ad_data.target_audience:
        ad.target_audience = ad_data.target_audience
    if ad_data.start_date:
        ad.start_date = ad_data.start_date
    if ad_data.end_date:
        ad.end_date = ad_data.end_date
    if ad_data.slideshow_duration is not None:
        ad.slideshow_duration = ad_data.slideshow_duration
    if ad_data.slideshow_enabled is not None:
        ad.slideshow_enabled = ad_data.slideshow_enabled
    if ad_data.transition_style is not None:
        ad.transition_style = ad_data.transition_style
    
    ad.updated_at = datetime.utcnow()
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        error_msg = f"Error updating ad: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_msg)
    
    return {"message": "Ad updated successfully"}


@router.put("/ads/{ad_id}/approve", response_model=dict)
async def approve_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve a vendor or chef ad"""
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    ad.approval_status = "approved"
    ad.status = "active"
    ad.approved_by = UUID(current_admin["admin_id"])
    ad.approved_at = datetime.utcnow()
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad approved successfully"}


@router.put("/ads/{ad_id}/reject", response_model=dict)
async def reject_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject a vendor or chef ad"""
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    ad.approval_status = "rejected"
    ad.status = "paused"
    ad.approved_by = UUID(current_admin["admin_id"])
    ad.approved_at = datetime.utcnow()
    ad.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Ad rejected"}


@router.delete("/ads/{ad_id}", response_model=dict)
async def delete_ad(
    ad_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete an ad"""
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    db.delete(ad)
    db.commit()
    
    return {"message": "Ad deleted successfully"}


# Email Campaign Endpoints
@router.get("/email-campaigns", response_model=List[dict])
async def get_email_campaigns(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all email campaigns"""
    query = db.query(EmailCampaign)
    
    if status_filter:
        query = query.filter(EmailCampaign.status == status_filter)
    
    campaigns = query.order_by(EmailCampaign.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": str(ec.id),
            "campaign_id": str(ec.campaign_id) if ec.campaign_id else None,
            "name": ec.name,
            "subject": ec.subject,
            "from_name": ec.from_name,
            "from_email": ec.from_email,
            "status": ec.status,
            "scheduled_at": ec.scheduled_at.isoformat() if ec.scheduled_at else None,
            "sent_at": ec.sent_at.isoformat() if ec.sent_at else None,
            "recipient_count": ec.recipient_count,
            "sent_count": ec.sent_count,
            "delivered_count": ec.delivered_count,
            "opened_count": ec.opened_count,
            "clicked_count": ec.clicked_count,
            "bounced_count": ec.bounced_count,
            "unsubscribed_count": ec.unsubscribed_count,
            "created_at": ec.created_at.isoformat()
        }
        for ec in campaigns
    ]


@router.post("/email-campaigns", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_email_campaign(
    campaign_data: EmailCampaignCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new email campaign"""
    email_campaign = EmailCampaign(
        campaign_id=UUID(campaign_data.campaign_id) if campaign_data.campaign_id else None,
        name=campaign_data.name,
        subject=campaign_data.subject,
        from_name=campaign_data.from_name,
        from_email=campaign_data.from_email,
        html_content=campaign_data.html_content,
        text_content=campaign_data.text_content,
        template_id=UUID(campaign_data.template_id) if campaign_data.template_id else None,
        recipient_list=campaign_data.recipient_list,
        scheduled_at=campaign_data.scheduled_at,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(email_campaign)
    db.commit()
    db.refresh(email_campaign)
    
    return {
        "id": str(email_campaign.id),
        "name": email_campaign.name,
        "status": email_campaign.status,
        "message": "Email campaign created successfully"
    }


# Email Template Endpoints
@router.get("/email-templates", response_model=List[dict])
async def get_email_templates(
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get email templates"""
    query = db.query(EmailTemplate)
    
    if category:
        query = query.filter(EmailTemplate.category == category)
    if is_public is not None:
        query = query.filter(EmailTemplate.is_public == is_public)
    
    templates = query.order_by(EmailTemplate.created_at.desc()).all()
    
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "category": t.category,
            "subject": t.subject,
            "thumbnail_url": t.thumbnail_url,
            "is_public": t.is_public,
            "created_at": t.created_at.isoformat()
        }
        for t in templates
    ]


@router.get("/email-templates/{template_id}", response_model=dict)
async def get_email_template(
    template_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get email template details"""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == UUID(template_id)).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {
        "id": str(template.id),
        "name": template.name,
        "category": template.category,
        "subject": template.subject,
        "html_content": template.html_content,
        "text_content": template.text_content,
        "thumbnail_url": template.thumbnail_url,
        "is_public": template.is_public
    }


@router.post("/email-templates", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_email_template(
    template_data: EmailTemplateCreate,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create an email template"""
    template = EmailTemplate(
        name=template_data.name,
        category=template_data.category,
        subject=template_data.subject,
        html_content=template_data.html_content,
        text_content=template_data.text_content,
        thumbnail_url=template_data.thumbnail_url,
        is_public=template_data.is_public,
        created_by=UUID(current_admin["admin_id"])
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return {
        "id": str(template.id),
        "name": template.name,
        "message": "Template created successfully"
    }


# Analytics Endpoints
@router.get("/analytics", response_model=dict)
async def get_marketing_analytics(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    campaign_id: Optional[str] = None,
    group_by: Optional[str] = Query("day", description="Group by: day, week, month"),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive marketing analytics"""
    # Default date range: last 30 days
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()
    
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    # Base analytics query
    analytics_query = db.query(CampaignAnalytics).filter(
        CampaignAnalytics.date >= start_dt,
        CampaignAnalytics.date <= end_dt
    )
    
    if campaign_id:
        analytics_query = analytics_query.filter(CampaignAnalytics.campaign_id == UUID(campaign_id))
    
    analytics = analytics_query.all()
    
    # Aggregate totals from CampaignAnalytics
    total_impressions = sum(a.impressions for a in analytics)
    total_clicks = sum(a.clicks for a in analytics)
    total_conversions = sum(a.conversions for a in analytics)
    total_revenue = sum(float(a.revenue) for a in analytics)
    total_cost = sum(float(a.cost) for a in analytics)
    
    # Also aggregate from Ad model directly if CampaignAnalytics is empty
    if total_impressions == 0 and total_clicks == 0:
        ads = db.query(Ad).filter(
            Ad.created_at >= start_dt,
            Ad.created_at <= end_dt
        ).all()
        total_impressions = sum(ad.impressions or 0 for ad in ads)
        total_clicks = sum(ad.clicks or 0 for ad in ads)
        total_conversions = sum(ad.conversions or 0 for ad in ads)
    
    # Calculate metrics
    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    conversion_rate = (total_conversions / total_clicks * 100) if total_clicks > 0 else 0
    roi = ((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0
    cpa = (total_cost / total_conversions) if total_conversions > 0 else 0
    cpc = (total_cost / total_clicks) if total_clicks > 0 else 0
    cpm = (total_cost / total_impressions * 1000) if total_impressions > 0 else 0
    
    # Time series data
    time_series = []
    if group_by == "day":
        current = start_dt.date()
        while current <= end_dt.date():
            day_analytics = [a for a in analytics if a.date.date() == current]
            time_series.append({
                "date": current.isoformat(),
                "impressions": sum(a.impressions for a in day_analytics),
                "clicks": sum(a.clicks for a in day_analytics),
                "conversions": sum(a.conversions for a in day_analytics),
                "revenue": float(sum(a.revenue for a in day_analytics)),
                "cost": float(sum(a.cost for a in day_analytics))
            })
            current += timedelta(days=1)
    elif group_by == "week":
        # Group by week
        week_start = start_dt
        while week_start <= end_dt:
            week_end = min(week_start + timedelta(days=6), end_dt)
            week_analytics = [a for a in analytics if week_start <= a.date <= week_end]
            time_series.append({
                "date": week_start.date().isoformat(),
                "impressions": sum(a.impressions for a in week_analytics),
                "clicks": sum(a.clicks for a in week_analytics),
                "conversions": sum(a.conversions for a in week_analytics),
                "revenue": float(sum(a.revenue for a in week_analytics)),
                "cost": float(sum(a.cost for a in week_analytics))
            })
            week_start += timedelta(days=7)
    elif group_by == "month":
        # Group by month
        current = start_dt.replace(day=1)
        while current <= end_dt:
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_end = min(next_month - timedelta(days=1), end_dt)
            month_analytics = [a for a in analytics if current <= a.date <= month_end]
            time_series.append({
                "date": current.date().isoformat(),
                "impressions": sum(a.impressions for a in month_analytics),
                "clicks": sum(a.clicks for a in month_analytics),
                "conversions": sum(a.conversions for a in month_analytics),
                "revenue": float(sum(a.revenue for a in month_analytics)),
                "cost": float(sum(a.cost for a in month_analytics))
            })
            current = next_month
    
    # Campaign breakdown
    campaign_breakdown = []
    campaigns = db.query(Campaign).filter(
        Campaign.created_at >= start_dt,
        Campaign.created_at <= end_dt
    ).all()
    
    for campaign in campaigns:
        campaign_analytics = [a for a in analytics if a.campaign_id == campaign.id]
        campaign_breakdown.append({
            "name": campaign.name,
            "impressions": sum(a.impressions for a in campaign_analytics),
            "clicks": sum(a.clicks for a in campaign_analytics),
            "conversions": sum(a.conversions for a in campaign_analytics),
            "revenue": float(sum(a.revenue for a in campaign_analytics)),
            "cost": float(sum(a.cost for a in campaign_analytics))
        })
    
    # Ad breakdown
    ad_breakdown = []
    ads = db.query(Ad).filter(
        Ad.created_at >= start_dt,
        Ad.created_at <= end_dt
    ).all()
    
    for ad in ads:
        ad_analytics = [a for a in analytics if a.ad_id == ad.id]
        ad_breakdown.append({
            "name": ad.name,
            "ad_type": ad.ad_type,
            "impressions": sum(a.impressions for a in ad_analytics),
            "clicks": sum(a.clicks for a in ad_analytics),
            "conversions": sum(a.conversions for a in ad_analytics),
            "revenue": float(sum(a.revenue for a in ad_analytics)),
            "cost": float(sum(a.cost for a in ad_analytics))
        })
    
    # Email campaign breakdown
    email_breakdown = []
    email_campaigns = db.query(EmailCampaign).filter(
        EmailCampaign.created_at >= start_dt,
        EmailCampaign.created_at <= end_dt
    ).all()
    
    for email_campaign in email_campaigns:
        email_analytics = [a for a in analytics if a.email_campaign_id == email_campaign.id]
        email_breakdown.append({
            "name": email_campaign.name,
            "sent": email_campaign.sent_count or 0,
            "delivered": email_campaign.delivered_count or 0,
            "opened": email_campaign.opened_count or 0,
            "clicked": email_campaign.clicked_count or 0,
            "conversions": sum(a.conversions for a in email_analytics),
            "revenue": float(sum(a.revenue for a in email_analytics))
        })
    
    # Meal Plans Analytics
    try:
        meal_plans = db.query(MealPlan).options(
            joinedload(MealPlan.meals)
        ).filter(
            MealPlan.created_at >= start_dt,
            MealPlan.created_at <= end_dt
        ).all()
    except Exception as e:
        # If meal plans table doesn't exist or there's an error, set empty values
        print(f"Error fetching meal plans: {e}")
        meal_plans = []
    
    total_meal_plans = len(meal_plans)
    live_meal_plans = len([mp for mp in meal_plans if mp.is_live])
    draft_meal_plans = len([mp for mp in meal_plans if not mp.is_live])
    
    # Calculate meal plan revenue (from orders that include meal plan products)
    # This is a simplified calculation - in a real system, you'd track meal plan purchases separately
    meal_plan_revenue = 0.0
    meal_plan_orders = db.query(Order).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
        Order.status.in_(["delivered", "picked_up"])
    ).all()
    
    # Count orders that might be from meal plans (this is approximate)
    # In a real system, you'd have a better way to track meal plan orders
    meal_plan_order_count = 0
    for order in meal_plan_orders:
        # Check if order has multiple items (likely from meal plan)
        if order.items and len(order.items) > 3:
            meal_plan_order_count += 1
            meal_plan_revenue += float(order.total_amount)
    
    # Meal plan breakdown by type
    meal_plan_breakdown = []
    for plan_type in ['one_day', 'one_week', 'one_month']:
        plans = [mp for mp in meal_plans if mp.plan_type == plan_type]
        meal_plan_breakdown.append({
            "plan_type": plan_type,
            "total": len(plans),
            "live": len([mp for mp in plans if mp.is_live]),
            "draft": len([mp for mp in plans if not mp.is_live])
        })
    
    # Popular meal plans (by number of meals included)
    popular_meal_plans = []
    for plan in sorted(meal_plans, key=lambda x: len(x.meals) if x.meals else 0, reverse=True)[:10]:
        popular_meal_plans.append({
            "id": str(plan.id),
            "name": plan.name,
            "plan_type": plan.plan_type,
            "meal_count": len(plan.meals) if plan.meals else 0,
            "is_live": plan.is_live,
            "price": float(plan.price) if plan.price else None
        })
    
    # Recipes Analytics
    try:
        recipes = db.query(Recipe).options(
            joinedload(Recipe.ingredients)
        ).filter(
            Recipe.created_at >= start_dt,
            Recipe.created_at <= end_dt
        ).all()
    except Exception as e:
        # If recipes table doesn't exist or there's an error, set empty values
        print(f"Error fetching recipes: {e}")
        recipes = []
    
    total_recipes = len(recipes)
    active_recipes = len([r for r in recipes if r.is_active])
    inactive_recipes = len([r for r in recipes if not r.is_active])
    
    # Recipe breakdown by meal type
    recipe_breakdown = []
    for meal_type in ['breakfast', 'lunch', 'dinner']:
        recipe_list = [r for r in recipes if r.meal_type == meal_type]
        recipe_breakdown.append({
            "meal_type": meal_type,
            "total": len(recipe_list),
            "active": len([r for r in recipe_list if r.is_active]),
            "inactive": len([r for r in recipe_list if not r.is_active])
        })
    
    # Recipe breakdown by difficulty
    difficulty_breakdown = []
    for difficulty in ['easy', 'medium', 'hard']:
        recipe_list = [r for r in recipes if r.difficulty == difficulty]
        difficulty_breakdown.append({
            "difficulty": difficulty,
            "count": len(recipe_list)
        })
    
    # Popular recipes (by number of ingredients - more complex recipes)
    popular_recipes = []
    for recipe in sorted(recipes, key=lambda x: len(x.ingredients) if x.ingredients else 0, reverse=True)[:10]:
        popular_recipes.append({
            "id": str(recipe.id),
            "name": recipe.name,
            "meal_type": recipe.meal_type,
            "difficulty": recipe.difficulty,
            "ingredient_count": len(recipe.ingredients) if recipe.ingredients else 0,
            "is_active": recipe.is_active
        })
    
    return {
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "total_conversions": total_conversions,
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "ctr": round(ctr, 2),
        "conversion_rate": round(conversion_rate, 2),
        "roi": round(roi, 2),
        "cpa": round(cpa, 2),
        "cpc": round(cpc, 2),
        "cpm": round(cpm, 2),
        "time_series": time_series,
        "campaign_breakdown": campaign_breakdown,
        "ad_breakdown": ad_breakdown,
        "email_breakdown": email_breakdown,
        "meal_plans": {
            "total": total_meal_plans,
            "live": live_meal_plans,
            "draft": draft_meal_plans,
            "revenue": round(meal_plan_revenue, 2),
            "orders": meal_plan_order_count,
            "breakdown_by_type": meal_plan_breakdown,
            "popular_plans": popular_meal_plans
        },
        "recipes": {
            "total": total_recipes,
            "active": active_recipes,
            "inactive": inactive_recipes,
            "breakdown_by_meal_type": recipe_breakdown,
            "breakdown_by_difficulty": difficulty_breakdown,
            "popular_recipes": popular_recipes
        },
        
        # Orders & Revenue Analytics
        "orders": {
            "total_orders": db.query(func.count(Order.id)).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt
            ).scalar() or 0,
            "completed_orders": db.query(func.count(Order.id)).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0,
            "total_revenue": float(db.query(func.sum(Order.total_amount)).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0),
            "average_order_value": float(db.query(func.avg(Order.total_amount)).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0),
            "orders_by_status": {
                "new": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "new"
                ).scalar() or 0,
                "confirmed": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "confirmed"
                ).scalar() or 0,
                "preparing": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "preparing"
                ).scalar() or 0,
                "ready": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "ready"
                ).scalar() or 0,
                "delivered": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "delivered"
                ).scalar() or 0,
                "picked_up": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "picked_up"
                ).scalar() or 0,
                "cancelled": db.query(func.count(Order.id)).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status == "cancelled"
                ).scalar() or 0
            }
        },
        
        # Customer Analytics
        "customers": {
            "total_customers": db.query(func.count(Customer.id)).filter(
                Customer.created_at >= start_dt,
                Customer.created_at <= end_dt
            ).scalar() or 0,
            "active_customers": db.query(func.count(func.distinct(Order.customer_id))).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.customer_id.isnot(None)
            ).scalar() or 0,
            "new_customers": db.query(func.count(Customer.id)).filter(
                Customer.created_at >= start_dt,
                Customer.created_at <= end_dt
            ).scalar() or 0,
            "repeat_customers": db.query(
                func.count(func.distinct(Order.customer_id))
            ).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status.in_(["delivered", "picked_up"])
            ).having(
                func.count(Order.id) > 1
            ).scalar() or 0
        },
        
        # Vendor Analytics
        "vendors": {
            "total_vendors": db.query(func.count(Vendor.id)).filter(
                Vendor.created_at >= start_dt,
                Vendor.created_at <= end_dt
            ).scalar() or 0,
            "active_vendors": db.query(func.count(func.distinct(Order.vendor_id))).filter(
                Order.created_at >= start_dt,
                Order.created_at <= end_dt,
                Order.status.in_(["delivered", "picked_up"])
            ).scalar() or 0,
            "new_vendors": db.query(func.count(Vendor.id)).filter(
                Vendor.created_at >= start_dt,
                Vendor.created_at <= end_dt,
                Vendor.status == "active"
            ).scalar() or 0
        },
        
        # Product Analytics
        "products": {
            "total_products": db.query(func.count(Product.id)).filter(
                Product.created_at >= start_dt,
                Product.created_at <= end_dt
            ).scalar() or 0,
            "active_products": db.query(func.count(Product.id)).filter(
                Product.created_at >= start_dt,
                Product.created_at <= end_dt,
                Product.status == "active"
            ).scalar() or 0,
            "top_selling_products": [
                {
                    "product_id": str(item.product_id),
                    "product_name": item.product_name,
                    "total_sold": int(item.total_sold),
                    "revenue": float(item.revenue)
                }
                for item in db.query(
                    OrderItem.product_id,
                    Product.name.label('product_name'),
                    func.sum(OrderItem.quantity).label('total_sold'),
                    func.sum(OrderItem.subtotal).label('revenue')
                ).join(
                    Order, OrderItem.order_id == Order.id
                ).join(
                    Product, OrderItem.product_id == Product.id
                ).filter(
                    Order.created_at >= start_dt,
                    Order.created_at <= end_dt,
                    Order.status.in_(["delivered", "picked_up"])
                ).group_by(
                    OrderItem.product_id, Product.name
                ).order_by(
                    func.sum(OrderItem.subtotal).desc()
                ).limit(10).all()
            ]
        },
        
        # Review Analytics
        "reviews": {
            "total_reviews": db.query(func.count(Review.id)).filter(
                Review.created_at >= start_dt,
                Review.created_at <= end_dt,
                Review.is_public == True
            ).scalar() or 0,
            "average_rating": float(db.query(func.avg(Review.rating)).filter(
                Review.created_at >= start_dt,
                Review.created_at <= end_dt,
                Review.is_public == True
            ).scalar() or 0),
            "rating_distribution": {
                "5_star": db.query(func.count(Review.id)).filter(
                    Review.created_at >= start_dt,
                    Review.created_at <= end_dt,
                    Review.rating == 5,
                    Review.is_public == True
                ).scalar() or 0,
                "4_star": db.query(func.count(Review.id)).filter(
                    Review.created_at >= start_dt,
                    Review.created_at <= end_dt,
                    Review.rating == 4,
                    Review.is_public == True
                ).scalar() or 0,
                "3_star": db.query(func.count(Review.id)).filter(
                    Review.created_at >= start_dt,
                    Review.created_at <= end_dt,
                    Review.rating == 3,
                    Review.is_public == True
                ).scalar() or 0,
                "2_star": db.query(func.count(Review.id)).filter(
                    Review.created_at >= start_dt,
                    Review.created_at <= end_dt,
                    Review.rating == 2,
                    Review.is_public == True
                ).scalar() or 0,
                "1_star": db.query(func.count(Review.id)).filter(
                    Review.created_at >= start_dt,
                    Review.created_at <= end_dt,
                    Review.rating == 1,
                    Review.is_public == True
                ).scalar() or 0
            }
        },
        
        # Promotion Analytics
        "promotions": {
            "total_promotions": db.query(func.count(Promotion.id)).filter(
                Promotion.created_at >= start_dt,
                Promotion.created_at <= end_dt
            ).scalar() or 0,
            "active_promotions": db.query(func.count(Promotion.id)).filter(
                Promotion.created_at >= start_dt,
                Promotion.created_at <= end_dt,
                Promotion.is_active == True,
                Promotion.start_date <= datetime.utcnow(),
                Promotion.end_date >= datetime.utcnow()
            ).scalar() or 0
        },
        
        # Driver Analytics
        "drivers": {
            "total_drivers": db.query(func.count(Driver.id)).filter(
                Driver.created_at >= start_dt,
                Driver.created_at <= end_dt
            ).scalar() or 0,
            "active_drivers": db.query(func.count(Driver.id)).filter(
                Driver.created_at >= start_dt,
                Driver.created_at <= end_dt,
                Driver.is_active == True
            ).scalar() or 0
        }
    }


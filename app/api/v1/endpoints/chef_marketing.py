"""
Chef marketing endpoints - chefs can create ads that require marketing approval
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.marketing import Ad, Campaign
from app.api.v1.dependencies import get_current_chef
from pydantic import BaseModel

router = APIRouter()


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
    """Create a new ad (requires marketing approval)"""
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


"""
Customer-facing marketing endpoints - get active ads to display
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.marketing import Ad
from app.models.vendor import Vendor
from app.models.store import Store
from app.api.v1.dependencies import get_optional_customer

router = APIRouter()


@router.get("/ads", response_model=List[dict])
async def get_active_ads(
    placement: Optional[str] = Query(None, description="Ad placement location"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor"),
    status: Optional[str] = Query(None, description="Filter by status"),
    approval_status: Optional[str] = Query(None, description="Filter by approval status"),
    slideshow_enabled: Optional[bool] = Query(None, description="Filter by slideshow enabled"),
    city: Optional[str] = Query(None, description="Filter by city (e.g., Calgary, Edmonton). Use 'All' to show all cities."),
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Get active ads for display on customer side, optionally filtered by city"""
    try:
        now = datetime.utcnow()
        
        query = db.query(Ad)
        
        # Status filters
        if status:
            query = query.filter(Ad.status == status)
        else:
            query = query.filter(Ad.status == "active")
        
        if approval_status:
            query = query.filter(Ad.approval_status == approval_status)
        else:
            query = query.filter(Ad.approval_status == "approved")
        
        # Date filters
        query = query.filter(
            or_(
                Ad.start_date.is_(None),
                Ad.start_date <= now
            ),
            or_(
                Ad.end_date.is_(None),
                Ad.end_date >= now
            )
        )
        
        if placement:
            query = query.filter(Ad.placement == placement)
        
        if slideshow_enabled is not None:
            query = query.filter(Ad.slideshow_enabled == slideshow_enabled)
        
        if vendor_id:
            query = query.filter(Ad.vendor_id == UUID(vendor_id))
        else:
            # Filter by city if provided (and not "All")
            # Admin ads (vendor_id is None) are shown for all cities
            # Vendor ads are filtered by city
            if city and city.lower() != 'all':
                city_filter = city.strip()
                print(f"DEBUG: Filtering ads by city: '{city_filter}'")
                
                # Get vendor IDs that match the city filter
                # Vendors with stores in the city
                store_vendor_ids = []
                try:
                    store_results = db.query(Vendor.id).join(
                        Store, Vendor.id == Store.vendor_id
                    ).filter(
                        Vendor.status == "active",
                        Store.is_active == True,
                        Store.city.isnot(None),
                        func.lower(Store.city).like(f"%{city_filter.lower()}%")
                    ).distinct().all()
                    store_vendor_ids = [str(v.id) for v in store_results]
                    print(f"DEBUG: Found {len(store_vendor_ids)} vendors with stores in city '{city_filter}'")
                except Exception as e:
                    print(f"DEBUG: Error querying vendors with stores: {e}")
                    import traceback
                    traceback.print_exc()
                
                # Vendors without stores but vendor city matches
                vendor_city_ids = []
                try:
                    vendor_results = db.query(Vendor.id).filter(
                        Vendor.status == "active",
                        Vendor.city.isnot(None),
                        func.lower(Vendor.city).like(f"%{city_filter.lower()}%")
                    ).all()
                    vendor_city_ids = [str(v.id) for v in vendor_results]
                    print(f"DEBUG: Found {len(vendor_city_ids)} vendors without stores but in city '{city_filter}'")
                except Exception as e:
                    print(f"DEBUG: Error querying vendors by city: {e}")
                    import traceback
                    traceback.print_exc()
                
                # Combine both sets of vendor IDs
                matching_vendor_ids = list(set(store_vendor_ids + vendor_city_ids))
                
                print(f"DEBUG: Total {len(matching_vendor_ids)} vendors matching city '{city_filter}' for ads")
                
                # Show admin ads (vendor_id is None) OR vendor ads matching the city
                if matching_vendor_ids:
                    try:
                        matching_uuids = [UUID(vid) for vid in matching_vendor_ids]
                        query = query.filter(
                            or_(
                                Ad.vendor_id.is_(None),  # Admin ads (show for all cities)
                                Ad.vendor_id.in_(matching_uuids)  # Vendor ads in the city
                            )
                        )
                    except (ValueError, TypeError) as e:
                        print(f"DEBUG: Error converting vendor IDs to UUIDs: {e}")
                        # Fallback: only show admin ads
                        query = query.filter(Ad.vendor_id.is_(None))
                else:
                    # No vendors match, only show admin ads
                    query = query.filter(Ad.vendor_id.is_(None))
            
            # Show both admin and vendor ads, but prioritize admin ads
            query = query.order_by(
                Ad.vendor_id.is_(None).desc(),  # Admin ads first (vendor_id is None)
                Ad.priority.desc(),
                Ad.created_at.desc()
            )
        
        ads = query.limit(20).all()
        
        result = []
        for ad in ads:
            try:
                # Track impression
                ad.impressions = (ad.impressions or 0) + 1
                db.commit()
            except Exception as e:
                print(f"DEBUG: Error tracking impression for ad {ad.id}: {e}")
                db.rollback()
            
            result.append({
                "id": str(ad.id),
                "name": ad.name,
                "ad_type": ad.ad_type,
                "title": ad.title,
                "description": ad.description,
                "image_url": ad.image_url,
                "video_url": ad.video_url,
                "cta_text": ad.cta_text,
                "cta_link": ad.cta_link,
                "design_data": ad.design_data,
                "placement": ad.placement,
                "priority": ad.priority or 0,
                "slideshow_duration": ad.slideshow_duration or 5,
                "slideshow_enabled": ad.slideshow_enabled if ad.slideshow_enabled is not None else True,
                "transition_style": ad.transition_style or 'fade',
                "start_date": ad.start_date.isoformat() if ad.start_date else None,
                "end_date": ad.end_date.isoformat() if ad.end_date else None,
                "vendor_id": str(ad.vendor_id) if ad.vendor_id else None
            })
        
        return result
    except Exception as e:
        import traceback
        error_msg = f"Error in get_active_ads: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


@router.post("/ads/{ad_id}/click", response_model=dict)
async def track_ad_click(
    ad_id: str,
    current_customer: Optional[dict] = Depends(get_optional_customer),
    db: Session = Depends(get_db)
):
    """Track ad click"""
    ad = db.query(Ad).filter(Ad.id == UUID(ad_id)).first()
    if not ad:
        return {"message": "Ad not found"}
    
    ad.clicks = (ad.clicks or 0) + 1
    if ad.impressions > 0:
        ad.ctr = (ad.clicks / ad.impressions) * 100
    db.commit()
    
    return {"message": "Click tracked", "cta_link": ad.cta_link}


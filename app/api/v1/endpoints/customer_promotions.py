"""
Customer promotions endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_db
from app.models.promotion import Promotion
from app.models.vendor import Vendor
from app.models.store import Store

router = APIRouter()


@router.get("/promotions", response_model=List[dict])
async def get_active_promotions(
    limit: int = Query(10, ge=1, le=50),
    city: Optional[str] = Query(None, description="Filter by city (e.g., Calgary, Edmonton). Use 'All' to show all cities."),
    db: Session = Depends(get_db)
):
    """Get all active promotions for customers, optionally filtered by city"""
    now = datetime.utcnow()
    
    # Base query for active, approved promotions
    query = db.query(Promotion).join(
        Vendor, Promotion.vendor_id == Vendor.id
    ).filter(
        Promotion.is_active == True,
        Promotion.approval_status == "approved",
        Promotion.start_date <= now,
        Promotion.end_date >= now,
        Vendor.status == "active"
    )
    
    # Filter by city if provided (and not "All")
    if city and city.lower() != 'all':
        city_filter = city.strip()
        print(f"DEBUG: Filtering promotions by city: '{city_filter}'")
        
        # Get vendor IDs that match the city filter
        # Vendors with stores in the city
        store_vendor_ids = [
            str(v.id) for v in db.query(Vendor.id).join(
                Store, Vendor.id == Store.vendor_id
            ).filter(
                Vendor.status == "active",
                Store.is_active == True,
                Store.city.isnot(None),
                func.lower(Store.city).like(f"%{city_filter.lower()}%")
            ).distinct().all()
        ]
        
        # Vendors without stores but vendor city matches
        vendor_city_ids = [
            str(v.id) for v in db.query(Vendor.id).filter(
                Vendor.status == "active",
                Vendor.city.isnot(None),
                func.lower(Vendor.city).like(f"%{city_filter.lower()}%")
            ).all()
        ]
        
        # Combine both sets of vendor IDs
        matching_vendor_ids = list(set(store_vendor_ids + vendor_city_ids))
        
        print(f"DEBUG: Found {len(matching_vendor_ids)} vendors matching city '{city_filter}'")
        
        if matching_vendor_ids:
            matching_uuids = [UUID(vid) for vid in matching_vendor_ids]
            query = query.filter(Promotion.vendor_id.in_(matching_uuids))
        else:
            # No vendors match, return empty result
            from uuid import uuid4
            impossible_uuid = uuid4()
            query = query.filter(Promotion.vendor_id == impossible_uuid)
    
    promotions = query.order_by(Promotion.created_at.desc()).limit(limit).all()
    
    result = []
    for promo in promotions:
        vendor = db.query(Vendor).filter(Vendor.id == promo.vendor_id).first()
        
        # Format discount display
        discount_display = ""
        if promo.discount_type == "percentage" and promo.discount_value:
            discount_display = f"{int(promo.discount_value)}% OFF"
        elif promo.discount_type == "fixed_amount" and promo.discount_value:
            discount_display = f"${float(promo.discount_value):.2f} OFF"
        
        result.append({
            "id": str(promo.id),
            "name": promo.name or "Special Offer",
            "description": promo.description,
            "discount_type": promo.discount_type,
            "discount_value": float(promo.discount_value) if promo.discount_value else None,
            "discount_display": discount_display,
            "vendor_id": str(promo.vendor_id),
            "vendor_name": vendor.business_name if vendor else "Unknown Vendor",
            "start_date": promo.start_date.isoformat() if promo.start_date else None,
            "end_date": promo.end_date.isoformat() if promo.end_date else None,
            "promotion_type": promo.promotion_type,
            "applies_to_all_products": promo.applies_to_all_products
        })
    
    return result


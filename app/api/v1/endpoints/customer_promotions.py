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
from app.models.chef import Chef

router = APIRouter()


def _format_promo(promo, vendor=None, chef=None):
    """Format a promotion for the API response."""
    discount_display = ""
    if promo.discount_type == "percentage" and promo.discount_value:
        discount_display = f"{int(promo.discount_value)}% OFF"
    elif promo.discount_type == "fixed_amount" and promo.discount_value:
        discount_display = f"${float(promo.discount_value):.2f} OFF"
    source = "vendor" if promo.vendor_id else "chef"
    return {
        "id": str(promo.id),
        "name": promo.name or "Special Offer",
        "description": promo.description,
        "discount_type": promo.discount_type,
        "discount_value": float(promo.discount_value) if promo.discount_value else None,
        "discount_display": discount_display,
        "source": source,
        "vendor_id": str(promo.vendor_id) if promo.vendor_id else None,
        "vendor_name": vendor.business_name if vendor else None,
        "chef_id": str(promo.chef_id) if promo.chef_id else None,
        "chef_name": (chef.chef_name or f"{chef.first_name} {chef.last_name}") if chef else None,
        "start_date": promo.start_date.isoformat() if promo.start_date else None,
        "end_date": promo.end_date.isoformat() if promo.end_date else None,
        "promotion_type": promo.promotion_type,
        "applies_to_all_products": promo.applies_to_all_products,
        "_created_at": promo.created_at.isoformat() if promo.created_at else "",
    }


@router.get("/promotions", response_model=List[dict])
async def get_active_promotions(
    limit: int = Query(10, ge=1, le=50),
    city: Optional[str] = Query(None, description="Filter by city (e.g., Calgary, Edmonton). Use 'All' to show all cities."),
    db: Session = Depends(get_db)
):
    """Get all active promotions for customers (vendor + chef), optionally filtered by city"""
    now = datetime.utcnow()
    base_filters = (
        Promotion.is_active == True,
        Promotion.start_date <= now,
        Promotion.end_date >= now,
    )

    result = []

    # 1. Vendor promotions (require approval_status or treat chef promos as auto-approved)
    vendor_query = db.query(Promotion).join(
        Vendor, Promotion.vendor_id == Vendor.id
    ).filter(
        *base_filters,
        Promotion.vendor_id.isnot(None),
        Promotion.approval_status == "approved",
        Vendor.status == "active"
    )
    if city and city.lower() != 'all':
        city_filter = city.strip()
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
        vendor_city_ids = [
            str(v.id) for v in db.query(Vendor.id).filter(
                Vendor.status == "active",
                Vendor.city.isnot(None),
                func.lower(Vendor.city).like(f"%{city_filter.lower()}%")
            ).all()
        ]
        matching_vendor_ids = list(set(store_vendor_ids + vendor_city_ids))
        if matching_vendor_ids:
            vendor_query = vendor_query.filter(Promotion.vendor_id.in_([UUID(vid) for vid in matching_vendor_ids]))
        else:
            vendor_query = vendor_query.filter(False)
    vendor_promos = vendor_query.order_by(Promotion.created_at.desc()).limit(limit * 2).all()
    for promo in vendor_promos:
        vendor = db.query(Vendor).filter(Vendor.id == promo.vendor_id).first()
        result.append(_format_promo(promo, vendor=vendor))

    # 2. Chef promotions (verified chefs, chef promos don't use approval_status)
    chef_query = db.query(Promotion).join(
        Chef, Promotion.chef_id == Chef.id
    ).filter(
        *base_filters,
        Promotion.chef_id.isnot(None),
        Chef.verification_status == "verified",
        Chef.is_active == True
    )
    if city and city.lower() != 'all':
        city_filter = city.strip()
        chef_query = chef_query.filter(
            Chef.city.isnot(None),
            func.lower(Chef.city).like(f"%{city_filter.lower()}%")
        )
    chef_promos = chef_query.order_by(Promotion.created_at.desc()).limit(limit * 2).all()
    for promo in chef_promos:
        chef = db.query(Chef).filter(Chef.id == promo.chef_id).first()
        result.append(_format_promo(promo, chef=chef))

    # Sort combined by created_at desc and limit; remove internal _created_at from response
    result.sort(key=lambda x: x.pop("_created_at", "") or "", reverse=True)
    return result[:limit]


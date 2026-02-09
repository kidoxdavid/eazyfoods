"""
Vendor management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import VendorResponse, VendorUpdate
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/me", response_model=VendorResponse)
async def get_current_vendor_info(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get current vendor's information"""
    from uuid import UUID
    from decimal import Decimal
    
    vendor_id = UUID(current_vendor["vendor_id"])
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    # Convert to response format explicitly
    return VendorResponse(
        id=str(vendor.id),
        business_name=vendor.business_name,
        business_type=vendor.business_type,
        email=vendor.email,
        phone=vendor.phone,
        street_address=vendor.street_address,
        city=vendor.city,
        state=vendor.state,
        postal_code=vendor.postal_code,
        country=vendor.country,
        status=vendor.status,
        verification_status=vendor.verification_status,
        average_rating=Decimal(str(vendor.average_rating)) if vendor.average_rating else None,
        total_reviews=vendor.total_reviews or 0,
        description=vendor.description,
        store_profile_image_url=vendor.store_profile_image_url,
        store_banner_image_url=vendor.store_banner_image_url,
        operating_hours=vendor.operating_hours,
        delivery_radius_km=float(vendor.delivery_radius_km) if vendor.delivery_radius_km else None,
        pickup_available=vendor.pickup_available,
        delivery_available=vendor.delivery_available,
        latitude=float(vendor.latitude) if vendor.latitude else None,
        longitude=float(vendor.longitude) if vendor.longitude else None,
        store_gallery=vendor.store_gallery if vendor.store_gallery else None,
        store_tags=vendor.store_tags if vendor.store_tags else None,
        store_features=vendor.store_features if vendor.store_features else None,
        minimum_order_amount=float(vendor.minimum_order_amount) if vendor.minimum_order_amount else None,
        delivery_fee=float(vendor.delivery_fee) if vendor.delivery_fee else None,
        free_delivery_threshold=float(vendor.free_delivery_threshold) if vendor.free_delivery_threshold else None,
        estimated_prep_time_minutes=vendor.estimated_prep_time_minutes,
        payment_methods_accepted=vendor.payment_methods_accepted if vendor.payment_methods_accepted else None,
        return_policy=vendor.return_policy,
        cancellation_policy=vendor.cancellation_policy,
        social_media_links=vendor.social_media_links if vendor.social_media_links else None,
        specialties=vendor.specialties if vendor.specialties else None,
        accepts_online_payment=vendor.accepts_online_payment,
        accepts_cash_on_delivery=vendor.accepts_cash_on_delivery,
        region=vendor.region
    )


@router.put("/me", response_model=VendorResponse)
async def update_vendor_info(
    vendor_update: VendorUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update current vendor's information"""
    from uuid import UUID
    from decimal import Decimal
    
    vendor_id = UUID(current_vendor["vendor_id"])
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    # Update fields
    update_data = vendor_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ['latitude', 'longitude'] and value is not None:
            # Convert float to Decimal for database storage
            from decimal import Decimal
            setattr(vendor, field, Decimal(str(value)))
        elif field in ['delivery_radius_km', 'minimum_order_amount', 'delivery_fee', 'free_delivery_threshold'] and value is not None:
            from decimal import Decimal
            setattr(vendor, field, Decimal(str(value)))
        else:
            setattr(vendor, field, value)
    
    # If status is being updated to active, set go_live_at if not already set
    if 'status' in update_data and update_data['status'] == 'active' and not vendor.go_live_at:
        from datetime import datetime
        vendor.go_live_at = datetime.utcnow()
    
    db.commit()
    db.refresh(vendor)
    
    # Convert to response format
    return VendorResponse(
        id=str(vendor.id),
        business_name=vendor.business_name,
        business_type=vendor.business_type,
        email=vendor.email,
        phone=vendor.phone,
        street_address=vendor.street_address,
        city=vendor.city,
        state=vendor.state,
        postal_code=vendor.postal_code,
        country=vendor.country,
        status=vendor.status,
        verification_status=vendor.verification_status,
        average_rating=Decimal(str(vendor.average_rating)) if vendor.average_rating else None,
        total_reviews=vendor.total_reviews or 0,
        description=vendor.description,
        store_profile_image_url=vendor.store_profile_image_url,
        store_banner_image_url=vendor.store_banner_image_url,
        operating_hours=vendor.operating_hours,
        delivery_radius_km=float(vendor.delivery_radius_km) if vendor.delivery_radius_km else None,
        pickup_available=vendor.pickup_available,
        delivery_available=vendor.delivery_available,
        latitude=float(vendor.latitude) if vendor.latitude else None,
        longitude=float(vendor.longitude) if vendor.longitude else None,
        store_gallery=vendor.store_gallery if vendor.store_gallery else None,
        store_tags=vendor.store_tags if vendor.store_tags else None,
        store_features=vendor.store_features if vendor.store_features else None,
        minimum_order_amount=float(vendor.minimum_order_amount) if vendor.minimum_order_amount else None,
        delivery_fee=float(vendor.delivery_fee) if vendor.delivery_fee else None,
        free_delivery_threshold=float(vendor.free_delivery_threshold) if vendor.free_delivery_threshold else None,
        estimated_prep_time_minutes=vendor.estimated_prep_time_minutes,
        payment_methods_accepted=vendor.payment_methods_accepted if vendor.payment_methods_accepted else None,
        return_policy=vendor.return_policy,
        cancellation_policy=vendor.cancellation_policy,
        social_media_links=vendor.social_media_links if vendor.social_media_links else None,
        specialties=vendor.specialties if vendor.specialties else None,
        accepts_online_payment=vendor.accepts_online_payment,
        accepts_cash_on_delivery=vendor.accepts_cash_on_delivery,
        region=vendor.region
    )


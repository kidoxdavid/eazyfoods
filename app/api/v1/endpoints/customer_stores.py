"""
Customer store browsing endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.models.vendor import Vendor
from app.models.store import Store
from sqlalchemy import func, and_

router = APIRouter()


@router.get("/", response_model=List[dict])
async def get_stores(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius_km: Optional[float] = Query(100, description="Search radius in kilometers"),
    search: Optional[str] = Query(None),
    region: Optional[str] = Query(None, description="Filter by region: West African, East African, North African, Central African, South African"),
    city: Optional[str] = Query(None, description="Filter by city (e.g., Calgary, Edmonton, Red Deer)"),
    db: Session = Depends(get_db)
):
    """Get all stores from all active vendors. If a vendor has no stores, show the vendor as a store."""
    # Query stores from active vendors
    store_query = db.query(Store).join(Vendor).filter(
        Vendor.status == "active",
        Store.is_active == True
    )
    
    if search:
        search_term = f"%{search}%"
        store_query = store_query.filter(
            (Store.name.ilike(search_term)) |
            (Vendor.business_name.ilike(search_term))
        )
    
    if region:
        store_query = store_query.filter(Vendor.region == region)
    
    if city and city.lower() != 'all':
        # Filter by city (case-insensitive) - only if not "All"
        store_query = store_query.filter(Store.city.ilike(f"%{city}%"))
    
    stores_list = store_query.all()
    
    # Also get vendors that don't have stores (to show them as stores)
    vendor_query = db.query(Vendor).filter(Vendor.status == "active")
    
    if region:
        vendor_query = vendor_query.filter(Vendor.region == region)
    
    if city and city.lower() != 'all':
        # Filter vendors by city (case-insensitive) - only if not "All"
        vendor_query = vendor_query.filter(Vendor.city.ilike(f"%{city}%"))
    
    if search:
        search_term = f"%{search}%"
        vendor_query = vendor_query.filter(Vendor.business_name.ilike(search_term))
    
    all_vendors = vendor_query.all()
    vendors_with_stores = {store.vendor_id for store in stores_list}
    vendors_without_stores = [v for v in all_vendors if v.id not in vendors_with_stores]
    
    stores = []
    from math import radians, cos, sin, asin, sqrt
    
    # Process actual stores
    for store in stores_list:
        vendor = store.vendor
        # Calculate distance if both user and store have coordinates
        distance = None
        if latitude and longitude and store.latitude and store.longitude:
            lat1, lon1 = radians(latitude), radians(longitude)
            lat2, lon2 = radians(float(store.latitude)), radians(float(store.longitude))
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            distance = 6371 * c  # Earth radius in km
        
        stores.append({
            "id": str(store.id),
            "vendor_id": str(vendor.id),
            "business_name": vendor.business_name,
            "store_name": store.name,
            "description": store.description or vendor.description,
            "store_profile_image_url": store.profile_image_url or vendor.store_profile_image_url,
            "store_banner_image_url": store.banner_image_url or vendor.store_banner_image_url,
            "average_rating": float(store.average_rating) if store.average_rating else (float(vendor.average_rating) if vendor.average_rating else None),
            "total_reviews": store.total_reviews or vendor.total_reviews,
            "city": store.city,
            "state": store.state,
            "street_address": store.street_address,
            "delivery_available": store.delivery_available,
            "pickup_available": store.pickup_available,
            "delivery_radius_km": float(store.delivery_radius_km) if store.delivery_radius_km else None,
            "distance_km": round(distance, 2) if distance else None,
            "operating_hours": store.operating_hours or vendor.operating_hours,
            "minimum_order_amount": float(store.minimum_order_amount) if store.minimum_order_amount else None,
            "delivery_fee": float(store.delivery_fee) if store.delivery_fee else None,
            "estimated_prep_time_minutes": store.estimated_prep_time_minutes,
            "store_tags": store.store_tags if store.store_tags else (vendor.store_tags if vendor.store_tags else []),
            "store_features": store.store_features if store.store_features else (vendor.store_features if vendor.store_features else {}),
            "specialties": store.specialties if store.specialties else (vendor.specialties if vendor.specialties else []),
            "region": vendor.region,
            "is_primary": store.is_primary
        })
    
    # Process vendors without stores (show them as stores)
    for vendor in vendors_without_stores:
        # Calculate distance if both user and vendor have coordinates
        distance = None
        if latitude and longitude and vendor.latitude and vendor.longitude:
            lat1, lon1 = radians(latitude), radians(longitude)
            lat2, lon2 = radians(float(vendor.latitude)), radians(float(vendor.longitude))
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            distance = 6371 * c  # Earth radius in km
        
        # Use vendor ID as store ID for vendors without stores
        stores.append({
            "id": str(vendor.id),  # Use vendor ID as store ID
            "vendor_id": str(vendor.id),
            "business_name": vendor.business_name,
            "store_name": vendor.business_name,  # Use business name as store name
            "description": vendor.description,
            "store_profile_image_url": vendor.store_profile_image_url,
            "store_banner_image_url": vendor.store_banner_image_url,
            "average_rating": float(vendor.average_rating) if vendor.average_rating else None,
            "total_reviews": vendor.total_reviews or 0,
            "city": vendor.city,
            "state": vendor.state,
            "street_address": vendor.street_address,
            "delivery_available": vendor.delivery_available if vendor.delivery_available is not None else True,
            "pickup_available": vendor.pickup_available if vendor.pickup_available is not None else True,
            "delivery_radius_km": float(vendor.delivery_radius_km) if vendor.delivery_radius_km else None,
            "distance_km": round(distance, 2) if distance else None,
            "operating_hours": vendor.operating_hours,
            "minimum_order_amount": float(vendor.minimum_order_amount) if vendor.minimum_order_amount else None,
            "delivery_fee": float(vendor.delivery_fee) if vendor.delivery_fee else None,
            "estimated_prep_time_minutes": vendor.estimated_prep_time_minutes or 30,
            "store_tags": vendor.store_tags if vendor.store_tags else [],
            "store_features": vendor.store_features if vendor.store_features else {},
            "specialties": vendor.specialties if vendor.specialties else [],
            "region": vendor.region,
            "is_primary": True  # Vendors without stores are treated as primary
        })
    
    # Sort by distance if available, otherwise by name
    stores.sort(key=lambda x: (x["distance_km"] if x["distance_km"] is not None else float('inf'), x["store_name"]))
    
    return stores


@router.get("/{store_id}", response_model=dict)
async def get_store(
    store_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific store with full details. If store_id is a vendor_id (vendor has no stores), return vendor as store."""
    from uuid import UUID
    from fastapi import HTTPException
    
    try:
        store_uuid = UUID(store_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid store ID format")
    
    # First try to find a store with this ID
    store = db.query(Store).join(Vendor).filter(
        Store.id == store_uuid,
        Store.is_active == True,
        Vendor.status == "active"
    ).first()
    
    # If no store found, check if it's a vendor ID (vendor without stores)
    if not store:
        vendor = db.query(Vendor).filter(
            Vendor.id == store_uuid,
            Vendor.status == "active"
        ).first()
        
        if not vendor:
            raise HTTPException(status_code=404, detail="Store not found")
        
        # Return vendor as store
        return {
            "id": str(vendor.id),
            "vendor_id": str(vendor.id),
            "business_name": vendor.business_name,
            "store_name": vendor.business_name,
            "description": vendor.description,
            "store_profile_image_url": vendor.store_profile_image_url,
            "store_banner_image_url": vendor.store_banner_image_url,
            "average_rating": float(vendor.average_rating) if vendor.average_rating else None,
            "total_reviews": vendor.total_reviews or 0,
            "city": vendor.city,
            "state": vendor.state,
            "street_address": vendor.street_address,
            "postal_code": vendor.postal_code,
            "phone": vendor.phone,
            "delivery_available": vendor.delivery_available if vendor.delivery_available is not None else True,
            "pickup_available": vendor.pickup_available if vendor.pickup_available is not None else True,
            "delivery_radius_km": float(vendor.delivery_radius_km) if vendor.delivery_radius_km else None,
            "operating_hours": vendor.operating_hours,
            "latitude": float(vendor.latitude) if vendor.latitude else None,
            "longitude": float(vendor.longitude) if vendor.longitude else None,
            "minimum_order_amount": float(vendor.minimum_order_amount) if vendor.minimum_order_amount else None,
            "delivery_fee": float(vendor.delivery_fee) if vendor.delivery_fee else None,
            "free_delivery_threshold": float(vendor.free_delivery_threshold) if vendor.free_delivery_threshold else None,
            "estimated_prep_time_minutes": vendor.estimated_prep_time_minutes or 30,
            "payment_methods_accepted": vendor.payment_methods_accepted if vendor.payment_methods_accepted else [],
            "return_policy": vendor.return_policy,
            "cancellation_policy": vendor.cancellation_policy,
            "social_media_links": vendor.social_media_links if vendor.social_media_links else {},
            "store_tags": vendor.store_tags if vendor.store_tags else [],
            "store_features": vendor.store_features if vendor.store_features else {},
            "specialties": vendor.specialties if vendor.specialties else [],
            "store_gallery": vendor.store_gallery if vendor.store_gallery else [],
            "accepts_online_payment": vendor.accepts_online_payment,
            "accepts_cash_on_delivery": vendor.accepts_cash_on_delivery,
            "region": vendor.region,
            "is_primary": True
        }
    
    vendor = store.vendor
    
    return {
        "id": str(store.id),
        "vendor_id": str(vendor.id),
        "business_name": vendor.business_name,
        "store_name": store.name,
        "description": store.description or vendor.description,
        "store_profile_image_url": store.profile_image_url or vendor.store_profile_image_url,
        "store_banner_image_url": store.banner_image_url or vendor.store_banner_image_url,
        "average_rating": float(store.average_rating) if store.average_rating else (float(vendor.average_rating) if vendor.average_rating else None),
        "total_reviews": store.total_reviews or vendor.total_reviews,
        "city": store.city or vendor.city,
        "state": store.state or vendor.state,
        "street_address": store.street_address or vendor.street_address,
        "postal_code": store.postal_code or vendor.postal_code,
        "phone": store.phone or vendor.phone,
        "delivery_available": store.delivery_available,
        "pickup_available": store.pickup_available,
        "delivery_radius_km": float(store.delivery_radius_km) if store.delivery_radius_km else (float(vendor.delivery_radius_km) if vendor.delivery_radius_km else None),
        "operating_hours": store.operating_hours or vendor.operating_hours,
        "latitude": float(store.latitude) if store.latitude else (float(vendor.latitude) if vendor.latitude else None),
        "longitude": float(store.longitude) if store.longitude else (float(vendor.longitude) if vendor.longitude else None),
        "minimum_order_amount": float(store.minimum_order_amount) if store.minimum_order_amount else (float(vendor.minimum_order_amount) if vendor.minimum_order_amount else None),
        "delivery_fee": float(store.delivery_fee) if store.delivery_fee else (float(vendor.delivery_fee) if vendor.delivery_fee else None),
        "free_delivery_threshold": float(store.free_delivery_threshold) if store.free_delivery_threshold else (float(vendor.free_delivery_threshold) if vendor.free_delivery_threshold else None),
        "estimated_prep_time_minutes": store.estimated_prep_time_minutes or vendor.estimated_prep_time_minutes,
        "payment_methods_accepted": store.payment_methods_accepted if store.payment_methods_accepted else (vendor.payment_methods_accepted if vendor.payment_methods_accepted else []),
        "return_policy": store.return_policy or vendor.return_policy,
        "cancellation_policy": store.cancellation_policy or vendor.cancellation_policy,
        "social_media_links": store.social_media_links if store.social_media_links else (vendor.social_media_links if vendor.social_media_links else {}),
        "store_tags": store.store_tags if store.store_tags else (vendor.store_tags if vendor.store_tags else []),
        "store_features": store.store_features if store.store_features else (vendor.store_features if vendor.store_features else {}),
        "specialties": store.specialties if store.specialties else (vendor.specialties if vendor.specialties else []),
        "store_gallery": store.store_gallery if store.store_gallery else (vendor.store_gallery if vendor.store_gallery else []),
        "accepts_online_payment": store.accepts_online_payment if store.accepts_online_payment is not None else vendor.accepts_online_payment,
        "accepts_cash_on_delivery": store.accepts_cash_on_delivery if store.accepts_cash_on_delivery is not None else vendor.accepts_cash_on_delivery,
        "region": vendor.region,
        "is_primary": store.is_primary
    }


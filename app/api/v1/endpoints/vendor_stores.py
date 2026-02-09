"""
Vendor store management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from app.core.database import get_db
from app.models.store import Store
from app.models.vendor import Vendor
from app.api.v1.dependencies import get_current_vendor
from pydantic import BaseModel

router = APIRouter()


class StoreCreate(BaseModel):
    name: str
    store_code: Optional[str] = None
    description: Optional[str] = None
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "Canada"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    operating_hours: Optional[dict] = None
    pickup_available: bool = True
    delivery_available: bool = True
    delivery_radius_km: float = 5.0
    delivery_fee: float = 0.00
    free_delivery_threshold: Optional[float] = None
    minimum_order_amount: float = 0.00
    estimated_prep_time_minutes: int = 30
    is_primary: bool = False


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    store_code: Optional[str] = None
    description: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    operating_hours: Optional[dict] = None
    pickup_available: Optional[bool] = None
    delivery_available: Optional[bool] = None
    delivery_radius_km: Optional[float] = None
    delivery_fee: Optional[float] = None
    free_delivery_threshold: Optional[float] = None
    minimum_order_amount: Optional[float] = None
    estimated_prep_time_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None
    status: Optional[str] = None


@router.get("/", response_model=List[dict])
async def get_stores(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all stores for current vendor"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    stores = db.query(Store).filter(Store.vendor_id == vendor_id).order_by(
        Store.is_primary.desc(), Store.created_at.asc()
    ).all()
    
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "store_code": s.store_code,
            "description": s.description,
            "street_address": s.street_address,
            "city": s.city,
            "state": s.state,
            "postal_code": s.postal_code,
            "country": s.country,
            "latitude": float(s.latitude) if s.latitude else None,
            "longitude": float(s.longitude) if s.longitude else None,
            "phone": s.phone,
            "email": s.email,
            "operating_hours": s.operating_hours,
            "pickup_available": s.pickup_available,
            "delivery_available": s.delivery_available,
            "delivery_radius_km": float(s.delivery_radius_km) if s.delivery_radius_km else None,
            "delivery_fee": float(s.delivery_fee) if s.delivery_fee else None,
            "free_delivery_threshold": float(s.free_delivery_threshold) if s.free_delivery_threshold else None,
            "minimum_order_amount": float(s.minimum_order_amount) if s.minimum_order_amount else None,
            "estimated_prep_time_minutes": s.estimated_prep_time_minutes,
            "is_active": s.is_active,
            "is_primary": s.is_primary,
            "status": s.status,
            "average_rating": float(s.average_rating) if s.average_rating else 0.0,
            "total_reviews": s.total_reviews,
            "created_at": s.created_at.isoformat()
        }
        for s in stores
    ]


@router.get("/{store_id}", response_model=dict)
async def get_store(
    store_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get store details"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    store = db.query(Store).filter(
        Store.id == UUID(store_id),
        Store.vendor_id == vendor_id
    ).first()
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return {
        "id": str(store.id),
        "name": store.name,
        "store_code": store.store_code,
        "description": store.description,
        "street_address": store.street_address,
        "city": store.city,
        "state": store.state,
        "postal_code": store.postal_code,
        "country": store.country,
        "latitude": float(store.latitude) if store.latitude else None,
        "longitude": float(store.longitude) if store.longitude else None,
        "phone": store.phone,
        "email": store.email,
        "operating_hours": store.operating_hours,
        "pickup_available": store.pickup_available,
        "delivery_available": store.delivery_available,
        "delivery_radius_km": float(store.delivery_radius_km) if store.delivery_radius_km else None,
        "delivery_fee": float(store.delivery_fee) if store.delivery_fee else None,
        "free_delivery_threshold": float(store.free_delivery_threshold) if store.free_delivery_threshold else None,
        "minimum_order_amount": float(store.minimum_order_amount) if store.minimum_order_amount else None,
        "estimated_prep_time_minutes": store.estimated_prep_time_minutes,
        "is_active": store.is_active,
        "is_primary": store.is_primary,
        "status": store.status,
        "average_rating": float(store.average_rating) if store.average_rating else 0.0,
        "total_reviews": store.total_reviews,
        "created_at": store.created_at.isoformat()
    }


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_store(
    store_data: StoreCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new store"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    # If this is set as primary, unset other primary stores
    if store_data.is_primary:
        db.query(Store).filter(Store.vendor_id == vendor_id, Store.is_primary == True).update({"is_primary": False})
    
    store = Store(
        vendor_id=vendor_id,
        name=store_data.name,
        store_code=store_data.store_code,
        description=store_data.description,
        street_address=store_data.street_address,
        city=store_data.city,
        state=store_data.state,
        postal_code=store_data.postal_code,
        country=store_data.country,
        latitude=Decimal(str(store_data.latitude)) if store_data.latitude else None,
        longitude=Decimal(str(store_data.longitude)) if store_data.longitude else None,
        phone=store_data.phone,
        email=store_data.email,
        operating_hours=store_data.operating_hours,
        pickup_available=store_data.pickup_available,
        delivery_available=store_data.delivery_available,
        delivery_radius_km=Decimal(str(store_data.delivery_radius_km)),
        delivery_fee=Decimal(str(store_data.delivery_fee)),
        free_delivery_threshold=Decimal(str(store_data.free_delivery_threshold)) if store_data.free_delivery_threshold else None,
        minimum_order_amount=Decimal(str(store_data.minimum_order_amount)),
        estimated_prep_time_minutes=store_data.estimated_prep_time_minutes,
        is_primary=store_data.is_primary
    )
    
    db.add(store)
    db.commit()
    db.refresh(store)
    
    return {
        "id": str(store.id),
        "name": store.name,
        "message": "Store created successfully"
    }


@router.put("/{store_id}", response_model=dict)
async def update_store(
    store_id: str,
    store_data: StoreUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update a store"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    store = db.query(Store).filter(
        Store.id == UUID(store_id),
        Store.vendor_id == vendor_id
    ).first()
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Update fields
    if store_data.name is not None:
        store.name = store_data.name
    if store_data.store_code is not None:
        store.store_code = store_data.store_code
    if store_data.description is not None:
        store.description = store_data.description
    if store_data.street_address is not None:
        store.street_address = store_data.street_address
    if store_data.city is not None:
        store.city = store_data.city
    if store_data.state is not None:
        store.state = store_data.state
    if store_data.postal_code is not None:
        store.postal_code = store_data.postal_code
    if store_data.country is not None:
        store.country = store_data.country
    if store_data.latitude is not None:
        store.latitude = Decimal(str(store_data.latitude))
    if store_data.longitude is not None:
        store.longitude = Decimal(str(store_data.longitude))
    if store_data.phone is not None:
        store.phone = store_data.phone
    if store_data.email is not None:
        store.email = store_data.email
    if store_data.operating_hours is not None:
        store.operating_hours = store_data.operating_hours
    if store_data.pickup_available is not None:
        store.pickup_available = store_data.pickup_available
    if store_data.delivery_available is not None:
        store.delivery_available = store_data.delivery_available
    if store_data.delivery_radius_km is not None:
        store.delivery_radius_km = Decimal(str(store_data.delivery_radius_km))
    if store_data.delivery_fee is not None:
        store.delivery_fee = Decimal(str(store_data.delivery_fee))
    if store_data.free_delivery_threshold is not None:
        store.free_delivery_threshold = Decimal(str(store_data.free_delivery_threshold))
    if store_data.minimum_order_amount is not None:
        store.minimum_order_amount = Decimal(str(store_data.minimum_order_amount))
    if store_data.estimated_prep_time_minutes is not None:
        store.estimated_prep_time_minutes = store_data.estimated_prep_time_minutes
    if store_data.is_active is not None:
        store.is_active = store_data.is_active
    if store_data.status is not None:
        store.status = store_data.status
    
    # Handle primary store change
    if store_data.is_primary is not None and store_data.is_primary:
        db.query(Store).filter(
            Store.vendor_id == vendor_id,
            Store.id != store.id,
            Store.is_primary == True
        ).update({"is_primary": False})
        store.is_primary = True
    elif store_data.is_primary is not None and not store_data.is_primary:
        store.is_primary = False
    
    db.commit()
    db.refresh(store)
    
    return {"message": "Store updated successfully"}


@router.delete("/{store_id}", response_model=dict)
async def delete_store(
    store_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Delete a store"""
    vendor_id = UUID(current_vendor["vendor_id"])
    
    store = db.query(Store).filter(
        Store.id == UUID(store_id),
        Store.vendor_id == vendor_id
    ).first()
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    # Check if there are active orders for this store
    from app.models.order import Order
    active_orders = db.query(Order).filter(
        Order.store_id == store.id,
        Order.status.in_(["new", "accepted", "picking", "ready"])
    ).count()
    
    if active_orders > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete store with {active_orders} active orders"
        )
    
    db.delete(store)
    db.commit()
    
    return {"message": "Store deleted successfully"}


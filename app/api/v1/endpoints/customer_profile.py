"""
Customer profile and address management endpoints
"""
import math
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.customer import Customer, CustomerAddress
from app.models.store import Store
from app.models.platform_settings import PlatformSettings
from app.api.v1.dependencies import get_current_customer
from app.schemas.customer import CustomerResponse, CustomerProfileUpdate, CustomerAddressCreate, CustomerAddressUpdate
from uuid import UUID
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance between two (lat, lon) points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def _geocode_address(address: str) -> Optional[tuple]:
    """Geocode address string to (lat, lon) using Nominatim. Returns None on failure."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": address, "format": "json", "limit": 1},
                headers={"User-Agent": "eazyfoods-app/1.0 (contact@eazyfoods.ca)"},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            if not data or not isinstance(data, list):
                return None
            first = data[0]
            lat = first.get("lat")
            lon = first.get("lon")
            if lat is None or lon is None:
                return None
            return (float(lat), float(lon))
    except Exception as e:
        logger.warning("Geocode fallback failed: %s", e)
        return None


@router.get("/config")
async def get_customer_public_config(db: Session = Depends(get_db)):
    """Public config for customer app (allow_guest_checkout, default_delivery_fee, distance-based delivery). No auth required."""
    out = {"allow_guest_checkout": True, "default_delivery_fee": 5.0, "use_distance_based_delivery": False, "delivery_fee_per_km": 1.0}
    ps_customer = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "customer").first()
    if ps_customer and isinstance(getattr(ps_customer, "settings_data", None), dict):
        out["allow_guest_checkout"] = bool(ps_customer.settings_data.get("allow_guest_checkout", True))
    ps_orders = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "orders").first()
    if ps_orders and isinstance(getattr(ps_orders, "settings_data", None), dict):
        od = ps_orders.settings_data
        fee = od.get("delivery_fee")
        if fee is not None:
            try:
                out["default_delivery_fee"] = float(fee)
            except (TypeError, ValueError):
                pass
        if od.get("use_distance_based_delivery"):
            out["use_distance_based_delivery"] = True
        per_km = od.get("delivery_fee_per_km")
        if per_km is not None:
            try:
                out["delivery_fee_per_km"] = float(per_km)
            except (TypeError, ValueError):
                pass
    return out


@router.get("/delivery-estimate", response_model=dict)
async def get_delivery_estimate(
    store_id: str = Query(..., description="Store ID"),
    street_address: str = Query(..., description="Delivery street address"),
    city: str = Query(..., description="Delivery city"),
    state: Optional[str] = Query("", description="Delivery state/province"),
    postal_code: str = Query(..., description="Delivery postal code"),
    country: str = Query("Canada", description="Delivery country"),
    db: Session = Depends(get_db)
):
    """
    Get delivery distance (km) and delivery fee based on store address and delivery address.
    When use_distance_based_delivery is enabled, fee = distance_km * delivery_fee_per_km; otherwise returns default_delivery_fee.
    """
    store = db.query(Store).filter(Store.id == UUID(store_id), Store.is_active == True).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    ps_orders = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "orders").first()
    orders_data = (ps_orders.settings_data or {}) if ps_orders else {}
    default_fee = float(orders_data.get("delivery_fee", 5.99))
    use_distance = bool(orders_data.get("use_distance_based_delivery", False))
    fee_per_km = float(orders_data.get("delivery_fee_per_km", 1.0))

    store_address = f"{store.street_address or ''}, {store.city or ''}, {store.state or ''} {store.postal_code or ''}, {store.country or 'Canada'}".replace(", ,", ",").strip()
    delivery_address = f"{street_address}, {city}, {state} {postal_code}, {country}".replace(", ,", ",").strip()

    distance_km = None
    from app.services.maps_service import maps_service
    if maps_service.is_available():
        distance_km = maps_service.get_distance_km_from_addresses(store_address, delivery_address)

    # Fallback when Maps API unavailable: geocode both addresses (postal code etc.) then haversine
    if distance_km is None and use_distance:
        try:
            store_coords = await _geocode_address(store_address)
            delivery_coords = await _geocode_address(delivery_address)
            if store_coords and delivery_coords:
                store_lat, store_lon = store_coords
                delivery_lat, delivery_lon = delivery_coords
                straight_line_km = _haversine_km(store_lat, store_lon, delivery_lat, delivery_lon)
                # Straight-line is shorter than driving; use ~1.5x to approximate route distance (so $/km matches admin rate)
                distance_km = straight_line_km * 1.5
        except (TypeError, ValueError) as e:
            logger.warning("Delivery estimate fallback failed: %s", e)

    if use_distance and distance_km is not None and fee_per_km >= 0:
        delivery_fee = round(distance_km * fee_per_km, 2)
        return {"distance_km": round(distance_km, 2), "delivery_fee": delivery_fee}
    return {"distance_km": distance_km, "delivery_fee": default_fee}


@router.get("/me", response_model=CustomerResponse)
async def get_customer_profile(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get current customer's profile"""
    customer_id = UUID(current_customer["customer_id"])
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return CustomerResponse(
        id=str(customer.id),
        email=customer.email,
        first_name=customer.first_name,
        last_name=customer.last_name,
        phone=customer.phone,
        is_email_verified=customer.is_email_verified,
        created_at=customer.created_at
    )


@router.put("/me", response_model=CustomerResponse)
async def update_customer_profile(
    update_data: CustomerProfileUpdate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Update current customer's profile (first_name, last_name, phone)"""
    customer_id = UUID(current_customer["customer_id"])
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return CustomerResponse(
        id=str(customer.id),
        email=customer.email,
        first_name=customer.first_name,
        last_name=customer.last_name,
        phone=customer.phone,
        is_email_verified=customer.is_email_verified,
        created_at=customer.created_at
    )


@router.get("/addresses", response_model=List[dict])
async def get_customer_addresses(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all addresses for current customer"""
    customer_id = UUID(current_customer["customer_id"])
    addresses = db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == customer_id
    ).all()
    
    return [
        {
            "id": str(addr.id),
            "street_address": addr.street_address,
            "city": addr.city,
            "state": addr.state,
            "postal_code": addr.postal_code,
            "country": addr.country,
            "is_default": addr.is_default,
            "latitude": float(addr.latitude) if addr.latitude else None,
            "longitude": float(addr.longitude) if addr.longitude else None
        }
        for addr in addresses
    ]


@router.post("/addresses", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_customer_address(
    address_data: CustomerAddressCreate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Create a new address for current customer"""
    customer_id = UUID(current_customer["customer_id"])
    
    # If this is set as default, unset other defaults
    if address_data.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.is_default == True
        ).update({"is_default": False})
    
    address = CustomerAddress(
        customer_id=customer_id,
        street_address=address_data.street_address,
        city=address_data.city,
        state=address_data.state,
        postal_code=address_data.postal_code,
        country=address_data.country,
        is_default=address_data.is_default,
        latitude=address_data.latitude,
        longitude=address_data.longitude
    )
    
    db.add(address)
    db.commit()
    db.refresh(address)
    
    return {
        "id": str(address.id),
        "street_address": address.street_address,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "country": address.country,
        "is_default": address.is_default
    }


@router.put("/addresses/{address_id}", response_model=dict)
async def update_customer_address(
    address_id: str,
    address_data: CustomerAddressUpdate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Update a customer address"""
    customer_id = UUID(current_customer["customer_id"])
    addr_id = UUID(address_id)
    
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.customer_id == customer_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # If setting as default, unset other defaults
    if address_data.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.is_default == True,
            CustomerAddress.id != addr_id
        ).update({"is_default": False})
    
    # Update fields
    update_data = address_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(address, key, value)
    
    db.commit()
    db.refresh(address)
    
    return {
        "id": str(address.id),
        "street_address": address.street_address,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "country": address.country,
        "is_default": address.is_default
    }


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_address(
    address_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Delete a customer address"""
    customer_id = UUID(current_customer["customer_id"])
    addr_id = UUID(address_id)
    
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.customer_id == customer_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    db.delete(address)
    db.commit()


@router.put("/addresses/{address_id}/set-default", response_model=dict)
async def set_default_address(
    address_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Set an address as default"""
    customer_id = UUID(current_customer["customer_id"])
    addr_id = UUID(address_id)
    
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.customer_id == customer_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # Unset other defaults
    db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == customer_id,
        CustomerAddress.is_default == True
    ).update({"is_default": False})
    
    # Set this as default
    address.is_default = True
    db.commit()
    db.refresh(address)
    
    return {
        "id": str(address.id),
        "is_default": address.is_default
    }


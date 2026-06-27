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
from app.models.order import Order
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
    """Public config for customer app (allow_guest_checkout, delivery fee type and params). No auth required."""
    out = {"allow_guest_checkout": True, "default_delivery_fee": 5.0, "use_distance_based_delivery": False, "delivery_fee_per_km": 1.0, "delivery_fee_type": "flat"}
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
        fee_type = (od.get("delivery_fee_type") or "flat").strip().lower()
        if fee_type in ("flat", "per_km", "dynamic"):
            out["delivery_fee_type"] = fee_type
        if od.get("use_distance_based_delivery") or fee_type in ("per_km", "dynamic"):
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
    lat: Optional[float] = Query(None, description="Delivery latitude (from frontend autocomplete — skips geocoding)"),
    lng: Optional[float] = Query(None, description="Delivery longitude (from frontend autocomplete — skips geocoding)"),
    order_value: Optional[float] = Query(None, description="Order subtotal for dynamic fee (optional)"),
    db: Session = Depends(get_db)
):
    """
    Get delivery distance (km) and delivery fee. Uses admin setting delivery_fee_type:
    - flat: default_delivery_fee
    - per_km: distance_km * delivery_fee_per_km
    - dynamic: base_fee + tiered distance + traffic/demand multipliers + small order fee
    """
    try:
        store = db.query(Store).filter(Store.id == UUID(store_id), Store.is_active == True).first()
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        ps_orders = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "orders").first()
        orders_data = (ps_orders.settings_data or {}) if ps_orders else {}

        def _safe_float(val, default):
            try:
                return float(val) if val is not None else default
            except (TypeError, ValueError):
                return default

        default_fee = _safe_float(orders_data.get("delivery_fee"), 5.99)
        delivery_fee_type = (orders_data.get("delivery_fee_type") or "flat").strip().lower()
        if delivery_fee_type not in ("flat", "per_km", "dynamic"):
            delivery_fee_type = "flat"
        use_distance = delivery_fee_type in ("per_km", "dynamic") or bool(orders_data.get("use_distance_based_delivery", False))
        fee_per_km = _safe_float(orders_data.get("delivery_fee_per_km"), 1.0)

        if not use_distance:
            return {"distance_km": None, "delivery_fee": default_fee}

        store_address = f"{store.street_address or ''}, {store.city or ''}, {store.state or ''} {store.postal_code or ''}, {store.country or 'Canada'}".replace(", ,", ",").strip()
        delivery_address = f"{street_address}, {city}, {state} {postal_code}, {country}".replace(", ,", ",").strip()
        store_country = store.country or "Canada"
        postal_only = f"{postal_code}, {country}".strip()
        store_postal_only = f"{store.postal_code}, {store_country}".strip() if store.postal_code else None

        store_lat_raw = getattr(store, "latitude", None)
        store_lng_raw = getattr(store, "longitude", None)
        store_lat = _safe_float(store_lat_raw, None)
        store_lng = _safe_float(store_lng_raw, None)

        distance_km = None
        from app.services.maps_service import maps_service

        # ── Resolve delivery coordinates ──────────────────────────────────
        # Fast path: exact coords from Google Places Autocomplete
        d_coords = (lat, lng) if lat is not None and lng is not None else None

        # Geocode via Google Maps if available (billing must be enabled)
        if d_coords is None and maps_service.is_available():
            d_coords = maps_service.geocode_address(delivery_address)
            if d_coords is None and postal_code:
                d_coords = maps_service.geocode_address(postal_only)

        # Nominatim fallback (free, no billing required)
        if d_coords is None:
            d_coords = await _geocode_address(delivery_address)
        if d_coords is None and postal_code:
            d_coords = await _geocode_address(postal_only)

        # ── Resolve store coordinates ─────────────────────────────────────
        s_coords = (store_lat, store_lng) if store_lat is not None and store_lng is not None else None
        if s_coords is None and maps_service.is_available():
            s_coords = maps_service.geocode_address(store_address)
            if s_coords is None and store_postal_only:
                s_coords = maps_service.geocode_address(store_postal_only)
        if s_coords is None:
            s_coords = await _geocode_address(store_address)
        if s_coords is None and store_postal_only:
            s_coords = await _geocode_address(store_postal_only)

        # ── Calculate distance ────────────────────────────────────────────
        if d_coords and s_coords:
            if maps_service.is_available():
                driving = maps_service.get_distance_km(s_coords[0], s_coords[1], d_coords[0], d_coords[1])
                if driving is not None:
                    distance_km = driving
            if distance_km is None:
                distance_km = round(_haversine_km(s_coords[0], s_coords[1], d_coords[0], d_coords[1]) * 1.35, 2)

        if distance_km is None and maps_service.is_available():
            distance_km = maps_service.get_distance_km_from_addresses(store_address, delivery_address)
        if distance_km is None and maps_service.is_available() and postal_code:
            distance_km = maps_service.get_distance_km_from_addresses(store_postal_only or store_address, postal_only)

        if distance_km is not None:
            if delivery_fee_type == "dynamic":
                from app.services.delivery_fee_service import calculate_dynamic_delivery_fee
                order_val = _safe_float(order_value, 0.0)
                traffic = orders_data.get("dynamic_current_traffic") or "normal"
                demand = orders_data.get("dynamic_current_demand") or "low"
                delivery_fee = calculate_dynamic_delivery_fee(distance_km, order_val, traffic, demand, orders_data)
                return {"distance_km": round(distance_km, 2), "delivery_fee": delivery_fee}
            else:
                delivery_fee = round(distance_km * fee_per_km, 2)
                return {"distance_km": round(distance_km, 2), "delivery_fee": delivery_fee}

        return {"distance_km": None, "delivery_fee": default_fee}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delivery-estimate unexpected error: %s", e, exc_info=True)
        try:
            ps_orders = db.query(PlatformSettings).filter(PlatformSettings.setting_type == "orders").first()
            orders_data = (ps_orders.settings_data or {}) if ps_orders else {}
            fallback_fee = float(orders_data.get("delivery_fee") or 5.99)
        except Exception:
            fallback_fee = 5.99
        return {"distance_km": None, "delivery_fee": fallback_fee}


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
    
    # Null out orders that reference this address (FK constraint would block deletion)
    db.query(Order).filter(Order.delivery_address_id == addr_id).update(
        {Order.delivery_address_id: None}, synchronize_session=False
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


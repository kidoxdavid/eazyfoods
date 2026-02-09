"""
Driver portal endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.models.driver import Driver, Delivery
from app.models.order import Order, OrderStatus
from app.models.customer import CustomerAddress
from app.api.v1.dependencies import get_current_driver
from app.schemas.driver import (
    DriverResponse, DriverProfileUpdate, DeliveryResponse, DeliveryAddressDisplay,
    DeliveryAcceptRequest, DeliveryStatusUpdate
)
from uuid import UUID
from decimal import Decimal

router = APIRouter()


def _parse_dt(data: Optional[dict], key: str):
    """Parse optional datetime from request body (ISO string or None)."""
    if not data or key not in data or data[key] is None:
        return None
    val = data[key]
    if hasattr(val, "isoformat"):
        return val
    if isinstance(val, str):
        try:
            s = val.replace("Z", "+00:00")
            return datetime.fromisoformat(s)
        except Exception:
            return None
    return None


def _safe_float(val):
    """Convert to float for DB or JSON; return None on failure."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


@router.get("/me", response_model=DriverResponse)
async def get_driver_profile(
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Get current driver's profile"""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return DriverResponse(
        id=str(driver.id),
        email=driver.email,
        phone=driver.phone,
        first_name=driver.first_name,
        last_name=driver.last_name,
        street_address=driver.street_address,
        city=driver.city,
        state=driver.state,
        postal_code=driver.postal_code,
        country=driver.country,
        vehicle_type=driver.vehicle_type,
        vehicle_make=driver.vehicle_make,
        vehicle_model=driver.vehicle_model,
        vehicle_year=driver.vehicle_year,
        vehicle_color=driver.vehicle_color,
        license_plate=driver.license_plate,
        driver_license_number=driver.driver_license_number,
        verification_status=driver.verification_status,
        is_active=driver.is_active,
        is_available=driver.is_available,
        total_deliveries=driver.total_deliveries,
        completed_deliveries=driver.completed_deliveries,
        average_rating=float(driver.average_rating) if driver.average_rating else None,
        total_earnings=float(driver.total_earnings) if driver.total_earnings else None,
        delivery_radius_km=float(driver.delivery_radius_km) if driver.delivery_radius_km else None,
        preferred_delivery_zones=driver.preferred_delivery_zones or [],
        bank_account_name=driver.bank_account_name,
        bank_account_number=driver.bank_account_number,
        bank_routing_number=driver.bank_routing_number,
        bank_name=driver.bank_name,
        created_at=driver.created_at
    )


@router.put("/me", response_model=DriverResponse)
async def update_driver_profile(
    profile_data: DriverProfileUpdate,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Update driver profile"""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Update fields
    update_data = profile_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(driver, key, value)
    
    driver.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(driver)
    
    return DriverResponse(
        id=str(driver.id),
        email=driver.email,
        phone=driver.phone,
        first_name=driver.first_name,
        last_name=driver.last_name,
        street_address=driver.street_address,
        city=driver.city,
        state=driver.state,
        postal_code=driver.postal_code,
        country=driver.country,
        vehicle_type=driver.vehicle_type,
        vehicle_make=driver.vehicle_make,
        vehicle_model=driver.vehicle_model,
        vehicle_year=driver.vehicle_year,
        vehicle_color=driver.vehicle_color,
        license_plate=driver.license_plate,
        driver_license_number=driver.driver_license_number,
        verification_status=driver.verification_status,
        is_active=driver.is_active,
        is_available=driver.is_available,
        total_deliveries=driver.total_deliveries,
        completed_deliveries=driver.completed_deliveries,
        average_rating=float(driver.average_rating) if driver.average_rating else None,
        total_earnings=float(driver.total_earnings) if driver.total_earnings else None,
        delivery_radius_km=float(driver.delivery_radius_km) if driver.delivery_radius_km else None,
        preferred_delivery_zones=driver.preferred_delivery_zones or [],
        bank_account_name=driver.bank_account_name,
        bank_account_number=driver.bank_account_number,
        bank_routing_number=driver.bank_routing_number,
        bank_name=driver.bank_name,
        created_at=driver.created_at
    )


@router.put("/availability", response_model=dict)
async def update_availability(
    is_available: bool = Query(...),
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Update driver availability status"""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver.is_available = is_available
    driver.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Availability updated", "is_available": is_available}


@router.get("/dashboard/stats", response_model=dict)
async def get_dashboard_stats(
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Dashboard stats computed from actual Delivery records for accuracy."""
    driver_id = UUID(current_driver["driver_id"])
    base = db.query(Delivery).filter(Delivery.driver_id == driver_id)
    total_deliveries = base.count()
    completed_deliveries = base.filter(Delivery.status == "delivered").count()
    active_deliveries = base.filter(
        Delivery.status.in_(["accepted", "picked_up", "in_transit"])
    ).count()
    earnings_row = db.query(func.coalesce(func.sum(Delivery.driver_earnings), 0)).filter(
        Delivery.driver_id == driver_id,
        Delivery.status == "delivered"
    ).scalar()
    total_earnings = float(earnings_row) if earnings_row is not None else 0.0
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    average_rating = float(driver.average_rating) if driver and driver.average_rating is not None else None
    return {
        "total_deliveries": total_deliveries,
        "completed_deliveries": completed_deliveries,
        "active_deliveries": active_deliveries,
        "total_earnings": total_earnings,
        "average_rating": average_rating,
    }


@router.put("/location", response_model=dict)
async def update_location(
    latitude: float,
    longitude: float,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Update driver's current location"""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver.current_location_latitude = Decimal(str(latitude))
    driver.current_location_longitude = Decimal(str(longitude))
    driver.last_location_update = datetime.utcnow()
    driver.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Location updated"}


@router.get("/available-orders", response_model=List[dict])
async def get_available_orders(
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Get orders available for delivery (ready status, no driver assigned)"""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver or not driver.is_available:
        return []
    
    # Get orders that are ready for pickup and don't have a driver assigned
    orders = db.query(Order).filter(
        Order.status == "ready",
        Order.delivery_method == "delivery",
        Order.driver_id.is_(None)
    ).all()
    
    from app.models.chef import Chef
    result = []
    for order in orders:
        delivery_address = None
        if order.delivery_address_id:
            delivery_address = db.query(CustomerAddress).filter(
                CustomerAddress.id == order.delivery_address_id
            ).first()
        # Pickup: vendor (store) or chef
        if order.vendor_id and order.vendor:
            pickup_name = order.vendor.business_name
            pickup_street = order.vendor.street_address or ""
            pickup_city = order.vendor.city or ""
            pickup_state = order.vendor.state or ""
            pickup_postal = order.vendor.postal_code or ""
        elif order.chef_id:
            chef = db.query(Chef).filter(Chef.id == order.chef_id).first()
            pickup_name = (chef.chef_name or f"{chef.first_name} {chef.last_name}") if chef else "Chef"
            pickup_street = chef.street_address if chef else ""
            pickup_city = chef.city if chef else ""
            pickup_state = chef.state if chef else ""
            pickup_postal = chef.postal_code if chef else ""
        else:
            pickup_name = "N/A"
            pickup_street = pickup_city = pickup_state = pickup_postal = ""
        result.append({
            "id": str(order.id),
            "order_number": order.order_number,
            "vendor_name": pickup_name,
            "total_amount": float(order.total_amount),
            "delivery_fee": float(order.shipping_amount),
            "pickup_address": {
                "street": pickup_street,
                "city": pickup_city,
                "state": pickup_state,
                "postal_code": pickup_postal,
            },
            "delivery_address": {
                "street": delivery_address.street_address if delivery_address else "",
                "city": delivery_address.city if delivery_address else "",
                "state": delivery_address.state if delivery_address else "",
                "postal_code": delivery_address.postal_code if delivery_address else "",
                "latitude": float(delivery_address.latitude) if delivery_address and delivery_address.latitude else None,
                "longitude": float(delivery_address.longitude) if delivery_address and delivery_address.longitude else None,
            },
            "ready_at": order.ready_at.isoformat() if order.ready_at else None,
            "created_at": order.created_at.isoformat()
        })
    
    return result


@router.post("/deliveries/{order_id}/accept")
async def accept_delivery(
    order_id: str,
    body: Optional[dict] = Body(None),
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Accept a delivery order"""
    try:
        return _do_accept_delivery(order_id, body, current_driver, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Accept delivery failed: {str(e)}")


def _do_accept_delivery(order_id: str, body: Optional[dict], current_driver: dict, db: Session):
    """Core accept delivery logic."""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver or not driver.is_available:
        raise HTTPException(status_code=400, detail="Driver is not available")
    
    order = db.query(Order).filter(Order.id == UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if (order.delivery_method or "").strip().lower() != "delivery":
        raise HTTPException(status_code=400, detail="Order is not a delivery order")
    if order.status != "ready":
        raise HTTPException(status_code=400, detail="Order is not ready for pickup")
    if order.driver_id:
        raise HTTPException(status_code=400, detail="Order already has a driver assigned")

    # Get delivery address
    delivery_address = None
    if order.delivery_address_id:
        delivery_address = db.query(CustomerAddress).filter(
            CustomerAddress.id == order.delivery_address_id
        ).first()

    # Pickup coords from vendor if available
    pickup_lat = pickup_lon = None
    try:
        if order.vendor_id and order.vendor:
            v = order.vendor
            if v.latitude is not None and v.longitude is not None:
                pickup_lat = v.latitude
                pickup_lon = v.longitude
    except Exception:
        pass

    shipping = order.shipping_amount if order.shipping_amount is not None else Decimal("0")
    delivery_fee_val = float(shipping)
    driver_earnings_val = float(shipping * Decimal("0.80"))

    # Safe delivery lat/lon from address
    delivery_lat = _safe_float(delivery_address.latitude) if delivery_address else None
    delivery_lon = _safe_float(delivery_address.longitude) if delivery_address else None

    est_pickup = _parse_dt(body, "estimated_pickup_time") or datetime.utcnow() + timedelta(minutes=15)
    est_delivery = _parse_dt(body, "estimated_delivery_time") or datetime.utcnow() + timedelta(minutes=45)

    try:
        delivery = Delivery(
            order_id=order.id,
            driver_id=driver.id,
            status="accepted",
            accepted_at=datetime.utcnow(),
            pickup_latitude=Decimal(str(pickup_lat)) if pickup_lat is not None else None,
            pickup_longitude=Decimal(str(pickup_lon)) if pickup_lon is not None else None,
            delivery_latitude=Decimal(str(delivery_lat)) if delivery_lat is not None else None,
            delivery_longitude=Decimal(str(delivery_lon)) if delivery_lon is not None else None,
            estimated_pickup_time=est_pickup,
            estimated_delivery_time=est_delivery,
            delivery_fee=Decimal(str(delivery_fee_val)),
            driver_earnings=Decimal(str(driver_earnings_val)),
        )
        order.driver_id = driver.id
        db.add(delivery)
        db.commit()
        db.refresh(delivery)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Could not save delivery: {str(e)}")

    def _dt_iso(d):
        if d is None:
            return None
        return d.isoformat() if hasattr(d, "isoformat") else d

    def _num(v):
        return _safe_float(v) if v is not None else None

    return {
        "id": str(delivery.id),
        "order_id": str(delivery.order_id),
        "driver_id": str(delivery.driver_id),
        "status": delivery.status,
        "pickup_latitude": _num(delivery.pickup_latitude),
        "pickup_longitude": _num(delivery.pickup_longitude),
        "delivery_latitude": _num(delivery.delivery_latitude),
        "delivery_longitude": _num(delivery.delivery_longitude),
        "estimated_pickup_time": _dt_iso(delivery.estimated_pickup_time),
        "estimated_delivery_time": _dt_iso(delivery.estimated_delivery_time),
        "actual_pickup_time": _dt_iso(getattr(delivery, "actual_pickup_time", None)),
        "actual_delivery_time": _dt_iso(getattr(delivery, "actual_delivery_time", None)),
        "distance_km": _num(delivery.distance_km),
        "delivery_fee": _num(delivery.delivery_fee),
        "driver_earnings": _num(delivery.driver_earnings),
        "current_latitude": None,
        "current_longitude": None,
        "route_polyline": getattr(delivery, "route_polyline", None),
        "route_distance_km": _num(getattr(delivery, "route_distance_km", None)),
        "route_duration_seconds": getattr(delivery, "route_duration_seconds", None),
        "current_eta_minutes": getattr(delivery, "current_eta_minutes", None),
        "last_location_update": _dt_iso(getattr(delivery, "last_location_update", None)),
        "created_at": _dt_iso(delivery.created_at),
    }


@router.post("/deliveries/{order_id}/reject", response_model=dict)
async def reject_delivery(
    order_id: str,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Decline an available delivery (order remains available for other drivers)"""
    driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    order = db.query(Order).filter(Order.id == UUID(order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "ready" or order.delivery_method != "delivery":
        raise HTTPException(status_code=400, detail="Order is not available for delivery")

    if order.driver_id:
        raise HTTPException(status_code=400, detail="Order already has a driver assigned")

    # No DB change; order stays in available list for other drivers
    return {"message": "Delivery declined", "order_id": order_id}


@router.get("/deliveries", response_model=List[DeliveryResponse])
async def get_my_deliveries(
    status_filter: Optional[str] = Query(None),
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Get driver's deliveries with order number and delivery address."""
    query = db.query(Delivery).filter(
        Delivery.driver_id == UUID(current_driver["driver_id"])
    )
    if status_filter:
        query = query.filter(Delivery.status == status_filter)
    deliveries = query.order_by(Delivery.created_at.desc()).all()
    if not deliveries:
        return []
    order_ids = [d.order_id for d in deliveries]
    orders = {o.id: o for o in db.query(Order).filter(Order.id.in_(order_ids)).all()}
    address_ids = [o.delivery_address_id for o in orders.values() if getattr(o, 'delivery_address_id', None)]
    addresses = {}
    if address_ids:
        for addr in db.query(CustomerAddress).filter(CustomerAddress.id.in_(address_ids)).all():
            addresses[addr.id] = addr
    out = []
    for d in deliveries:
        order = orders.get(d.order_id)
        order_number = order.order_number if order else None
        delivery_address_display = None
        if order and getattr(order, 'delivery_address_id', None):
            addr = addresses.get(order.delivery_address_id)
            if addr:
                delivery_address_display = DeliveryAddressDisplay(
                    street=addr.street_address,
                    city=addr.city,
                    state=addr.state,
                    postal_code=addr.postal_code,
                )
        out.append(DeliveryResponse(
            id=str(d.id),
            order_id=str(d.order_id),
            driver_id=str(d.driver_id),
            status=d.status,
            order_number=order_number,
            delivery_address=delivery_address_display,
            pickup_latitude=float(d.pickup_latitude) if d.pickup_latitude else None,
            pickup_longitude=float(d.pickup_longitude) if d.pickup_longitude else None,
            delivery_latitude=float(d.delivery_latitude) if d.delivery_latitude else None,
            delivery_longitude=float(d.delivery_longitude) if d.delivery_longitude else None,
            current_latitude=float(d.current_latitude) if d.current_latitude else None,
            current_longitude=float(d.current_longitude) if d.current_longitude else None,
            estimated_pickup_time=d.estimated_pickup_time,
            estimated_delivery_time=d.estimated_delivery_time,
            actual_pickup_time=d.actual_pickup_time,
            actual_delivery_time=d.actual_delivery_time,
            distance_km=float(d.distance_km) if d.distance_km else None,
            delivery_fee=float(d.delivery_fee) if d.delivery_fee else None,
            driver_earnings=float(d.driver_earnings) if d.driver_earnings else None,
            route_polyline=getattr(d, 'route_polyline', None),
            route_distance_km=float(d.route_distance_km) if hasattr(d, 'route_distance_km') and d.route_distance_km else None,
            route_duration_seconds=getattr(d, 'route_duration_seconds', None),
            current_eta_minutes=getattr(d, 'current_eta_minutes', None),
            last_location_update=getattr(d, 'last_location_update', None),
            created_at=d.created_at,
        ))
    return out


@router.put("/deliveries/{delivery_id}/status", response_model=DeliveryResponse)
async def update_delivery_status(
    delivery_id: str,
    status_data: DeliveryStatusUpdate,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Update delivery status (picked_up, in_transit, delivered)"""
    delivery = db.query(Delivery).filter(
        Delivery.id == UUID(delivery_id),
        Delivery.driver_id == UUID(current_driver["driver_id"])
    ).first()
    
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Update status
    delivery.status = status_data.status
    delivery.updated_at = datetime.utcnow()
    
    # Update timestamps based on status
    if status_data.status == "picked_up" and not delivery.picked_up_at:
        delivery.picked_up_at = datetime.utcnow()
        delivery.actual_pickup_time = datetime.utcnow()
        # Update order status
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if order:
            order.status = "picked_up"
            order.picked_up_at = datetime.utcnow()
    
    elif status_data.status == "delivered" and not delivery.delivered_at:
        delivery.delivered_at = datetime.utcnow()
        delivery.actual_delivery_time = datetime.utcnow()
        # Update order status
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if order:
            order.status = "delivered"
            order.delivered_at = datetime.utcnow()
        # Update driver stats
        driver = db.query(Driver).filter(Driver.id == delivery.driver_id).first()
        if driver:
            driver.completed_deliveries += 1
            driver.total_deliveries += 1
            driver.total_earnings += delivery.driver_earnings or Decimal("0")
    
    # Update location if provided
    if status_data.latitude and status_data.longitude:
        delivery.current_latitude = Decimal(str(status_data.latitude))
        delivery.current_longitude = Decimal(str(status_data.longitude))
        if hasattr(delivery, 'last_location_update'):
            delivery.last_location_update = datetime.utcnow()
        
        # Update driver's current location
        driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
        if driver:
            driver.current_location_latitude = Decimal(str(status_data.latitude))
            driver.current_location_longitude = Decimal(str(status_data.longitude))
            driver.last_location_update = datetime.utcnow()
    
    if status_data.notes:
        delivery.driver_notes = status_data.notes
    
    db.commit()
    db.refresh(delivery)
    order = db.query(Order).filter(Order.id == delivery.order_id).first()
    order_number = order.order_number if order else None
    delivery_address_display = None
    if order and getattr(order, 'delivery_address_id', None):
        addr = db.query(CustomerAddress).filter(CustomerAddress.id == order.delivery_address_id).first()
        if addr:
            delivery_address_display = DeliveryAddressDisplay(
                street=addr.street_address,
                city=addr.city,
                state=addr.state,
                postal_code=addr.postal_code,
            )
    return DeliveryResponse(
        id=str(delivery.id),
        order_id=str(delivery.order_id),
        driver_id=str(delivery.driver_id),
        status=delivery.status,
        order_number=order_number,
        delivery_address=delivery_address_display,
        pickup_latitude=float(delivery.pickup_latitude) if delivery.pickup_latitude else None,
        pickup_longitude=float(delivery.pickup_longitude) if delivery.pickup_longitude else None,
        delivery_latitude=float(delivery.delivery_latitude) if delivery.delivery_latitude else None,
        delivery_longitude=float(delivery.delivery_longitude) if delivery.delivery_longitude else None,
        current_latitude=float(delivery.current_latitude) if delivery.current_latitude else None,
        current_longitude=float(delivery.current_longitude) if delivery.current_longitude else None,
        estimated_pickup_time=delivery.estimated_pickup_time,
        estimated_delivery_time=delivery.estimated_delivery_time,
        actual_pickup_time=delivery.actual_pickup_time,
        actual_delivery_time=delivery.actual_delivery_time,
        distance_km=float(delivery.distance_km) if delivery.distance_km else None,
        delivery_fee=float(delivery.delivery_fee) if delivery.delivery_fee else None,
        driver_earnings=float(delivery.driver_earnings) if delivery.driver_earnings else None,
        route_polyline=getattr(delivery, 'route_polyline', None),
        route_distance_km=float(delivery.route_distance_km) if hasattr(delivery, 'route_distance_km') and delivery.route_distance_km else None,
        route_duration_seconds=getattr(delivery, 'route_duration_seconds', None),
        current_eta_minutes=getattr(delivery, 'current_eta_minutes', None),
        last_location_update=getattr(delivery, 'last_location_update', None),
        created_at=delivery.created_at,
    )


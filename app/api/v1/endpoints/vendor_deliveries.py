"""
Vendor delivery management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.order import Order
from app.models.driver import Driver, Delivery
from app.models.vendor import Vendor
from app.models.customer import Customer
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


def _delivery_row(order, delivery, db: Session):
    """Build a single delivery list row from Order and optional Delivery."""
    customer_name = None
    customer_phone = None
    if order.customer_id:
        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
        if customer:
            customer_name = f"{customer.first_name} {customer.last_name}"
            customer_phone = customer.phone
    if delivery:
        driver = db.query(Driver).filter(Driver.id == delivery.driver_id).first()
        return {
            "id": str(delivery.id),
            "order_id": str(delivery.order_id),
            "order_number": order.order_number,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "driver_id": str(delivery.driver_id),
            "driver_name": f"{driver.first_name} {driver.last_name}" if driver else None,
            "driver_phone": driver.phone if driver else None,
            "driver_vehicle": f"{driver.vehicle_type} {driver.license_plate or ''}".strip() if driver else None,
            "status": delivery.status,
            "accepted_at": delivery.accepted_at.isoformat() if delivery.accepted_at else None,
            "picked_up_at": delivery.actual_pickup_time.isoformat() if delivery.actual_pickup_time else None,
            "delivered_at": delivery.actual_delivery_time.isoformat() if delivery.actual_delivery_time else None,
            "estimated_pickup_time": delivery.estimated_pickup_time.isoformat() if delivery.estimated_pickup_time else None,
            "estimated_delivery_time": delivery.estimated_delivery_time.isoformat() if delivery.estimated_delivery_time else None,
            "distance_km": float(delivery.distance_km) if delivery.distance_km else None,
            "delivery_fee": float(delivery.delivery_fee) if delivery.delivery_fee else None,
            "total_amount": float(order.total_amount),
            "delivery_address": None,
            "customer_rating": delivery.customer_rating,
            "customer_feedback": delivery.customer_feedback,
            "created_at": delivery.created_at.isoformat() if delivery.created_at else None,
        }
    # No delivery record yet: order is ready, delivery method, no driver (awaiting_driver)
    return {
        "id": None,
        "order_id": str(order.id),
        "order_number": order.order_number,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "driver_id": None,
        "driver_name": None,
        "driver_phone": None,
        "driver_vehicle": None,
        "status": "awaiting_driver",
        "accepted_at": None,
        "picked_up_at": None,
        "delivered_at": None,
        "estimated_pickup_time": order.ready_at.isoformat() if order.ready_at else None,
        "estimated_delivery_time": None,
        "distance_km": None,
        "delivery_fee": float(order.shipping_amount) if order.shipping_amount else None,
        "total_amount": float(order.total_amount),
        "delivery_address": None,
        "customer_rating": None,
        "customer_feedback": None,
        "created_at": order.ready_at.isoformat() if order.ready_at else None,
    }


@router.get("/", response_model=List[dict])
async def get_vendor_deliveries(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all deliveries for vendor's orders. Includes orders ready for delivery with no driver yet (awaiting_driver)."""
    vendor_id = UUID(current_vendor["vendor_id"])

    # 1) Orders ready, delivery method, no driver assigned (no Delivery row yet)
    awaiting_orders = (
        db.query(Order)
        .filter(
            Order.vendor_id == vendor_id,
            Order.delivery_method == "delivery",
            Order.status == "ready",
            Order.driver_id.is_(None),
        )
        .order_by(Order.ready_at.desc().nullslast())
        .all()
    )
    # 2) Deliveries (orders that have a Delivery record)
    delivery_query = (
        db.query(Delivery)
        .join(Order, Delivery.order_id == Order.id)
        .filter(Order.vendor_id == vendor_id)
    )
    if status_filter and status_filter not in (None, "all", "awaiting_driver"):
        delivery_query = delivery_query.filter(Delivery.status == status_filter)
    all_deliveries = delivery_query.order_by(Delivery.created_at.desc()).all()
    orders_with_delivery = {d.order_id: d for d in all_deliveries}

    result = []
    if status_filter == "awaiting_driver":
        for order in awaiting_orders:
            if order.id not in orders_with_delivery:
                result.append(_delivery_row(order, None, db))
        return result[skip : skip + limit]
    if status_filter and status_filter not in (None, "all"):
        for delivery in all_deliveries:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order:
                result.append(_delivery_row(order, delivery, db))
        return result[skip : skip + limit]
    # All: combine awaiting_driver + assigned deliveries, sort by date desc, then paginate
    for order in awaiting_orders:
        if order.id not in orders_with_delivery:
            result.append(_delivery_row(order, None, db))
    for delivery in all_deliveries:
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if order:
            result.append(_delivery_row(order, delivery, db))
    result.sort(key=lambda r: (r["created_at"] or ""), reverse=True)
    return result[skip : skip + limit]


@router.get("/stats", response_model=dict)
async def get_delivery_stats(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get delivery statistics for vendor"""
    vendor_id = UUID(current_vendor["vendor_id"])

    # Orders ready for delivery but no driver yet
    awaiting_driver = (
        db.query(Order)
        .filter(
            Order.vendor_id == vendor_id,
            Order.delivery_method == "delivery",
            Order.status == "ready",
            Order.driver_id.is_(None),
        )
        .count()
    )

    # Deliveries (orders with a Delivery record)
    deliveries_query = db.query(Delivery).join(
        Order, Delivery.order_id == Order.id
    ).filter(Order.vendor_id == vendor_id)

    total_deliveries = deliveries_query.count()
    completed_deliveries = deliveries_query.filter(Delivery.status == "delivered").count()
    in_transit = deliveries_query.filter(Delivery.status == "in_transit").count()
    pending = deliveries_query.filter(Delivery.status == "pending").count()
    accepted = deliveries_query.filter(Delivery.status == "accepted").count()
    picked_up = deliveries_query.filter(Delivery.status == "picked_up").count()
    
    # Average delivery time (for completed deliveries)
    completed = deliveries_query.filter(Delivery.status == "delivered").all()
    avg_delivery_time = None
    if completed:
        total_time = 0
        count = 0
        for delivery in completed:
            if delivery.actual_pickup_time and delivery.actual_delivery_time:
                time_diff = (delivery.actual_delivery_time - delivery.actual_pickup_time).total_seconds() / 60  # minutes
                total_time += time_diff
                count += 1
        if count > 0:
            avg_delivery_time = total_time / count
    
    return {
        "total_deliveries": total_deliveries,
        "awaiting_driver": awaiting_driver,
        "completed_deliveries": completed_deliveries,
        "in_transit": in_transit,
        "pending": pending,
        "accepted": accepted,
        "picked_up": picked_up,
        "average_delivery_time_minutes": round(avg_delivery_time, 1) if avg_delivery_time else None,
        "completion_rate": round((completed_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0, 1),
    }


@router.get("/available-drivers", response_model=dict)
async def get_available_drivers_count(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get count of available drivers (for vendor's delivery area)"""
    vendor_id = UUID(current_vendor["vendor_id"])
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Count available drivers (active and available)
    available_count = db.query(func.count(Driver.id)).filter(
        Driver.is_active == True,
        Driver.is_available == True,
        Driver.verification_status == "approved"
    ).scalar() or 0
    
    return {
        "available_drivers": available_count,
        "message": f"{available_count} driver(s) available for deliveries"
    }


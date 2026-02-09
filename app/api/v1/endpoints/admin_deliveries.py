"""
Admin delivery management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.driver import Delivery
from app.models.order import Order
from app.api.v1.dependencies import get_current_admin

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_deliveries(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    driver_id: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all deliveries"""
    query = db.query(Delivery)
    
    if status_filter:
        query = query.filter(Delivery.status == status_filter)
    
    if driver_id:
        query = query.filter(Delivery.driver_id == UUID(driver_id))
    
    deliveries = query.order_by(Delivery.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for delivery in deliveries:
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        result.append({
            "id": str(delivery.id),
            "order_id": str(delivery.order_id),
            "order_number": order.order_number if order else "N/A",
            "driver_id": str(delivery.driver_id),
            "driver_name": f"{delivery.driver.first_name} {delivery.driver.last_name}" if delivery.driver else "N/A",
            "status": delivery.status,
            "pickup_latitude": float(delivery.pickup_latitude) if delivery.pickup_latitude else None,
            "pickup_longitude": float(delivery.pickup_longitude) if delivery.pickup_longitude else None,
            "delivery_latitude": float(delivery.delivery_latitude) if delivery.delivery_latitude else None,
            "delivery_longitude": float(delivery.delivery_longitude) if delivery.delivery_longitude else None,
            "estimated_pickup_time": delivery.estimated_pickup_time.isoformat() if delivery.estimated_pickup_time else None,
            "estimated_delivery_time": delivery.estimated_delivery_time.isoformat() if delivery.estimated_delivery_time else None,
            "actual_pickup_time": delivery.actual_pickup_time.isoformat() if delivery.actual_pickup_time else None,
            "actual_delivery_time": delivery.actual_delivery_time.isoformat() if delivery.actual_delivery_time else None,
            "distance_km": float(delivery.distance_km) if delivery.distance_km else None,
            "delivery_fee": float(delivery.delivery_fee) if delivery.delivery_fee else None,
            "driver_earnings": float(delivery.driver_earnings) if delivery.driver_earnings else None,
            "customer_rating": delivery.customer_rating,
            "created_at": delivery.created_at.isoformat()
        })
    
    return result


@router.get("/stats/overview", response_model=dict)
async def get_delivery_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get delivery statistics"""
    total_deliveries = db.query(func.count(Delivery.id)).scalar() or 0
    pending_deliveries = db.query(func.count(Delivery.id)).filter(Delivery.status == "pending").scalar() or 0
    in_transit = db.query(func.count(Delivery.id)).filter(Delivery.status == "in_transit").scalar() or 0
    completed = db.query(func.count(Delivery.id)).filter(Delivery.status == "delivered").scalar() or 0
    cancelled = db.query(func.count(Delivery.id)).filter(Delivery.status == "cancelled").scalar() or 0
    
    total_earnings = db.query(func.sum(Delivery.driver_earnings)).scalar() or 0
    
    return {
        "total_deliveries": total_deliveries,
        "pending_deliveries": pending_deliveries,
        "in_transit": in_transit,
        "completed": completed,
        "cancelled": cancelled,
        "total_driver_earnings": float(total_earnings) if total_earnings else 0.0
    }


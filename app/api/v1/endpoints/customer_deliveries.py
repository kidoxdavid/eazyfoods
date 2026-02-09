"""
Customer delivery rating endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.driver import Driver, Delivery
from app.models.order import Order
from app.api.v1.dependencies import get_current_customer
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

router = APIRouter()


class DriverRatingRequest(BaseModel):
    rating: int  # 1-5
    feedback: Optional[str] = None


@router.post("/{delivery_id}/rate", response_model=dict)
async def rate_driver(
    delivery_id: str,
    rating_data: DriverRatingRequest,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Rate a driver after delivery"""
    customer_id = UUID(current_customer["customer_id"])
    delivery_uuid = UUID(delivery_id)
    
    # Validate rating
    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    # Get delivery and verify it belongs to customer's order
    delivery = db.query(Delivery).filter(Delivery.id == delivery_uuid).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Verify the order belongs to this customer
    order = db.query(Order).filter(Order.id == delivery.order_id).first()
    if not order or order.customer_id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only rate deliveries for your own orders"
        )
    
    # Check if delivery is completed
    if delivery.status != "delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only rate completed deliveries"
        )
    
    # Check if already rated
    if delivery.customer_rating is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this delivery"
        )
    
    # Update delivery rating
    delivery.customer_rating = rating_data.rating
    delivery.customer_feedback = rating_data.feedback
    db.commit()
    
    # Update driver's average rating
    driver = db.query(Driver).filter(Driver.id == delivery.driver_id).first()
    if driver:
        # Get all completed deliveries with ratings for this driver
        rated_deliveries = db.query(Delivery).filter(
            Delivery.driver_id == driver.id,
            Delivery.status == "delivered",
            Delivery.customer_rating.isnot(None)
        ).all()
        
        if rated_deliveries:
            total_ratings = sum(d.customer_rating for d in rated_deliveries)
            driver.average_rating = total_ratings / len(rated_deliveries)
            driver.total_ratings = len(rated_deliveries)
        else:
            driver.average_rating = rating_data.rating
            driver.total_ratings = 1
        
        db.commit()
    
    return {
        "message": "Driver rated successfully",
        "rating": rating_data.rating,
        "driver_average_rating": float(driver.average_rating) if driver else None
    }


@router.get("/{delivery_id}", response_model=dict)
async def get_delivery_info(
    delivery_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get delivery information for customer's order"""
    customer_id = UUID(current_customer["customer_id"])
    delivery_uuid = UUID(delivery_id)
    
    delivery = db.query(Delivery).filter(Delivery.id == delivery_uuid).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Verify the order belongs to this customer
    order = db.query(Order).filter(Order.id == delivery.order_id).first()
    if not order or order.customer_id != customer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    driver = db.query(Driver).filter(Driver.id == delivery.driver_id).first()
    
    return {
        "id": str(delivery.id),
        "order_id": str(delivery.order_id),
        "order_number": order.order_number if order else None,
        "driver_id": str(delivery.driver_id),
        "driver_name": f"{driver.first_name} {driver.last_name}" if driver else None,
        "driver_phone": driver.phone if driver else None,
        "driver_vehicle": f"{driver.vehicle_type} {driver.license_plate or ''}".strip() if driver else None,
        "status": delivery.status,
        "customer_rating": delivery.customer_rating,
        "customer_feedback": delivery.customer_feedback,
        "estimated_delivery_time": delivery.estimated_delivery_time.isoformat() if delivery.estimated_delivery_time else None,
        "actual_delivery_time": delivery.actual_delivery_time.isoformat() if delivery.actual_delivery_time else None,
        "distance_km": float(delivery.distance_km) if delivery.distance_km else None
    }


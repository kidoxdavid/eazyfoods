"""
Delivery tracking endpoints for GPS routing and ETA
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.core.database import get_db
from app.models.driver import Driver, Delivery
from app.models.order import Order
from app.models.customer import CustomerAddress
from app.api.v1.dependencies import get_current_driver, get_current_customer
from app.schemas.driver import LocationUpdate, TrackingDataResponse
from app.services.maps_service import maps_service

router = APIRouter()


@router.post("/driver/deliveries/{delivery_id}/update-location", response_model=dict)
async def update_driver_location(
    delivery_id: str,
    location_data: LocationUpdate,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Update driver's current location and recalculate ETA"""
    try:
        # Get delivery
        delivery = db.query(Delivery).filter(
            Delivery.id == UUID(delivery_id),
            Delivery.driver_id == UUID(current_driver["driver_id"])
        ).first()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        # Update delivery location
        delivery.current_latitude = Decimal(str(location_data.latitude))
        delivery.current_longitude = Decimal(str(location_data.longitude))
        if hasattr(delivery, 'last_location_update'):
            delivery.last_location_update = datetime.utcnow()
        
        # Update driver's current location
        driver = db.query(Driver).filter(Driver.id == UUID(current_driver["driver_id"])).first()
        if driver:
            driver.current_location_latitude = Decimal(str(location_data.latitude))
            driver.current_location_longitude = Decimal(str(location_data.longitude))
            driver.last_location_update = datetime.utcnow()
        
        # Calculate ETA if we have delivery coordinates
        if delivery.delivery_latitude and delivery.delivery_longitude:
            eta_minutes = maps_service.calculate_eta(
                float(location_data.latitude),
                float(location_data.longitude),
                float(delivery.delivery_latitude),
                float(delivery.delivery_longitude)
            )
            
            if eta_minutes is not None and hasattr(delivery, 'current_eta_minutes'):
                delivery.current_eta_minutes = eta_minutes
                
                # Also update route details if not set
                if hasattr(delivery, 'route_polyline') and not delivery.route_polyline:
                    route_details = maps_service.get_route_details(
                        float(location_data.latitude),
                        float(location_data.longitude),
                        float(delivery.delivery_latitude),
                        float(delivery.delivery_longitude)
                    )
                    if route_details:
                        if hasattr(delivery, 'route_polyline'):
                            delivery.route_polyline = route_details.get('polyline')
                        if hasattr(delivery, 'route_distance_km'):
                            delivery.route_distance_km = Decimal(str(route_details.get('distance_km', 0)))
                        if hasattr(delivery, 'route_duration_seconds'):
                            delivery.route_duration_seconds = route_details.get('duration_seconds')
        
        db.commit()
        db.refresh(delivery)
        
        return {
            "message": "Location updated",
            "eta_minutes": getattr(delivery, 'current_eta_minutes', None),
            "last_update": delivery.last_location_update.isoformat() if hasattr(delivery, 'last_location_update') and delivery.last_location_update else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update location: {str(e)}")


@router.get("/customer/deliveries/{delivery_id}/tracking", response_model=TrackingDataResponse)
async def get_tracking_data(
    delivery_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get real-time tracking data for customer"""
    try:
        # Get delivery with order
        delivery = db.query(Delivery).filter(Delivery.id == UUID(delivery_id)).first()
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        # Verify customer owns the order
        order = db.query(Order).filter(Order.id == delivery.order_id).first()
        if not order or str(order.customer_id) != current_customer["customer_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get driver info
        driver = db.query(Driver).filter(Driver.id == delivery.driver_id).first()
        
        # Get customer delivery address
        customer_location = None
        if delivery.delivery_latitude and delivery.delivery_longitude:
            customer_location = {
                "lat": float(delivery.delivery_latitude),
                "lng": float(delivery.delivery_longitude)
            }
        
        # Get driver location
        driver_location = None
        if delivery.current_latitude and delivery.current_longitude:
            driver_location = {
                "lat": float(delivery.current_latitude),
                "lng": float(delivery.current_longitude)
            }
            
            # Recalculate ETA if we have both locations
            if customer_location and maps_service.is_available():
                eta_minutes = maps_service.calculate_eta(
                    float(delivery.current_latitude),
                    float(delivery.current_longitude),
                    float(delivery.delivery_latitude),
                    float(delivery.delivery_longitude)
                )
                if eta_minutes is not None and hasattr(delivery, 'current_eta_minutes'):
                    delivery.current_eta_minutes = eta_minutes
                    db.commit()
        
        # Calculate distance if we have both locations
        distance_km = None
        if driver_location and customer_location and maps_service.is_available():
            distance_km = maps_service.get_distance_km(
                driver_location["lat"],
                driver_location["lng"],
                customer_location["lat"],
                customer_location["lng"]
            )
        
        return TrackingDataResponse(
            delivery_id=str(delivery.id),
            driver_location=driver_location,
            customer_location=customer_location,
            eta_minutes=getattr(delivery, 'current_eta_minutes', None),
            distance_km=distance_km,
            status=delivery.status,
            route_polyline=getattr(delivery, 'route_polyline', None),
            driver_name=f"{driver.first_name} {driver.last_name}" if driver else None,
            driver_phone=driver.phone if driver else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tracking data: {str(e)}")


@router.get("/driver/deliveries/{delivery_id}/route", response_model=dict)
async def get_delivery_route(
    delivery_id: str,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Get optimized route for delivery"""
    try:
        delivery = db.query(Delivery).filter(
            Delivery.id == UUID(delivery_id),
            Delivery.driver_id == UUID(current_driver["driver_id"])
        ).first()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        
        # Get route if we have coordinates
        if (delivery.current_latitude and delivery.current_longitude and
            delivery.delivery_latitude and delivery.delivery_longitude):
            
            route_details = maps_service.get_route_details(
                float(delivery.current_latitude),
                float(delivery.current_longitude),
                float(delivery.delivery_latitude),
                float(delivery.delivery_longitude)
            )
            
            if route_details:
                # Update delivery with route info
                if hasattr(delivery, 'route_polyline'):
                    delivery.route_polyline = route_details.get('polyline')
                if hasattr(delivery, 'route_distance_km'):
                    delivery.route_distance_km = Decimal(str(route_details.get('distance_km', 0)))
                if hasattr(delivery, 'route_duration_seconds'):
                    delivery.route_duration_seconds = route_details.get('duration_seconds')
                if hasattr(delivery, 'current_eta_minutes'):
                    delivery.current_eta_minutes = route_details.get('duration_minutes')
                db.commit()
                
                return {
                    "polyline": route_details.get('polyline'),
                    "distance_km": route_details.get('distance_km'),
                    "duration_minutes": route_details.get('duration_minutes'),
                    "duration_seconds": route_details.get('duration_seconds'),
                    "start_address": route_details.get('start_address'),
                    "end_address": route_details.get('end_address')
                }
        
        return {
            "message": "Route not available. Location data missing.",
            "polyline": None,
            "distance_km": None,
            "duration_minutes": None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get route: {str(e)}")


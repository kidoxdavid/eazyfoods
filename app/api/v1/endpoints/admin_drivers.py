"""
Admin driver management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.core.database import get_db
from app.models.driver import Driver
from app.api.v1.dependencies import get_current_admin
from app.schemas.driver import DriverResponse

router = APIRouter()


@router.get("", response_model=List[dict])
@router.get("/", response_model=List[dict])
async def get_all_drivers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    verification_filter: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all drivers"""
    query = db.query(Driver)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Driver.email.ilike(search_term),
                Driver.first_name.ilike(search_term),
                Driver.last_name.ilike(search_term),
                Driver.phone.ilike(search_term),
                Driver.license_plate.ilike(search_term)
            )
        )
    
    if status_filter == "active":
        query = query.filter(Driver.is_active == True, Driver.is_available == True)
    elif status_filter == "inactive":
        query = query.filter(Driver.is_active == False)
    elif status_filter == "unavailable":
        query = query.filter(Driver.is_active == True, Driver.is_available == False)
    
    if verification_filter:
        query = query.filter(Driver.verification_status == verification_filter)
    
    drivers = query.order_by(Driver.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for driver in drivers:
        result.append({
            "id": str(driver.id),
            "email": driver.email,
            "phone": driver.phone,
            "first_name": driver.first_name,
            "last_name": driver.last_name,
            "vehicle_type": driver.vehicle_type,
            "license_plate": driver.license_plate,
            "verification_status": driver.verification_status,
            "is_active": driver.is_active,
            "is_available": driver.is_available,
            "total_deliveries": driver.total_deliveries,
            "completed_deliveries": driver.completed_deliveries,
            "average_rating": float(driver.average_rating) if driver.average_rating else 0.0,
            "total_earnings": float(driver.total_earnings) if driver.total_earnings else 0.0,
            "city": driver.city,
            "created_at": driver.created_at
        })
    
    return result


@router.get("/{driver_id}", response_model=dict)
async def get_driver_detail(
    driver_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get driver details"""
    # Validate UUID format
    try:
        driver_uuid = UUID(driver_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid driver ID format: {str(e)}"
        )
    
    driver = db.query(Driver).filter(Driver.id == driver_uuid).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    return {
        "id": str(driver.id),
        "email": driver.email,
        "phone": driver.phone,
        "first_name": driver.first_name,
        "last_name": driver.last_name,
        "date_of_birth": driver.date_of_birth.isoformat() if driver.date_of_birth else None,
        "street_address": driver.street_address,
        "city": driver.city,
        "state": driver.state,
        "postal_code": driver.postal_code,
        "country": driver.country,
        "vehicle_type": driver.vehicle_type,
        "vehicle_make": driver.vehicle_make,
        "vehicle_model": driver.vehicle_model,
        "vehicle_year": driver.vehicle_year,
        "vehicle_color": driver.vehicle_color,
        "license_plate": driver.license_plate,
        "driver_license_number": driver.driver_license_number,
        "driver_license_url": driver.driver_license_url,
        "vehicle_registration_url": driver.vehicle_registration_url,
        "insurance_document_url": driver.insurance_document_url,
        "verification_status": driver.verification_status,
        "verification_notes": driver.verification_notes,
        "is_active": driver.is_active,
        "is_available": driver.is_available,
        "total_deliveries": driver.total_deliveries,
        "completed_deliveries": driver.completed_deliveries,
        "cancelled_deliveries": driver.cancelled_deliveries,
        "average_rating": float(driver.average_rating) if driver.average_rating else 0.0,
        "total_ratings": driver.total_ratings,
        "total_earnings": float(driver.total_earnings) if driver.total_earnings else 0.0,
        "delivery_radius_km": float(driver.delivery_radius_km) if driver.delivery_radius_km else None,
        "created_at": driver.created_at,
        "verified_at": driver.verified_at.isoformat() if driver.verified_at else None
    }


@router.put("/{driver_id}/verify", response_model=dict)
async def verify_driver(
    driver_id: str,
    verification_status: str = Query(...),
    verification_notes: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Verify/approve or reject a driver"""
    # Validate UUID format
    try:
        driver_uuid = UUID(driver_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid driver ID format: {str(e)}"
        )
    
    driver = db.query(Driver).filter(Driver.id == driver_uuid).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    if verification_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid verification status")
    
    driver.verification_status = verification_status
    driver.verification_notes = verification_notes
    driver.verified_at = datetime.utcnow()
    
    if verification_status == "approved":
        driver.is_active = True
    else:
        driver.is_active = False
    
    driver.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Driver {verification_status} successfully", "driver_id": str(driver.id)}


@router.put("/{driver_id}/toggle-active", response_model=dict)
async def toggle_driver_active(
    driver_id: str,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle driver active status"""
    # Validate UUID format
    try:
        driver_uuid = UUID(driver_id)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid driver ID format: {str(e)}"
        )
    
    driver = db.query(Driver).filter(Driver.id == driver_uuid).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found"
        )
    
    driver.is_active = not driver.is_active
    if not driver.is_active:
        driver.is_available = False  # Can't be available if inactive
    driver.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"Driver {'activated' if driver.is_active else 'deactivated'}", "is_active": driver.is_active}


@router.get("/stats/overview", response_model=dict)
async def get_driver_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get driver statistics overview"""
    total_drivers = db.query(func.count(Driver.id)).scalar() or 0
    active_drivers = db.query(func.count(Driver.id)).filter(Driver.is_active == True).scalar() or 0
    available_drivers = db.query(func.count(Driver.id)).filter(
        Driver.is_active == True,
        Driver.is_available == True
    ).scalar() or 0
    pending_verification = db.query(func.count(Driver.id)).filter(
        Driver.verification_status == "pending"
    ).scalar() or 0
    
    total_deliveries = db.query(func.sum(Driver.total_deliveries)).scalar() or 0
    total_earnings = db.query(func.sum(Driver.total_earnings)).scalar() or 0
    
    return {
        "total_drivers": total_drivers,
        "active_drivers": active_drivers,
        "available_drivers": available_drivers,
        "pending_verification": pending_verification,
        "total_deliveries": int(total_deliveries),
        "total_earnings": float(total_earnings) if total_earnings else 0.0
    }


"""
Driver authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.driver import Driver
from app.core.security import get_password_hash
from app.schemas.driver import DriverSignup

router = APIRouter()


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def driver_signup(
    driver_data: DriverSignup,
    db: Session = Depends(get_db)
):
    """Driver signup - can be called from customer portal"""
    try:
        # Check if email already exists
        existing = db.query(Driver).filter(Driver.email == driver_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate required fields
        if not driver_data.email or not driver_data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )
        
        if not driver_data.first_name or not driver_data.last_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="First name and last name are required"
            )
        
        if not driver_data.phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required"
            )
        
        if not driver_data.street_address or not driver_data.city or not driver_data.postal_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Street address, city, and postal code are required"
            )
        
        # Create driver with proper defaults - handle None values properly
        driver_kwargs = {
            "email": driver_data.email,
            "password_hash": get_password_hash(driver_data.password),
            "first_name": driver_data.first_name,
            "last_name": driver_data.last_name,
            "phone": driver_data.phone,
            "street_address": driver_data.street_address,
            "city": driver_data.city,
            "postal_code": driver_data.postal_code,
            "verification_status": "pending",
            "is_active": False,  # Inactive until admin approves
            "is_available": False
        }
        
        # Add optional fields only if they have values
        if driver_data.state:
            driver_kwargs["state"] = driver_data.state
        
        if driver_data.country:
            driver_kwargs["country"] = driver_data.country
        else:
            driver_kwargs["country"] = "Canada"  # Default
        
        if driver_data.vehicle_type:
            driver_kwargs["vehicle_type"] = driver_data.vehicle_type
        
        if driver_data.vehicle_make:
            driver_kwargs["vehicle_make"] = driver_data.vehicle_make
        
        if driver_data.vehicle_model:
            driver_kwargs["vehicle_model"] = driver_data.vehicle_model
        
        if driver_data.vehicle_year is not None:
            driver_kwargs["vehicle_year"] = driver_data.vehicle_year
        
        if driver_data.vehicle_color:
            driver_kwargs["vehicle_color"] = driver_data.vehicle_color
        
        if driver_data.license_plate:
            driver_kwargs["license_plate"] = driver_data.license_plate
        
        if driver_data.driver_license_number:
            driver_kwargs["driver_license_number"] = driver_data.driver_license_number

        if driver_data.driver_license_url:
            driver_kwargs["driver_license_url"] = driver_data.driver_license_url
        if driver_data.driver_license_validity:
            driver_kwargs["driver_license_validity"] = driver_data.driver_license_validity
        if driver_data.vehicle_registration_url:
            driver_kwargs["vehicle_registration_url"] = driver_data.vehicle_registration_url
        if driver_data.vehicle_registration_validity:
            driver_kwargs["vehicle_registration_validity"] = driver_data.vehicle_registration_validity
        if driver_data.insurance_document_url:
            driver_kwargs["insurance_document_url"] = driver_data.insurance_document_url
        if driver_data.insurance_validity:
            driver_kwargs["insurance_validity"] = driver_data.insurance_validity
        
        # Handle preferred_delivery_zones
        if driver_data.preferred_delivery_zones:
            driver_kwargs["preferred_delivery_zones"] = driver_data.preferred_delivery_zones
        
        driver = Driver(**driver_kwargs)
        
        db.add(driver)
        db.commit()
        db.refresh(driver)
        
        return {
            "message": "Driver application submitted successfully. You will be notified once your application is reviewed.",
            "driver_id": str(driver.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Error creating driver: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create driver account: {str(e)}"
        )



"""
Driver authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import get_db
from app.models.driver import Driver
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.schemas.driver import DriverSignup

router = APIRouter()


class GoogleTokenBody(BaseModel):
    id_token: str


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


@router.post("/login", response_model=dict)
async def driver_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Driver login"""
    driver = db.query(Driver).filter(Driver.email == form_data.username).first()
    
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not driver.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in. Please use Sign in with Google.",
        )
    if not verify_password(form_data.password, driver.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if driver is active
    if not driver.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your driver account is not active. Please contact support."
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": driver.email, "driver_id": str(driver.id)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "driver_id": str(driver.id)
    }


@router.post("/google", response_model=dict)
async def driver_google(body: GoogleTokenBody):
    """Google sign-in disabled temporarily."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google sign-in is temporarily disabled. Please use email and password.",
    )


"""
Chef authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.core.database import get_db
from app.models.chef import Chef
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.schemas.chef import ChefResponse
from app.api.v1.dependencies import get_current_chef

router = APIRouter()


class GoogleTokenBody(BaseModel):
    id_token: str


class ChefSignup(BaseModel):
    email: EmailStr
    password: str
    phone: str
    first_name: str
    last_name: str
    chef_name: Optional[str] = None
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "Canada"
    cuisines: List[str] = []


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def chef_signup(
    chef_data: ChefSignup,
    db: Session = Depends(get_db)
):
    """Chef signup"""
    try:
        # Check if email already exists
        existing = db.query(Chef).filter(Chef.email == chef_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate required fields
        if not chef_data.cuisines or len(chef_data.cuisines) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one cuisine type is required"
            )
        
        # Create chef
        chef = Chef(
            email=chef_data.email,
            password_hash=get_password_hash(chef_data.password),
            phone=chef_data.phone,
            first_name=chef_data.first_name,
            last_name=chef_data.last_name,
            chef_name=chef_data.chef_name or f"{chef_data.first_name} {chef_data.last_name}",
            street_address=chef_data.street_address,
            city=chef_data.city,
            state=chef_data.state,
            postal_code=chef_data.postal_code,
            country=chef_data.country,
            cuisines=chef_data.cuisines,
            verification_status="pending",
            is_active=False,  # Inactive until admin verifies
            is_available=False
        )
        
        db.add(chef)
        db.commit()
        db.refresh(chef)
        
        return {
            "message": "Chef account created successfully. Please wait for admin verification.",
            "chef_id": str(chef.id),
            "verification_status": chef.verification_status
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating chef: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating chef account: {str(e)}"
        )


@router.post("/login", response_model=dict)
async def chef_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Chef login"""
    try:
        chef = db.query(Chef).filter(Chef.email == form_data.username).first()
        if not chef:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not chef.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google sign-in. Please use Sign in with Google.",
            )
        if not verify_password(form_data.password, chef.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not chef.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chef account is not active. Please wait for admin verification."
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": chef.email, "role": "chef", "chef_id": str(chef.id)},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "chef": {
                "id": str(chef.id),
                "email": chef.email,
                "chef_name": chef.chef_name,
                "verification_status": chef.verification_status,
                "is_available": chef.is_available
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chef login: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {str(e)}"
        )


@router.post("/google", response_model=dict)
async def chef_google(body: GoogleTokenBody):
    """Google sign-in disabled temporarily."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google sign-in is temporarily disabled. Please use email and password.",
    )


@router.get("/me", response_model=ChefResponse)
async def get_me(
    current_chef: dict = Depends(get_current_chef),
    db: Session = Depends(get_db)
):
    """Get current chef profile"""
    try:
        from uuid import UUID
        chef = db.query(Chef).filter(Chef.id == UUID(current_chef["chef_id"])).first()
        
        if not chef:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chef not found"
            )
        
        # Convert Decimal to float for JSON serialization
        chef_dict = {
            "id": str(chef.id),
            "email": chef.email,
            "phone": chef.phone,
            "phone_verified": chef.phone_verified or False,
            "first_name": chef.first_name,
            "last_name": chef.last_name,
            "chef_name": chef.chef_name,
            "bio": chef.bio,
            "street_address": chef.street_address,
            "city": chef.city,
            "state": chef.state,
            "postal_code": chef.postal_code,
            "country": chef.country or "Canada",
            "cuisines": chef.cuisines or [],
            "cuisine_description": chef.cuisine_description,
            "profile_image_url": chef.profile_image_url,
            "banner_image_url": chef.banner_image_url,
            "latitude": float(chef.latitude) if chef.latitude else None,
            "longitude": float(chef.longitude) if chef.longitude else None,
            "verification_status": chef.verification_status or "pending",
            "verified_at": chef.verified_at,
            "is_active": chef.is_active if chef.is_active is not None else False,
            "is_available": chef.is_available if chef.is_available is not None else False,
            "service_radius_km": float(chef.service_radius_km) if chef.service_radius_km else None,
            "minimum_order_amount": float(chef.minimum_order_amount) if chef.minimum_order_amount else None,
            "service_fee": float(chef.service_fee) if chef.service_fee else None,
            "estimated_prep_time_minutes": chef.estimated_prep_time_minutes or 60,
            "accepts_online_payment": chef.accepts_online_payment if chef.accepts_online_payment is not None else True,
            "accepts_cash_on_delivery": chef.accepts_cash_on_delivery if chef.accepts_cash_on_delivery is not None else True,
            "social_media_links": chef.social_media_links,
            "website_url": chef.website_url,
            "average_rating": float(chef.average_rating) if chef.average_rating else None,
            "total_reviews": chef.total_reviews or 0,
            "gallery_images": chef.gallery_images or [],
            "created_at": chef.created_at,
            "updated_at": chef.updated_at
        }
        
        return ChefResponse(**chef_dict)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_me: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching chef profile: {str(e)}"
        )


"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from datetime import timedelta
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.core.google_auth import verify_google_id_token
from app.schemas.auth import Token, VendorLogin, VendorSignup
from app.models.vendor import Vendor, VendorUser
from app.models.store import Store
from decimal import Decimal

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class GoogleTokenBody(BaseModel):
    id_token: str


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
async def vendor_signup(
    vendor_data: VendorSignup,
    db: Session = Depends(get_db)
):
    """
    Vendor signup endpoint
    Creates a new vendor account and store owner user
    """
    # Check if email already exists
    existing_vendor = db.query(Vendor).filter(Vendor.email == vendor_data.email).first()
    if existing_vendor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create vendor
    vendor = Vendor(
        business_name=vendor_data.business_name,
        email=vendor_data.email,
        phone=vendor_data.phone,
        street_address=vendor_data.street_address,
        city=vendor_data.city,
        state=vendor_data.state if vendor_data.state else None,
        postal_code=vendor_data.postal_code,
        country=vendor_data.country if vendor_data.country else "Canada",
        business_type=vendor_data.business_type,
        password_hash=get_password_hash(vendor_data.password),
        status="onboarding"
    )
    
    db.add(vendor)
    db.flush()  # Get vendor ID
    
    # Create store owner user
    owner_user = VendorUser(
        vendor_id=vendor.id,
        email=vendor_data.email,
        password_hash=vendor.password_hash,
        first_name=vendor_data.first_name,
        last_name=vendor_data.last_name,
        phone=vendor_data.phone,
        role="store_owner"
    )
    
    db.add(owner_user)
    db.flush()
    
    # Auto-create primary store from vendor signup data
    primary_store = Store(
        vendor_id=vendor.id,
        name=f"{vendor_data.business_name} - Main Store",
        store_code=None,
        description=f"Primary store for {vendor_data.business_name}",
        street_address=vendor_data.street_address,
        city=vendor_data.city,
        state=vendor_data.state if vendor_data.state else None,
        postal_code=vendor_data.postal_code,
        country=vendor_data.country if vendor_data.country else "Canada",
        phone=vendor_data.phone,
        email=vendor_data.email,
        operating_hours=None,  # Can be set later
        pickup_available=True,
        delivery_available=True,
        delivery_radius_km=Decimal("5.0"),
        delivery_fee=Decimal("0.00"),
        free_delivery_threshold=None,
        minimum_order_amount=Decimal("0.00"),
        estimated_prep_time_minutes=30,
        is_primary=True,
        is_active=True,
        status="active"
    )
    
    db.add(primary_store)
    db.commit()
    db.refresh(vendor)
    
    return {
        "message": "Vendor account created successfully",
        "vendor_id": str(vendor.id),
        "store_id": str(primary_store.id),
        "status": "onboarding"
    }


@router.post("/login", response_model=Token)
async def vendor_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Vendor login endpoint
    Returns JWT access token
    """
    # Try to find vendor user first, then vendor
    vendor_user = db.query(VendorUser).filter(VendorUser.email == form_data.username).first()
    
    if not vendor_user:
        # Try vendor email
        vendor = db.query(Vendor).filter(Vendor.email == form_data.username).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not vendor.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google sign-in. Please use Sign in with Google.",
            )
        if not verify_password(form_data.password, vendor.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        vendor_id = vendor.id
        user_id = None
        role = "store_owner"
    else:
        if not vendor_user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account uses Google sign-in. Please use Sign in with Google.",
            )
        if not verify_password(form_data.password, vendor_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        vendor_id = vendor_user.vendor_id
        user_id = str(vendor_user.id)
        role = vendor_user.role
    
    # Check if vendor is active
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if vendor.status != "active" and vendor.status != "onboarding":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vendor account is not active"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": form_data.username,
            "vendor_id": str(vendor_id),
            "user_id": user_id,
            "role": role
        },
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": str(vendor_id),
        "role": role
    }


@router.post("/google", response_model=Token)
async def vendor_google(
    body: GoogleTokenBody,
    db: Session = Depends(get_db)
):
    """Sign in or sign up with Google. Creates vendor account if not exists."""
    payload = await verify_google_id_token(body.id_token)
    if not payload or not payload.get("email"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google token")
    email = payload["email"]
    google_id = payload["sub"]
    given_name = payload.get("given_name") or (payload.get("name") or " ").split()[0] or "Vendor"
    family_name = payload.get("family_name") or (payload.get("name") or " ").split()[-1] if (payload.get("name") or " ").strip() and (payload.get("name") or " ").count(" ") else ""
    full_name = f"{given_name} {family_name}".strip() or given_name

    try:
        vendor_user = db.query(VendorUser).filter(
            (VendorUser.email == email) | (VendorUser.google_id == google_id)
        ).first()
        if vendor_user:
            vendor_id = vendor_user.vendor_id
            user_id = str(vendor_user.id)
            role = vendor_user.role
            if not vendor_user.google_id:
                vendor_user.google_id = google_id
                db.commit()
        else:
            vendor = db.query(Vendor).filter(
                (Vendor.email == email) | (Vendor.google_id == google_id)
            ).first()
            if not vendor:
                # Create vendor + store owner + primary store (Google sign-up)
                vendor = Vendor(
                    business_name=full_name or email,
                    business_type="other",
                    email=email,
                    phone="",
                    street_address="",
                    city="",
                    state=None,
                    postal_code="",
                    country="Canada",
                    password_hash=None,
                    google_id=google_id,
                    status="onboarding",
                )
                db.add(vendor)
                db.flush()
                owner_user = VendorUser(
                    vendor_id=vendor.id,
                    email=email,
                    password_hash=None,
                    first_name=given_name,
                    last_name=family_name or given_name,
                    phone="",
                    role="store_owner",
                    google_id=google_id,
                )
                db.add(owner_user)
                db.flush()
                primary_store = Store(
                    vendor_id=vendor.id,
                    name=f"{vendor.business_name} - Main",
                    street_address="",
                    city="",
                    state=None,
                    postal_code="",
                    country="Canada",
                    phone="",
                    email=email,
                    is_primary=True,
                    is_active=True,
                    status="active",
                    delivery_radius_km=Decimal("5.0"),
                    delivery_fee=Decimal("0.00"),
                    minimum_order_amount=Decimal("0.00"),
                    estimated_prep_time_minutes=30,
                )
                db.add(primary_store)
                db.commit()
                db.refresh(vendor)
                user_id = str(owner_user.id)
                role = "store_owner"
        else:
            if not vendor.google_id:
                vendor.google_id = google_id
                db.commit()
            user_id = None
            role = "store_owner"
        vendor_id = vendor.id

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try signing in with email/password or use a different Google account.",
        )
    except OperationalError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again.",
        )
    except SQLAlchemyError as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).exception("Vendor Google sign-in database error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sign-in failed. Please try again or use email/password.",
        )

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if vendor.status not in ("active", "onboarding"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vendor account is not active")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email, "vendor_id": str(vendor_id), "user_id": user_id, "role": role},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "vendor_id": str(vendor_id),
        "role": role
    }


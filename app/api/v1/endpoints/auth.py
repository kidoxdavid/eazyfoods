"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.schemas.auth import VendorSignup
from app.models.vendor import Vendor, VendorUser
from app.models.store import Store
from decimal import Decimal

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


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
        status="onboarding",
        government_id_url=getattr(vendor_data, "government_id_url", None) or None,
        business_registration_url=getattr(vendor_data, "business_registration_url", None) or None,
        tax_permit_url=getattr(vendor_data, "tax_permit_url", None) or None,
        region=getattr(vendor_data, "region", None) or None
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



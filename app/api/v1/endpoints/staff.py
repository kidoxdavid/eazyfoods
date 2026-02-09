"""
Staff management endpoints - manage vendor users (store manager, staff, finance)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.vendor import VendorUser
from app.core.security import get_password_hash
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.api.v1.dependencies import get_current_vendor

router = APIRouter()


@router.get("/", response_model=List[StaffResponse])
async def get_staff(
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get all staff members for current vendor"""
    from uuid import UUID
    
    # Only store owners and managers can view staff
    if current_vendor["role"] not in ["store_owner", "store_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only store owners and managers can view staff"
        )
    
    staff = db.query(VendorUser).filter(
        VendorUser.vendor_id == UUID(current_vendor["vendor_id"])
    ).order_by(VendorUser.created_at.desc()).all()
    
    # Convert to response format with UUIDs as strings
    return [
        {
            "id": str(s.id),
            "vendor_id": str(s.vendor_id),
            "email": s.email,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "phone": s.phone,
            "role": s.role,
            "is_active": s.is_active,
            "last_login_at": str(s.last_login_at) if s.last_login_at else None,
            "created_at": str(s.created_at) if s.created_at else None
        }
        for s in staff
    ]


@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    staff_data: StaffCreate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Create a new staff member"""
    from uuid import UUID
    
    # Only store owners can create staff
    if current_vendor["role"] != "store_owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only store owners can create staff members"
        )
    
    # Check if email already exists for this vendor
    existing = db.query(VendorUser).filter(
        VendorUser.vendor_id == UUID(current_vendor["vendor_id"]),
        VendorUser.email == staff_data.email
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered for this vendor"
        )
    
    staff = VendorUser(
        vendor_id=UUID(current_vendor["vendor_id"]),
        email=staff_data.email,
        password_hash=get_password_hash(staff_data.password),
        first_name=staff_data.first_name,
        last_name=staff_data.last_name,
        phone=staff_data.phone,
        role=staff_data.role,
        is_active=True
    )
    
    db.add(staff)
    db.commit()
    db.refresh(staff)
    
    # Convert to response format
    return {
        "id": str(staff.id),
        "vendor_id": str(staff.vendor_id),
        "email": staff.email,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "phone": staff.phone,
        "role": staff.role,
        "is_active": staff.is_active,
        "last_login_at": str(staff.last_login_at) if staff.last_login_at else None,
        "created_at": staff.created_at if staff.created_at else None
    }


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff_member(
    staff_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Get a specific staff member"""
    from uuid import UUID
    
    if current_vendor["role"] not in ["store_owner", "store_manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    staff = db.query(VendorUser).filter(
        VendorUser.id == UUID(staff_id),
        VendorUser.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Convert to response format
    return {
        "id": str(staff.id),
        "vendor_id": str(staff.vendor_id),
        "email": staff.email,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "phone": staff.phone,
        "role": staff.role,
        "is_active": staff.is_active,
        "last_login_at": str(staff.last_login_at) if staff.last_login_at else None,
        "created_at": staff.created_at if staff.created_at else None
    }


@router.put("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: str,
    staff_update: StaffUpdate,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Update a staff member"""
    from uuid import UUID
    
    # Only store owners can update staff
    if current_vendor["role"] != "store_owner":
        raise HTTPException(status_code=403, detail="Only store owners can update staff")
    
    staff = db.query(VendorUser).filter(
        VendorUser.id == UUID(staff_id),
        VendorUser.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Prevent changing store owner role
    if staff.role == "store_owner":
        raise HTTPException(status_code=400, detail="Cannot modify store owner")
    
    update_data = staff_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(staff, field, value)
    
    db.commit()
    db.refresh(staff)
    
    # Convert to response format
    return {
        "id": str(staff.id),
        "vendor_id": str(staff.vendor_id),
        "email": staff.email,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "phone": staff.phone,
        "role": staff.role,
        "is_active": staff.is_active,
        "last_login_at": str(staff.last_login_at) if staff.last_login_at else None,
        "created_at": staff.created_at if staff.created_at else None
    }


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    staff_id: str,
    current_vendor: dict = Depends(get_current_vendor),
    db: Session = Depends(get_db)
):
    """Delete a staff member"""
    from uuid import UUID
    
    # Only store owners can delete staff
    if current_vendor["role"] != "store_owner":
        raise HTTPException(status_code=403, detail="Only store owners can delete staff")
    
    staff = db.query(VendorUser).filter(
        VendorUser.id == UUID(staff_id),
        VendorUser.vendor_id == UUID(current_vendor["vendor_id"])
    ).first()
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    # Prevent deleting store owner
    if staff.role == "store_owner":
        raise HTTPException(status_code=400, detail="Cannot delete store owner")
    
    db.delete(staff)
    db.commit()
    return None


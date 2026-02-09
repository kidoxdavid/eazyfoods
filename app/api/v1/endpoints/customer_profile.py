"""
Customer profile and address management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.customer import Customer, CustomerAddress
from app.api.v1.dependencies import get_current_customer
from app.schemas.customer import CustomerResponse, CustomerAddressCreate, CustomerAddressUpdate
from uuid import UUID

router = APIRouter()


@router.get("/me", response_model=CustomerResponse)
async def get_customer_profile(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get current customer's profile"""
    customer_id = UUID(current_customer["customer_id"])
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return CustomerResponse(
        id=str(customer.id),
        email=customer.email,
        first_name=customer.first_name,
        last_name=customer.last_name,
        phone=customer.phone,
        is_email_verified=customer.is_email_verified,
        created_at=customer.created_at
    )


@router.get("/addresses", response_model=List[dict])
async def get_customer_addresses(
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all addresses for current customer"""
    customer_id = UUID(current_customer["customer_id"])
    addresses = db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == customer_id
    ).all()
    
    return [
        {
            "id": str(addr.id),
            "street_address": addr.street_address,
            "city": addr.city,
            "state": addr.state,
            "postal_code": addr.postal_code,
            "country": addr.country,
            "is_default": addr.is_default,
            "latitude": float(addr.latitude) if addr.latitude else None,
            "longitude": float(addr.longitude) if addr.longitude else None
        }
        for addr in addresses
    ]


@router.post("/addresses", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_customer_address(
    address_data: CustomerAddressCreate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Create a new address for current customer"""
    customer_id = UUID(current_customer["customer_id"])
    
    # If this is set as default, unset other defaults
    if address_data.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.is_default == True
        ).update({"is_default": False})
    
    address = CustomerAddress(
        customer_id=customer_id,
        street_address=address_data.street_address,
        city=address_data.city,
        state=address_data.state,
        postal_code=address_data.postal_code,
        country=address_data.country,
        is_default=address_data.is_default,
        latitude=address_data.latitude,
        longitude=address_data.longitude
    )
    
    db.add(address)
    db.commit()
    db.refresh(address)
    
    return {
        "id": str(address.id),
        "street_address": address.street_address,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "country": address.country,
        "is_default": address.is_default
    }


@router.put("/addresses/{address_id}", response_model=dict)
async def update_customer_address(
    address_id: str,
    address_data: CustomerAddressUpdate,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Update a customer address"""
    customer_id = UUID(current_customer["customer_id"])
    addr_id = UUID(address_id)
    
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.customer_id == customer_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # If setting as default, unset other defaults
    if address_data.is_default:
        db.query(CustomerAddress).filter(
            CustomerAddress.customer_id == customer_id,
            CustomerAddress.is_default == True,
            CustomerAddress.id != addr_id
        ).update({"is_default": False})
    
    # Update fields
    update_data = address_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(address, key, value)
    
    db.commit()
    db.refresh(address)
    
    return {
        "id": str(address.id),
        "street_address": address.street_address,
        "city": address.city,
        "state": address.state,
        "postal_code": address.postal_code,
        "country": address.country,
        "is_default": address.is_default
    }


@router.delete("/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_address(
    address_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Delete a customer address"""
    customer_id = UUID(current_customer["customer_id"])
    addr_id = UUID(address_id)
    
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.customer_id == customer_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    db.delete(address)
    db.commit()


@router.put("/addresses/{address_id}/set-default", response_model=dict)
async def set_default_address(
    address_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Set an address as default"""
    customer_id = UUID(current_customer["customer_id"])
    addr_id = UUID(address_id)
    
    address = db.query(CustomerAddress).filter(
        CustomerAddress.id == addr_id,
        CustomerAddress.customer_id == customer_id
    ).first()
    
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )
    
    # Unset other defaults
    db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == customer_id,
        CustomerAddress.is_default == True
    ).update({"is_default": False})
    
    # Set this as default
    address.is_default = True
    db.commit()
    db.refresh(address)
    
    return {
        "id": str(address.id),
        "is_default": address.is_default
    }


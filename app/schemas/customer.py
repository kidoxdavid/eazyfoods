"""
Customer schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class CustomerSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True


class CustomerLogin(BaseModel):
    email: EmailStr
    password: str


class CustomerResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    is_email_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class CustomerAddressCreate(BaseModel):
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "Canada"
    is_default: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    class Config:
        from_attributes = True


class CustomerAddressUpdate(BaseModel):
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    class Config:
        from_attributes = True


class AddressCreate(BaseModel):
    type: str  # shipping, billing, both
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "Canada"
    is_default: bool = False
    
    class Config:
        from_attributes = True


class AddressUpdate(BaseModel):
    type: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    is_default: Optional[bool] = None
    
    class Config:
        from_attributes = True


class AddressResponse(BaseModel):
    id: str
    type: str
    street_address: str
    city: str
    state: Optional[str]
    postal_code: str
    country: str
    is_default: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


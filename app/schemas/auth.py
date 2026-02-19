"""
Authentication schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class VendorSignup(BaseModel):
    business_name: str
    email: EmailStr
    password: str
    phone: str
    first_name: str
    last_name: str
    street_address: str
    city: str
    state: str = None
    postal_code: str
    country: str = "Canada"
    business_type: str
    government_id_url: Optional[str] = None
    business_registration_url: Optional[str] = None
    tax_permit_url: Optional[str] = None
    region: Optional[str] = None  # comma-separated, e.g. "West African, East African"

    class Config:
        from_attributes = True


class VendorLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    vendor_id: str
    role: str


"""
Authentication schemas
"""
from pydantic import BaseModel, EmailStr


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


"""
Staff/VendorUser schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StaffCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: str  # store_manager, staff, finance
    
    class Config:
        from_attributes = True


class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    
    class Config:
        from_attributes = True


class StaffResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: str
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


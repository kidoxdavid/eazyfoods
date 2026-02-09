"""
Review schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReviewResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    order_id: Optional[str]
    customer_id: Optional[str]
    rating: int
    title: Optional[str]
    comment: Optional[str]
    is_verified_purchase: bool
    vendor_response: Optional[str]
    vendor_response_at: Optional[datetime]
    created_at: datetime
    customer_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReviewResponseUpdate(BaseModel):
    vendor_response: str
    
    class Config:
        from_attributes = True


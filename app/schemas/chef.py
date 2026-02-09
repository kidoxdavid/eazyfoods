"""
Chef Pydantic schemas
"""
from pydantic import BaseModel, EmailStr, Field, field_serializer
from typing import Optional, List, Union
from datetime import datetime
from decimal import Decimal


class ChefBase(BaseModel):
    email: EmailStr
    phone: str
    first_name: str
    last_name: str
    chef_name: Optional[str] = None
    bio: Optional[str] = None
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "Canada"
    cuisines: List[str] = []
    cuisine_description: Optional[str] = None


class ChefCreate(ChefBase):
    password: str = Field(..., min_length=8)


class ChefUpdate(BaseModel):
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    chef_name: Optional[str] = None
    bio: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    cuisines: Optional[List[str]] = None
    cuisine_description: Optional[str] = None
    profile_image_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    service_radius_km: Optional[Decimal] = None
    minimum_order_amount: Optional[Decimal] = None
    service_fee: Optional[Decimal] = None
    estimated_prep_time_minutes: Optional[int] = None
    accepts_online_payment: Optional[bool] = None
    accepts_cash_on_delivery: Optional[bool] = None
    social_media_links: Optional[dict] = None
    website_url: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    is_available: Optional[bool] = None


class ChefResponse(ChefBase):
    id: str
    phone_verified: Optional[bool] = False
    profile_image_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    verification_status: Optional[str] = "pending"
    verified_at: Optional[datetime] = None
    is_active: Optional[bool] = False
    is_available: Optional[bool] = False
    service_radius_km: Optional[float] = None
    minimum_order_amount: Optional[float] = None
    service_fee: Optional[float] = None
    estimated_prep_time_minutes: Optional[int] = 60
    accepts_online_payment: Optional[bool] = True
    accepts_cash_on_delivery: Optional[bool] = True
    social_media_links: Optional[dict] = None
    website_url: Optional[str] = None
    average_rating: Optional[float] = None
    total_reviews: Optional[int] = 0
    gallery_images: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChefReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    comment: Optional[str] = None
    cuisine_quality: Optional[int] = Field(None, ge=1, le=5)
    service_quality: Optional[int] = Field(None, ge=1, le=5)
    value_for_money: Optional[int] = Field(None, ge=1, le=5)


class ChefReviewCreate(ChefReviewBase):
    chef_id: str


class ChefReviewResponse(ChefReviewBase):
    id: str
    chef_id: str
    customer_id: str
    is_public: bool
    is_verified_purchase: bool
    chef_response: Optional[str] = None
    chef_response_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CustomerAllergyBase(BaseModel):
    allergy_type: str
    severity: str = Field(default="moderate", pattern="^(mild|moderate|severe)$")
    notes: Optional[str] = None


class CustomerAllergyCreate(CustomerAllergyBase):
    pass


class CustomerAllergyResponse(CustomerAllergyBase):
    id: str
    customer_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


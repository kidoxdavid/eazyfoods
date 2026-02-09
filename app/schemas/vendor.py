"""
Vendor schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal


class VendorResponse(BaseModel):
    id: str
    business_name: str
    business_type: str
    email: str
    phone: str
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str
    status: str
    verification_status: str
    average_rating: Optional[Decimal] = None
    total_reviews: int = 0
    # Store profile fields
    description: Optional[str] = None
    store_profile_image_url: Optional[str] = None
    store_banner_image_url: Optional[str] = None
    operating_hours: Optional[dict] = None
    delivery_radius_km: Optional[float] = None
    pickup_available: Optional[bool] = None
    delivery_available: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Enhanced store profile fields
    store_gallery: Optional[List[str]] = None
    store_tags: Optional[List[str]] = None
    store_features: Optional[Dict] = None
    minimum_order_amount: Optional[float] = None
    delivery_fee: Optional[float] = None
    free_delivery_threshold: Optional[float] = None
    estimated_prep_time_minutes: Optional[int] = None
    payment_methods_accepted: Optional[List[str]] = None
    return_policy: Optional[str] = None
    cancellation_policy: Optional[str] = None
    social_media_links: Optional[Dict] = None
    specialties: Optional[List[str]] = None
    accepts_online_payment: Optional[bool] = None
    accepts_cash_on_delivery: Optional[bool] = None
    region: Optional[str] = None  # West African, East African, North African, Central African, South African
    
    class Config:
        from_attributes = True


class VendorUpdate(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    store_profile_image_url: Optional[str] = None
    operating_hours: Optional[dict] = None
    delivery_radius_km: Optional[float] = None
    pickup_available: Optional[bool] = None
    delivery_available: Optional[bool] = None
    status: Optional[str] = None
    # Address fields
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    # Location coordinates
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Enhanced store profile fields
    store_banner_image_url: Optional[str] = None
    store_gallery: Optional[List[str]] = None
    store_tags: Optional[List[str]] = None
    store_features: Optional[Dict] = None
    minimum_order_amount: Optional[float] = None
    delivery_fee: Optional[float] = None
    free_delivery_threshold: Optional[float] = None
    estimated_prep_time_minutes: Optional[int] = None
    payment_methods_accepted: Optional[List[str]] = None
    return_policy: Optional[str] = None
    cancellation_policy: Optional[str] = None
    social_media_links: Optional[Dict] = None
    specialties: Optional[List[str]] = None
    accepts_online_payment: Optional[bool] = None
    accepts_cash_on_delivery: Optional[bool] = None
    region: Optional[str] = None  # West African, East African, North African, Central African, South African
    
    class Config:
        from_attributes = True


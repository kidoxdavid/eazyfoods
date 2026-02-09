"""
Driver schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal


class DriverSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str
    street_address: str
    city: str
    state: Optional[str] = None
    postal_code: str
    country: str = "Canada"
    vehicle_type: Optional[str] = None  # car, motorcycle, bicycle, scooter, walking
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    license_plate: Optional[str] = None
    driver_license_number: Optional[str] = None
    preferred_delivery_zones: Optional[List[str]] = None
    
    class Config:
        from_attributes = True


class DriverLogin(BaseModel):
    email: EmailStr
    password: str


class DriverResponse(BaseModel):
    id: str
    email: str
    phone: str
    first_name: str
    last_name: str
    street_address: Optional[str] = None
    city: str
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    license_plate: Optional[str] = None
    driver_license_number: Optional[str] = None
    verification_status: str
    is_active: bool
    is_available: bool
    total_deliveries: int
    completed_deliveries: int
    average_rating: Optional[float] = None
    total_earnings: Optional[float] = None
    delivery_radius_km: Optional[float] = None
    preferred_delivery_zones: Optional[List[str]] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_routing_number: Optional[str] = None
    bank_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class DriverProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    license_plate: Optional[str] = None
    delivery_radius_km: Optional[float] = None
    preferred_delivery_zones: Optional[List[str]] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_routing_number: Optional[str] = None
    bank_name: Optional[str] = None
    is_available: Optional[bool] = None
    
    class Config:
        from_attributes = True


class DeliveryAddressDisplay(BaseModel):
    """Delivery address for driver display (street, city, state)."""
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None


class DeliveryResponse(BaseModel):
    id: str
    order_id: str
    driver_id: str
    status: str
    order_number: Optional[str] = None
    delivery_address: Optional[DeliveryAddressDisplay] = None
    pickup_latitude: Optional[float]
    pickup_longitude: Optional[float]
    delivery_latitude: Optional[float]
    delivery_longitude: Optional[float]
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    estimated_pickup_time: Optional[datetime]
    estimated_delivery_time: Optional[datetime]
    actual_pickup_time: Optional[datetime]
    actual_delivery_time: Optional[datetime]
    distance_km: Optional[float]
    delivery_fee: Optional[float]
    driver_earnings: Optional[float]
    route_polyline: Optional[str] = None
    route_distance_km: Optional[float] = None
    route_duration_seconds: Optional[int] = None
    current_eta_minutes: Optional[int] = None
    last_location_update: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeliveryAcceptRequest(BaseModel):
    estimated_pickup_time: Optional[datetime] = None
    estimated_delivery_time: Optional[datetime] = None


class DeliveryStatusUpdate(BaseModel):
    status: str  # picked_up, in_transit, delivered, cancelled
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class TrackingDataResponse(BaseModel):
    delivery_id: str
    driver_location: Optional[Dict[str, float]] = None
    customer_location: Optional[Dict[str, float]] = None
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    status: str
    route_polyline: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None


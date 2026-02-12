"""
Driver database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    phone_verified = Column(Boolean, default=False)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    
    # Personal Info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(DateTime)
    
    # Address
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100))
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), default="Canada")
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    
    # Vehicle Info
    vehicle_type = Column(String(50))  # car, motorcycle, bicycle, scooter, walking
    vehicle_make = Column(String(100))
    vehicle_model = Column(String(100))
    vehicle_year = Column(Integer)
    vehicle_color = Column(String(50))
    license_plate = Column(String(50))
    
    # Documents
    driver_license_number = Column(String(100))
    driver_license_url = Column(String(255))
    vehicle_registration_url = Column(String(255))
    insurance_document_url = Column(String(255))
    profile_image_url = Column(String(255))
    
    # Verification
    verification_status = Column(String(20), default="pending")  # pending, approved, rejected
    verified_at = Column(DateTime)
    verification_notes = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_available = Column(Boolean, default=False)  # Available to accept deliveries
    current_location_latitude = Column(DECIMAL(10, 8))
    current_location_longitude = Column(DECIMAL(11, 8))
    last_location_update = Column(DateTime)
    
    # Performance Metrics
    total_deliveries = Column(Integer, default=0)
    completed_deliveries = Column(Integer, default=0)
    cancelled_deliveries = Column(Integer, default=0)
    average_rating = Column(DECIMAL(3, 2), default=0.0)
    total_ratings = Column(Integer, default=0)
    total_earnings = Column(DECIMAL(10, 2), default=0.0)
    
    # Settings
    delivery_radius_km = Column(DECIMAL(5, 2), default=10.0)  # Max distance willing to travel
    preferred_delivery_zones = Column(JSON)  # Array of preferred areas/cities
    
    # Bank account for payouts
    bank_account_name = Column(String(200))
    bank_account_number = Column(String(50))
    bank_routing_number = Column(String(50))
    bank_name = Column(String(200))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    deliveries = relationship("Delivery", back_populates="driver", cascade="all, delete-orphan")


class Delivery(Base):
    __tablename__ = "deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False, unique=True)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False)
    
    # Status
    status = Column(String(20), default="pending")  # pending, accepted, picked_up, in_transit, delivered, cancelled
    accepted_at = Column(DateTime)
    picked_up_at = Column(DateTime)
    delivered_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(Text)
    
    # Location tracking
    pickup_latitude = Column(DECIMAL(10, 8))
    pickup_longitude = Column(DECIMAL(11, 8))
    delivery_latitude = Column(DECIMAL(10, 8))
    delivery_longitude = Column(DECIMAL(11, 8))
    current_latitude = Column(DECIMAL(10, 8))
    current_longitude = Column(DECIMAL(11, 8))
    
    # Delivery details
    estimated_pickup_time = Column(DateTime)
    estimated_delivery_time = Column(DateTime)
    actual_pickup_time = Column(DateTime)
    actual_delivery_time = Column(DateTime)
    distance_km = Column(DECIMAL(8, 2))
    delivery_fee = Column(DECIMAL(10, 2), default=0.0)
    driver_earnings = Column(DECIMAL(10, 2), default=0.0)  # Amount driver earns from this delivery
    
    # GPS Routing & Tracking
    route_polyline = Column(Text)  # Encoded route from Google Maps
    route_distance_km = Column(DECIMAL(8, 2))  # Total route distance
    route_duration_seconds = Column(Integer)  # Estimated route duration
    current_eta_minutes = Column(Integer)  # Current ETA in minutes
    last_location_update = Column(DateTime)  # Last time location was updated
    
    # Notes
    driver_notes = Column(Text)
    customer_notes = Column(Text)
    
    # Rating
    customer_rating = Column(Integer)  # 1-5
    customer_feedback = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", backref="delivery")
    driver = relationship("Driver", back_populates="deliveries")


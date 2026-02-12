"""
Vendor and VendorUser database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, JSON, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Vendor(Base):
    __tablename__ = "vendors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_name = Column(String(200), nullable=False)
    business_type = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    phone_verified = Column(Boolean, default=False)
    password_hash = Column(String(255), nullable=True)  # null for Google-linked
    google_id = Column(String(255), unique=True, nullable=True)
    
    # Address
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100))
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), default="Canada")
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    
    # Verification
    business_registration_number = Column(String(100))
    tax_number = Column(String(100))
    government_id_url = Column(String(255))
    business_registration_url = Column(String(255))
    verification_status = Column(String(20), default="pending")
    verified_at = Column(DateTime)
    
    # Store setup
    store_profile_image_url = Column(String(255))
    store_banner_image_url = Column(String(255))
    description = Column(Text)
    operating_hours = Column(JSON)
    delivery_radius_km = Column(DECIMAL(5, 2), default=5.0)
    pickup_available = Column(Boolean, default=True)
    delivery_available = Column(Boolean, default=True)
    region = Column(String(50), nullable=True)  # West African, East African, North African, Central African, South African
    
    # Enhanced store profile fields
    store_gallery = Column(JSON)  # Array of image URLs
    store_tags = Column(ARRAY(String))  # Tags like 'african', 'caribbean', 'halal'
    store_features = Column(JSON)  # Features like {"halal": true, "kosher": false}
    minimum_order_amount = Column(DECIMAL(10, 2), default=0.00)
    delivery_fee = Column(DECIMAL(10, 2), default=0.00)
    free_delivery_threshold = Column(DECIMAL(10, 2))
    estimated_prep_time_minutes = Column(Integer, default=30)
    payment_methods_accepted = Column(ARRAY(String), default=['cash', 'card'])
    return_policy = Column(Text)
    cancellation_policy = Column(Text)
    social_media_links = Column(JSON)  # {"facebook": "url", "instagram": "url"}
    specialties = Column(ARRAY(String))  # Store specialties/cuisine types
    accepts_online_payment = Column(Boolean, default=True)
    accepts_cash_on_delivery = Column(Boolean, default=True)
    
    # Commission
    commission_rate = Column(DECIMAL(5, 2), default=15.0)
    commission_agreement_accepted = Column(Boolean, default=False)
    commission_agreement_accepted_at = Column(DateTime)
    
    # Status
    status = Column(String(20), default="onboarding")
    go_live_at = Column(DateTime)
    
    # Bank account
    bank_account_name = Column(String(200))
    bank_account_number = Column(String(50))
    bank_routing_number = Column(String(50))
    bank_name = Column(String(200))
    
    # Ratings
    average_rating = Column(DECIMAL(3, 2), default=0.0)
    total_reviews = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("VendorUser", back_populates="vendor", cascade="all, delete-orphan")


class VendorUser(Base):
    __tablename__ = "vendor_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    role = Column(String(20), nullable=False)  # store_owner, store_manager, staff, finance
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", back_populates="users")


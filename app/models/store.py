"""
Store database models for multi-store vendor support
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, JSON, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Store(Base):
    __tablename__ = "stores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    
    # Basic Info
    name = Column(String(200), nullable=False)  # Store name (e.g., "Downtown Location", "Main Branch")
    store_code = Column(String(50))  # Optional store code/identifier
    description = Column(Text)
    
    # Address
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100))
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), default="Canada")
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    
    # Contact
    phone = Column(String(20))
    email = Column(String(255))
    
    # Store Profile
    profile_image_url = Column(String(255))
    banner_image_url = Column(String(255))
    store_gallery = Column(JSON)  # Array of image URLs
    store_tags = Column(ARRAY(String))
    store_features = Column(JSON)
    specialties = Column(ARRAY(String))
    
    # Operating Hours
    operating_hours = Column(JSON)  # {"monday": {"open": "09:00", "close": "17:00", "closed": false}, ...}
    timezone = Column(String(50), default="UTC")
    
    # Services
    pickup_available = Column(Boolean, default=True)
    delivery_available = Column(Boolean, default=True)
    delivery_radius_km = Column(DECIMAL(5, 2), default=5.0)
    delivery_fee = Column(DECIMAL(10, 2), default=0.00)
    free_delivery_threshold = Column(DECIMAL(10, 2))
    minimum_order_amount = Column(DECIMAL(10, 2), default=0.00)
    estimated_prep_time_minutes = Column(Integer, default=30)
    
    # Payment
    payment_methods_accepted = Column(ARRAY(String), default=['cash', 'card'])
    accepts_online_payment = Column(Boolean, default=True)
    accepts_cash_on_delivery = Column(Boolean, default=True)
    
    # Policies
    return_policy = Column(Text)
    cancellation_policy = Column(Text)
    
    # Social Media
    social_media_links = Column(JSON)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_primary = Column(Boolean, default=False)  # Primary store for the vendor
    status = Column(String(20), default="active")  # active, inactive, closed, maintenance
    
    # Ratings (store-specific)
    average_rating = Column(DECIMAL(3, 2), default=0.0)
    total_reviews = Column(Integer, default=0)
    
    # Region
    region = Column(String(50))  # West African, East African, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="stores")
    products = relationship("Product", backref="store")
    orders = relationship("Order", backref="store")


"""
Chef database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, JSON, ARRAY, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Chef(Base):
    __tablename__ = "chefs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    phone_verified = Column(Boolean, default=False)
    password_hash = Column(String(255), nullable=True)
    
    # Personal Info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    chef_name = Column(String(200))  # Display name/brand name
    bio = Column(Text)  # Chef biography
    profile_image_url = Column(String(255))
    banner_image_url = Column(String(255))
    
    # Address
    street_address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100))
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), default="Canada")
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    
    # Cuisines - array of cuisine types they cook
    cuisines = Column(ARRAY(String), nullable=False, default=[])  # e.g., ['Nigerian', 'Ghanaian', 'West African']
    cuisine_description = Column(Text)  # Description of their cooking style
    
    # Documents for verification
    government_id_url = Column(String(255))
    chef_certification_url = Column(String(255))  # Optional culinary certifications
    profile_image_url_verification = Column(String(255))
    
    # Verification
    verification_status = Column(String(20), default="pending", 
                                server_default="pending")  # pending, verified, rejected, suspended
    verified_at = Column(DateTime)
    verification_notes = Column(Text)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)  # Available to take orders/bookings
    
    # Service details
    service_radius_km = Column(DECIMAL(5, 2), default=10.0)  # How far they're willing to travel
    minimum_order_amount = Column(DECIMAL(10, 2), default=0.00)
    service_fee = Column(DECIMAL(10, 2), default=0.00)
    estimated_prep_time_minutes = Column(Integer, default=60)
    accepts_online_payment = Column(Boolean, default=True)
    accepts_cash_on_delivery = Column(Boolean, default=True)
    
    # Social media
    social_media_links = Column(JSON)  # {"facebook": "url", "instagram": "url", "youtube": "url"}
    website_url = Column(String(255))
    
    # Ratings
    average_rating = Column(DECIMAL(3, 2), default=0.0)
    total_reviews = Column(Integer, default=0)
    
    # Gallery
    gallery_images = Column(JSON)  # Array of image URLs showcasing their food
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reviews = relationship("ChefReview", back_populates="chef", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("verification_status IN ('pending', 'verified', 'rejected', 'suspended')", 
                       name="check_chef_verification_status"),
    )


class ChefReview(Base):
    __tablename__ = "chef_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chef_id = Column(UUID(as_uuid=True), ForeignKey("chefs.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200))
    comment = Column(Text)
    
    # Review details
    cuisine_quality = Column(Integer)  # 1-5 rating for cuisine quality
    service_quality = Column(Integer)  # 1-5 rating for service
    value_for_money = Column(Integer)  # 1-5 rating for value
    
    # Status
    is_public = Column(Boolean, default=True)
    is_verified_purchase = Column(Boolean, default=False)  # If customer actually ordered from chef
    
    # Response
    chef_response = Column(Text)
    chef_response_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chef = relationship("Chef", back_populates="reviews")
    customer = relationship("Customer", backref="chef_reviews")
    
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_rating_range"),
        CheckConstraint("cuisine_quality IS NULL OR (cuisine_quality >= 1 AND cuisine_quality <= 5)", 
                       name="check_cuisine_quality_range"),
        CheckConstraint("service_quality IS NULL OR (service_quality >= 1 AND service_quality <= 5)", 
                       name="check_service_quality_range"),
        CheckConstraint("value_for_money IS NULL OR (value_for_money >= 1 AND value_for_money <= 5)", 
                       name="check_value_for_money_range"),
    )


class CustomerAllergy(Base):
    __tablename__ = "customer_allergies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    
    # Allergy information
    allergy_type = Column(String(100), nullable=False)  # e.g., 'peanuts', 'shellfish', 'dairy', 'gluten'
    severity = Column(String(20), default="moderate")  # mild, moderate, severe
    notes = Column(Text)  # Additional notes about the allergy
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship("Customer", backref="allergies")
    
    __table_args__ = (
        CheckConstraint("severity IN ('mild', 'moderate', 'severe')", name="check_allergy_severity"),
    )


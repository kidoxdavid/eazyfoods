"""
Cuisine database models for chefs
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Cuisine(Base):
    __tablename__ = "cuisines"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chef_id = Column(UUID(as_uuid=True), ForeignKey("chefs.id"), nullable=False)
    
    # Basic Info
    name = Column(String(200), nullable=False)  # e.g., "Jollof Rice", "Egusi Soup"
    description = Column(Text)  # Detailed description of the cuisine
    cuisine_type = Column(String(100))  # e.g., "Nigerian", "Ghanaian", "West African"
    
    # Pricing
    price = Column(DECIMAL(10, 2), nullable=False)  # Base price
    price_per_person = Column(DECIMAL(10, 2))  # Optional: price per person for catering
    minimum_servings = Column(Integer, default=1)  # Minimum number of servings
    
    # Media
    image_url = Column(String(500))  # Main image
    images = Column(ARRAY(String))  # Additional images
    
    # Details
    ingredients = Column(ARRAY(String))  # List of main ingredients
    allergens = Column(ARRAY(String))  # List of allergens (e.g., ["peanuts", "dairy"])
    spice_level = Column(String(20), default="medium")  # mild, medium, hot, very_hot
    prep_time_minutes = Column(Integer)  # Preparation time in minutes
    serves = Column(Integer, default=1)  # Number of servings
    
    # Dietary Info
    is_vegetarian = Column(Boolean, default=False)
    is_vegan = Column(Boolean, default=False)
    is_gluten_free = Column(Boolean, default=False)
    is_halal = Column(Boolean, default=False)
    is_kosher = Column(Boolean, default=False)
    
    # Status
    status = Column(String(20), default="active")  # active, inactive, out_of_stock
    is_featured = Column(Boolean, default=False)
    
    # SEO
    slug = Column(String(200), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chef = relationship("Chef", backref="cuisines_list")
    
    __table_args__ = (
        # Ensure slug is unique per chef
        # This will be handled at the application level
    )


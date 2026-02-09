"""
Product and Category database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID, DATE
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    description = Column(Text)
    image_url = Column(String(255))
    slug = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Product(Base):
    __tablename__ = "products"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"))  # Optional: null means available at all stores
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Pricing
    price = Column(DECIMAL(10, 2), nullable=False)
    sale_price = Column(DECIMAL(10, 2))
    compare_at_price = Column(DECIMAL(10, 2))
    
    # Categorization
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    
    # Identifiers
    sku = Column(String(50))
    barcode = Column(String(50))
    vendor_sku = Column(String(50))
    
    # Media
    image_url = Column(String(255))
    images = Column(ARRAY(String))
    
    # Units
    unit = Column(String(20), default="piece")
    weight_kg = Column(DECIMAL(8, 2))
    
    # Variants
    variant_type = Column(String(50))
    variant_value = Column(String(100))
    parent_product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    
    # Inventory
    stock_quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=10)
    track_inventory = Column(Boolean, default=True)
    
    # Expiry
    expiry_date = Column(DATE)
    track_expiry = Column(Boolean, default=False)
    
    # Status
    status = Column(String(20), default="active")
    is_featured = Column(Boolean, default=False)
    is_newly_stocked = Column(Boolean, default=False)
    
    # SEO
    slug = Column(String(200), nullable=False)
    
    # Origin
    origin_country = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - using lazy loading and string references to avoid circular import issues
    vendor = relationship("app.models.vendor.Vendor", lazy="select")  # Full path to avoid import issues
    category = relationship("Category", foreign_keys=[category_id], lazy="select")


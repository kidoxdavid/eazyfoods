"""
Promotion models
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, DECIMAL, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Promotion(Base):
    __tablename__ = "promotions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)  # Nullable for chef promotions
    chef_id = Column(UUID(as_uuid=True), ForeignKey("chefs.id"), nullable=True)  # For chef promotions
    name = Column(String(200), nullable=False)
    description = Column(Text)
    promotion_type = Column(String(20), nullable=False)  # discount, store_wide_sale, featured, bundle
    
    # Discount details
    discount_type = Column(String(20))  # percentage, fixed_amount
    discount_value = Column(DECIMAL(10, 2))
    minimum_order_amount = Column(DECIMAL(10, 2))
    
    # Products/Cuisines
    applies_to_all_products = Column(Boolean, default=False)
    product_ids = Column(ARRAY(UUID))  # Array of product IDs (for vendor promotions)
    cuisine_ids = Column(ARRAY(UUID))  # Array of cuisine IDs (for chef promotions)
    
    # Constraints
    minimum_margin_enforced = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    approval_status = Column(String(20), default="pending")  # pending, approved, rejected
    approved_by = Column(UUID(as_uuid=True), ForeignKey("vendor_users.id"))
    approved_at = Column(DateTime)
    
    # Schedule
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="promotions")
    chef = relationship("Chef", backref="promotions")


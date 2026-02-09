"""
Coupon database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Coupon(Base):
    __tablename__ = "coupons"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Discount
    discount_type = Column(String(20), nullable=False)  # percentage, fixed_amount, free_shipping
    discount_value = Column(DECIMAL(10, 2))  # Percentage (0-100) or fixed amount
    max_discount_amount = Column(DECIMAL(10, 2))  # Maximum discount for percentage coupons
    
    # Validity
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Usage Limits
    usage_limit = Column(Integer)  # Total number of times coupon can be used (None = unlimited)
    usage_count = Column(Integer, default=0)  # Current usage count
    usage_limit_per_customer = Column(Integer, default=1)  # How many times a customer can use it
    
    # Minimum Requirements
    minimum_order_amount = Column(DECIMAL(10, 2), default=0)  # Minimum order total to use coupon
    minimum_items = Column(Integer, default=0)  # Minimum number of items in cart
    
    # Applicability
    applicable_to = Column(String(20), default="all")  # all, specific_products, specific_categories, specific_vendors
    product_ids = Column(ARRAY(String))  # Product IDs if applicable_to is specific_products
    category_ids = Column(ARRAY(String))  # Category IDs if applicable_to is specific_categories
    vendor_ids = Column(ARRAY(String))  # Vendor IDs if applicable_to is specific_vendors
    
    # Exclusions
    exclude_product_ids = Column(ARRAY(String))  # Products excluded from coupon
    exclude_category_ids = Column(ARRAY(String))  # Categories excluded from coupon
    
    # First-time customer only
    first_time_customer_only = Column(Boolean, default=False)
    
    # Created by
    created_by_type = Column(String(20), default="admin")  # admin, marketing
    created_by_id = Column(UUID(as_uuid=True))  # Admin or marketing user ID
    
    # Status
    approval_status = Column(String(20), default="approved")  # pending, approved, rejected
    approved_at = Column(DateTime)
    approved_by = Column(UUID(as_uuid=True))  # Admin user ID (no FK constraint to avoid circular dependency)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CouponUsage(Base):
    __tablename__ = "coupon_usages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coupon_id = Column(UUID(as_uuid=True), ForeignKey("coupons.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    discount_amount = Column(DECIMAL(10, 2), nullable=False)
    order_total = Column(DECIMAL(10, 2), nullable=False)
    used_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    coupon = relationship("Coupon", backref="usages")
    order = relationship("Order", backref="coupon_usages")
    customer = relationship("Customer", backref="coupon_usages")


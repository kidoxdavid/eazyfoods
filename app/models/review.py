"""
Review models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)  # Optional - can review vendor or product
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    rating = Column(Integer, nullable=False)
    title = Column(String(200))
    comment = Column(Text)
    is_verified_purchase = Column(Boolean, default=False)
    is_public = Column(Boolean, default=True)
    
    # Vendor response
    vendor_response = Column(Text)
    vendor_response_at = Column(DateTime)
    responded_by = Column(UUID(as_uuid=True), ForeignKey("vendor_users.id"))
    
    # Moderation
    is_reported = Column(Boolean, default=False)
    report_reason = Column(Text)
    is_abusive = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="reviews")
    order = relationship("Order", backref="reviews")


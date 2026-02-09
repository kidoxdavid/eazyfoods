"""
Inventory database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, DATE
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class InventoryAdjustment(Base):
    __tablename__ = "inventory_adjustments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"))  # Store-specific inventory
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    adjustment_type = Column(String(20), nullable=False)  # stock_in, stock_out, adjustment, damage, expired, return
    quantity_change = Column(Integer, nullable=False)  # Positive for stock_in, negative for stock_out
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    reason = Column(Text)
    reference_number = Column(String(100))  # PO number, invoice, etc.
    performed_by = Column(UUID(as_uuid=True), ForeignKey("vendor_users.id"), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="inventory_adjustments")
    product = relationship("Product", backref="inventory_adjustments")
    performer = relationship("VendorUser", backref="inventory_adjustments")


class LowStockAlert(Base):
    __tablename__ = "low_stock_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    current_quantity = Column(Integer, nullable=False)
    threshold_quantity = Column(Integer, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="low_stock_alerts")
    product = relationship("Product", backref="low_stock_alerts")


class ExpiryAlert(Base):
    __tablename__ = "expiry_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    expiry_date = Column(DATE, nullable=False)
    days_until_expiry = Column(Integer, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="expiry_alerts")
    product = relationship("Product", backref="expiry_alerts")


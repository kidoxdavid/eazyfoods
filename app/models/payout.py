"""
Payout database models
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, DECIMAL, Text, DATE
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Payout(Base):
    __tablename__ = "payouts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    payout_number = Column(String(50), unique=True, nullable=False)
    
    # Amounts
    gross_amount = Column(DECIMAL(10, 2), nullable=False)
    commission_amount = Column(DECIMAL(10, 2), nullable=False)
    net_amount = Column(DECIMAL(10, 2), nullable=False)
    fees = Column(DECIMAL(10, 2), default=0)
    
    # Status
    status = Column(String(20), default="pending")  # pending, processing, completed, failed, cancelled
    
    # Period
    period_start = Column(DATE, nullable=False)
    period_end = Column(DATE, nullable=False)
    
    # Payment details
    payout_method = Column(String(50), default="bank_transfer")
    bank_account_name = Column(String(200))
    bank_account_number = Column(String(50))
    transaction_reference = Column(String(100))
    
    # Processing
    processed_at = Column(DateTime)
    completed_at = Column(DateTime)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", backref="payouts")
    items = relationship("PayoutItem", back_populates="payout", cascade="all, delete-orphan")


class PayoutItem(Base):
    __tablename__ = "payout_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payout_id = Column(UUID(as_uuid=True), ForeignKey("payouts.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    order_number = Column(String(50), nullable=False)
    gross_sales = Column(DECIMAL(10, 2), nullable=False)
    commission_amount = Column(DECIMAL(10, 2), nullable=False)
    net_payout = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    payout = relationship("Payout", back_populates="items")
    order = relationship("Order", backref="payout_items")


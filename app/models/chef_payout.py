"""
Chef payout database models
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, DECIMAL, Text, DATE
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class ChefPayout(Base):
    __tablename__ = "chef_payouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chef_id = Column(UUID(as_uuid=True), ForeignKey("chefs.id"), nullable=False)
    payout_number = Column(String(50), unique=True, nullable=False)

    net_amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(20), default="pending")  # pending, processing, completed, failed, cancelled
    period_start = Column(DATE, nullable=False)
    period_end = Column(DATE, nullable=False)
    payout_method = Column(String(50), default="bank_transfer")
    bank_account_name = Column(String(200))
    transaction_reference = Column(String(100))
    processed_at = Column(DateTime)
    completed_at = Column(DateTime)
    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chef = relationship("Chef", backref="chef_payouts")
    items = relationship("ChefPayoutItem", back_populates="payout", cascade="all, delete-orphan")


class ChefPayoutItem(Base):
    __tablename__ = "chef_payout_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chef_payout_id = Column(UUID(as_uuid=True), ForeignKey("chef_payouts.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    order_number = Column(String(50), nullable=False)
    net_payout = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    payout = relationship("ChefPayout", back_populates="items")
    order = relationship("Order", backref="chef_payout_items")

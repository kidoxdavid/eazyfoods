"""
Order database models
"""
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, DECIMAL, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base
import enum


class OrderStatus(enum.Enum):
    NEW = "new"
    ACCEPTED = "accepted"
    PICKING = "picking"
    READY = "ready"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class Order(Base):
    __tablename__ = "orders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number = Column(String(50), unique=True, nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=True)  # Nullable for chef orders
    chef_id = Column(UUID(as_uuid=True), ForeignKey("chefs.id"), nullable=True)  # For chef orders/bookings
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"))  # Store where order is fulfilled
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"))
    
    # Status
    status = Column(String(20), default="new", nullable=False)
    
    # Delivery
    delivery_method = Column(String(20), nullable=False)  # delivery or pickup
    delivery_address_id = Column(UUID(as_uuid=True), ForeignKey("customer_addresses.id"))
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id"))  # Assigned driver
    
    # Pricing
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    tax_amount = Column(DECIMAL(10, 2), default=0)
    shipping_amount = Column(DECIMAL(10, 2), default=0)
    discount_amount = Column(DECIMAL(10, 2), default=0)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    
    # Commission
    gross_sales = Column(DECIMAL(10, 2), nullable=False)
    commission_rate = Column(DECIMAL(5, 2), nullable=False)
    commission_amount = Column(DECIMAL(10, 2), nullable=False)
    net_payout = Column(DECIMAL(10, 2), nullable=False)
    
    # Payment
    payment_status = Column(String(20), default="pending")
    payment_method = Column(String(50))
    helcim_transaction_id = Column(String(255))  # Helcim Transaction ID
    helcim_card_token = Column(String(255))  # Helcim Card Token (for saved cards)
    stripe_payment_intent_id = Column(String(255))  # Stripe PaymentIntent ID
    
    # Fulfillment timestamps
    accepted_at = Column(DateTime)
    accepted_by = Column(UUID(as_uuid=True), ForeignKey("vendor_users.id"))
    picking_started_at = Column(DateTime)
    picking_completed_at = Column(DateTime)
    ready_at = Column(DateTime)
    picked_up_at = Column(DateTime)
    delivered_at = Column(DateTime)
    
    # Notes
    special_instructions = Column(Text)
    customer_notes = Column(Text)
    
    # Cancellation
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(Text)
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey("vendor_users.id"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships - use string reference to avoid circular imports
    # Note: Vendor model must be imported before Order is used in queries
    vendor = relationship("Vendor", backref="orders", lazy="select")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    cuisine_id = Column(UUID(as_uuid=True), ForeignKey("cuisines.id"))
    product_name = Column(String(200), nullable=False)
    product_price = Column(DECIMAL(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    
    # Substitutions
    is_substituted = Column(Boolean, default=False)
    original_product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    substitution_reason = Column(Text)
    
    # Fulfillment
    is_out_of_stock = Column(Boolean, default=False)
    quantity_fulfilled = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships - use string references to avoid circular imports
    order = relationship("Order", back_populates="items")
    product = relationship("app.models.product.Product", foreign_keys=[product_id], lazy="select")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    status = Column(String(20), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("vendor_users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="status_history")


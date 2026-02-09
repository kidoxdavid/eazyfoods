"""
Chat message models for real-time messaging between users
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Sender information
    sender_type = Column(String(20), nullable=False)  # 'customer', 'admin', 'vendor', 'driver'
    sender_id = Column(UUID(as_uuid=True), nullable=False)  # ID of the sender (customer_id, admin_id, vendor_id, or driver_id)
    
    # Recipient information
    recipient_type = Column(String(20), nullable=False)  # 'customer', 'admin', 'vendor', 'driver'
    recipient_id = Column(UUID(as_uuid=True), nullable=True)  # ID of the recipient (NULL for "any admin")
    
    # Message content
    message = Column(Text, nullable=False)
    
    # Read status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Optional: conversation thread ID for grouping messages
    thread_id = Column(UUID(as_uuid=True), nullable=True)
    
    class Config:
        from_attributes = True


"""
Admin user database models
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), default="admin")  # admin, super_admin, moderator
    permissions = Column(JSONB)  # Granular permissions
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activity_logs = relationship("AdminActivityLog", back_populates="admin", cascade="all, delete-orphan")


class AdminActivityLog(Base):
    __tablename__ = "admin_activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=False)
    action = Column(String(100), nullable=False)  # 'vendor_approved', 'order_refunded', etc.
    entity_type = Column(String(50))  # 'vendor', 'order', 'product', etc.
    entity_id = Column(UUID(as_uuid=True))
    details = Column(JSONB)  # Additional details about the action
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = relationship("AdminUser", back_populates="activity_logs")


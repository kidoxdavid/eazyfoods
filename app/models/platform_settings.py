"""
Platform settings database model
"""
from sqlalchemy import Column, String, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
from app.core.database import Base


class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    setting_type = Column(String(50), nullable=False, unique=True)  # general, commission, orders, payment, notifications, security, vendor, customer
    settings_data = Column(JSONB, nullable=False)  # JSON object containing all settings for this type
    updated_by = Column(UUID(as_uuid=True))  # Admin user ID who last updated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


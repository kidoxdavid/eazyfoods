"""
Support message schemas
"""
from pydantic import BaseModel, model_validator
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class SupportMessageCreate(BaseModel):
    subject: str
    message: str
    priority: str = "normal"
    
    class Config:
        from_attributes = True


class SupportMessageResponse(BaseModel):
    id: str
    subject: str
    message: str
    status: str
    priority: str
    assigned_to: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    @model_validator(mode='before')
    @classmethod
    def convert_uuid_to_str(cls, data: Any) -> Any:
        """Convert UUID objects to strings before validation"""
        if isinstance(data, dict):
            # Handle dict input (from from_attributes)
            if 'id' in data and isinstance(data['id'], UUID):
                data = {**data, 'id': str(data['id'])}
        elif hasattr(data, 'id'):
            # Handle SQLAlchemy model objects directly
            if isinstance(data.id, UUID):
                # Create a dict representation with converted id
                return {
                    'id': str(data.id),
                    'subject': data.subject,
                    'message': data.message,
                    'status': data.status,
                    'priority': data.priority,
                    'assigned_to': data.assigned_to,
                    'resolved_at': data.resolved_at,
                    'created_at': data.created_at,
                    'updated_at': data.updated_at,
                }
        return data
    
    class Config:
        from_attributes = True


class SupportMessageUpdate(BaseModel):
    status: Optional[str] = None
    
    class Config:
        from_attributes = True


"""
Inventory schemas
"""
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime, date


class InventoryAdjustmentCreate(BaseModel):
    product_id: Optional[str] = None
    barcode: Optional[str] = None  # Alternative to product_id for barcode scanning
    adjustment_type: str  # stock_in, stock_out, adjustment, damage, expired, return
    quantity_change: int
    reason: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class InventoryAdjustmentResponse(BaseModel):
    id: str
    product_id: str
    adjustment_type: str
    quantity_change: int
    quantity_before: int
    quantity_after: int
    reason: Optional[str]
    reference_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class LowStockAlertResponse(BaseModel):
    id: str
    product_id: str
    current_quantity: int
    threshold_quantity: int
    is_resolved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExpiryAlertResponse(BaseModel):
    id: str
    product_id: str
    expiry_date: date
    days_until_expiry: int
    is_resolved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


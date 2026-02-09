"""
Payout schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date


class PayoutItemResponse(BaseModel):
    id: str
    order_id: str
    order_number: str
    gross_sales: Decimal
    commission_amount: Decimal
    net_payout: Decimal
    
    class Config:
        from_attributes = True


class PayoutResponse(BaseModel):
    id: str
    payout_number: str
    gross_amount: Decimal
    commission_amount: Decimal
    net_amount: Decimal
    fees: Decimal
    status: str
    period_start: date
    period_end: date
    payout_method: str
    transaction_reference: Optional[str]
    processed_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    items: List[PayoutItemResponse] = []
    
    class Config:
        from_attributes = True


class PayoutListResponse(BaseModel):
    id: str
    payout_number: str
    gross_amount: Decimal
    commission_amount: Decimal
    net_amount: Decimal
    status: str
    period_start: date
    period_end: date
    created_at: datetime
    
    class Config:
        from_attributes = True


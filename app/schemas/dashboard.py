"""
Dashboard and analytics schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date


class DashboardStats(BaseModel):
    today_orders: int
    pending_orders: int
    low_stock_alerts: int
    expiring_products_count: int = 0
    today_revenue: Decimal
    week_revenue: Decimal
    month_revenue: Decimal
    average_rating: Optional[Decimal]
    total_reviews: int


class TopProduct(BaseModel):
    product_id: str
    product_name: str
    total_sold: int
    revenue: Decimal


class SalesReport(BaseModel):
    period_start: date
    period_end: date
    total_orders: int
    total_revenue: Decimal
    total_commission: Decimal
    net_payout: Decimal
    average_order_value: Decimal
    top_products: List[TopProduct]


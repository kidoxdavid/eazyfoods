"""
Master data export endpoint - exports all database data to CSV
"""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from datetime import datetime
import csv
import io
import json
from typing import Any, Dict, List
from app.core.database import get_db
from app.api.v1.dependencies import get_current_admin

# Import all models
from app.models.admin import AdminUser, AdminActivityLog
from app.models.vendor import Vendor, VendorUser
from app.models.customer import Customer, CustomerAddress
from app.models.product import Product, Category
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.review import Review
from app.models.support import SupportMessage
from app.models.promotion import Promotion
from app.models.payout import Payout, PayoutItem
from app.models.inventory import InventoryAdjustment, LowStockAlert, ExpiryAlert

router = APIRouter()


def model_to_dict(obj: Any, model_class: Any) -> Dict[str, Any]:
    """Convert SQLAlchemy model instance to dictionary"""
    result = {}
    mapper = inspect(model_class)
    
    for column in mapper.columns:
        value = getattr(obj, column.name, None)
        # Convert UUIDs, dates, decimals, etc. to strings
        if value is None:
            result[column.name] = ""
        elif hasattr(value, '__str__'):
            result[column.name] = str(value)
        else:
            result[column.name] = value
    
    return result


def export_table_to_csv_rows(db: Session, model_class: Any, table_name: str) -> List[List[str]]:
    """Export a table to CSV rows"""
    rows = []
    try:
        # Get all records
        records = db.query(model_class).all()
        
        if not records:
            # Return header only if no data
            mapper = inspect(model_class)
            headers = [col.name for col in mapper.columns]
            rows.append(headers)
            return rows
        
        # Get column names from first record
        mapper = inspect(model_class)
        headers = [col.name for col in mapper.columns]
        rows.append(headers)
        
        # Add data rows
        for record in records:
            row = []
            for col in mapper.columns:
                value = getattr(record, col.name, None)
                if value is None:
                    row.append("")
                elif isinstance(value, (datetime,)):
                    row.append(value.isoformat() if value else "")
                elif isinstance(value, (dict, list)):
                    # Handle JSON/JSONB fields
                    row.append(json.dumps(value) if value else "")
                elif hasattr(value, '__str__'):
                    row.append(str(value))
                else:
                    row.append(value)
            rows.append(row)
            
    except Exception as e:
        # If table doesn't exist or error, add error message
        rows.append([f"Error exporting {table_name}: {str(e)}"])
    
    return rows


@router.get("/master-export")
async def master_export(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Export all database data to a single CSV file.
    Each table is exported as a separate section with headers.
    """
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header for the entire export
        writer.writerow(["=" * 80])
        writer.writerow([f"EAZy Foods Master Data Export"])
        writer.writerow([f"Generated: {datetime.utcnow().isoformat()} UTC"])
        writer.writerow([f"Exported by: {current_admin.get('email', 'Unknown')}"])
        writer.writerow(["=" * 80])
        writer.writerow([])
        
        # Define all tables to export in logical order
        tables_to_export = [
            ("ADMIN USERS", AdminUser, "admin_users"),
            ("ADMIN ACTIVITY LOGS", AdminActivityLog, "admin_activity_logs"),
            ("VENDORS", Vendor, "vendors"),
            ("VENDOR USERS", VendorUser, "vendor_users"),
            ("CUSTOMERS", Customer, "customers"),
            ("CUSTOMER ADDRESSES", CustomerAddress, "customer_addresses"),
            ("CATEGORIES", Category, "categories"),
            ("PRODUCTS", Product, "products"),
            ("ORDERS", Order, "orders"),
            ("ORDER ITEMS", OrderItem, "order_items"),
            ("ORDER STATUS HISTORY", OrderStatusHistory, "order_status_history"),
            ("REVIEWS", Review, "reviews"),
            ("SUPPORT MESSAGES", SupportMessage, "support_messages"),
            ("PROMOTIONS", Promotion, "promotions"),
            ("PAYOUTS", Payout, "payouts"),
            ("PAYOUT ITEMS", PayoutItem, "payout_items"),
            ("INVENTORY ADJUSTMENTS", InventoryAdjustment, "inventory_adjustments"),
            ("LOW STOCK ALERTS", LowStockAlert, "low_stock_alerts"),
            ("EXPIRY ALERTS", ExpiryAlert, "expiry_alerts"),
        ]
        
        # Export each table
        for section_name, model_class, table_name in tables_to_export:
            writer.writerow([])
            writer.writerow(["=" * 80])
            writer.writerow([f"TABLE: {section_name} ({table_name})"])
            writer.writerow(["=" * 80])
            
            rows = export_table_to_csv_rows(db, model_class, table_name)
            for row in rows:
                writer.writerow(row)
            
            # Add row count
            if len(rows) > 1:  # Has header + data
                writer.writerow([])
                writer.writerow([f"Total rows: {len(rows) - 1}"])
        
        # Write footer
        writer.writerow([])
        writer.writerow(["=" * 80])
        writer.writerow([f"Export completed: {datetime.utcnow().isoformat()} UTC"])
        writer.writerow(["=" * 80])
        
        # Get the CSV content
        csv_content = output.getvalue()
        output.close()
        
        # Generate filename with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"easyfoods_master_export_{timestamp}.csv"
        
        # Return as downloadable file
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except Exception as e:
        import traceback
        error_msg = f"Error in master export: {str(e)}"
        print(error_msg)
        traceback.print_exc()
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )


# EAZyfoods Vendor Portal Database Schema

## Overview
Complete database schema for the EAZyfoods multi-vendor grocery delivery marketplace. Supports vendor management, products, inventory, orders, payouts, and analytics.

## Database Tables

### Vendor Management (3 tables)
- **vendors** - Store/vendor accounts with business info, verification, commission rates
- **vendor_users** - User accounts with roles (Store Owner, Manager, Staff, Finance)
- **vendor_onboarding_steps** - Track onboarding progress

### Product Management (3 tables)
- **categories** - Product categories with subcategory support
- **products** - Vendor-owned products with barcodes, variants, inventory
- **product_variants** - Product variants (size, brand, etc.)

### Inventory Management (3 tables)
- **inventory_adjustments** - Complete audit log of all stock changes
- **low_stock_alerts** - Automated low stock notifications
- **expiry_alerts** - Perishable product expiry tracking

### Order Management (3 tables)
- **orders** - Orders with fulfillment workflow (new → accepted → picking → ready → delivered)
- **order_items** - Items in each order with substitution support
- **order_status_history** - Complete audit trail of order status changes

### Commission & Payouts (2 tables)
- **payouts** - Vendor payouts with commission calculations
- **payout_items** - Orders included in each payout

### Promotions (1 table)
- **promotions** - Discounts, sales, featured items with approval workflow

### Reviews & Ratings (1 table)
- **reviews** - Customer reviews with vendor response capability

### Analytics (1 table)
- **sales_reports** - Pre-calculated sales reports by period

### Communication (2 tables)
- **notifications** - System notifications for vendors
- **support_messages** - Vendor support tickets

### Customer Management (2 tables)
- **customers** - Customer accounts
- **customer_addresses** - Shipping/billing addresses

## Key Features

### 1. Role-Based Access Control (RBAC)
- Store Owner: Full access
- Store Manager: Products, inventory, orders
- Staff: Order picking, inventory scanning
- Finance: Payouts, invoices, reports

### 2. Vendor Onboarding Flow
- Signup → Business Verification → Store Setup → Go Live
- Tracks each step in `vendor_onboarding_steps`

### 3. Product Management
- Barcode support (Code128)
- SKU management
- Variants (size, brand, etc.)
- Multi-image support
- Expiry date tracking

### 4. Inventory Management
- Real-time stock tracking
- Complete audit log (`inventory_adjustments`)
- Low stock alerts (automated)
- Expiry alerts for perishables
- Stock adjustment types: stock_in, stock_out, damage, expired, return

### 5. Order Fulfillment Workflow
States: `new` → `accepted` → `picking` → `ready` → `picked_up`/`delivered` → `cancelled`
- Full status history tracking
- Substitution support
- Partial fulfillment handling

### 6. Commission & Payouts
- Configurable commission rates (10-20%)
- Automatic commission calculation
- Payout tracking with periods
- Bank transfer support

### 7. Promotions
- Discount types: percentage, fixed amount
- Store-wide or product-specific
- Approval workflow for major promotions
- Minimum margin enforcement

### 8. Reviews & Ratings
- 1-5 star ratings
- Vendor can respond
- Abuse reporting
- Verified purchase tracking

### 9. Analytics & Reports
- Sales by day/week/month
- Top products
- Fulfillment time tracking
- Cancellation rate
- Export to CSV/PDF ready

## Database Functions

1. **update_updated_at_column()** - Auto-updates `updated_at` timestamps
2. **generate_order_number()** - Creates unique order numbers (EZF-YYYYMMDD-####)
3. **generate_payout_number()** - Creates unique payout numbers (PAY-YYYYMMDD-####)
4. **update_vendor_rating()** - Auto-calculates vendor average rating
5. **check_low_stock()** - Creates low stock alerts automatically

## Indexes
Comprehensive indexes on:
- Foreign keys (vendor_id, product_id, order_id, etc.)
- Status fields (for filtering)
- Search fields (barcode, SKU, email)
- Date fields (for reporting)

## Triggers
- Auto-update `updated_at` on all relevant tables
- Auto-update vendor ratings when reviews change
- Auto-create low stock alerts when inventory drops

## Sample Data
- 8 product categories pre-loaded
- Ready for vendor onboarding

## Next Steps
1. Create vendor accounts via API/web interface
2. Set up authentication system
3. Build vendor dashboard
4. Implement barcode scanning
5. Set up payment processing
6. Configure commission rates


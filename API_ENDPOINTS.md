# EAZyfoods Vendor Portal API - Complete Endpoint Reference

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All endpoints (except signup/login) require a JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

---

## 🔐 Authentication Endpoints

### POST `/auth/signup`
Create a new vendor account.

**Request Body:**
```json
{
  "business_name": "African Market",
  "email": "vendor@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "street_address": "123 Main St",
  "city": "New York",
  "postal_code": "10001",
  "business_type": "grocery"
}
```

**Response:** `201 Created`
```json
{
  "message": "Vendor account created successfully",
  "vendor_id": "uuid",
  "status": "onboarding"
}
```

### POST `/auth/login`
Login and get JWT token.

**Form Data:**
- `username`: Email address
- `password`: Password

**Response:** `200 OK`
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "vendor_id": "uuid",
  "role": "store_owner"
}
```

---

## 👤 Vendor Endpoints

### GET `/vendors/me`
Get current vendor's information.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "business_name": "African Market",
  "email": "vendor@example.com",
  "status": "active",
  "average_rating": 4.5,
  "total_reviews": 10
}
```

### PUT `/vendors/me`
Update vendor information.

**Request Body:**
```json
{
  "business_name": "Updated Name",
  "description": "New description",
  "delivery_radius_km": 10.0
}
```

---

## 📦 Product Endpoints

### GET `/products/`
List all products for current vendor.

**Query Parameters:**
- `skip`: Pagination offset (default: 0)
- `limit`: Items per page (default: 100)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Jollof Rice Mix",
    "price": 8.99,
    "stock_quantity": 50,
    "status": "active"
  }
]
```

### POST `/products/`
Create a new product.

**Request Body:**
```json
{
  "name": "Jollof Rice Mix",
  "price": 8.99,
  "unit": "piece",
  "stock_quantity": 50,
  "slug": "jollof-rice-mix",
  "category_id": "uuid"
}
```

### GET `/products/{product_id}`
Get a specific product.

### PUT `/products/{product_id}`
Update a product.

### DELETE `/products/{product_id}`
Delete a product.

### GET `/products/categories/list`
Get all product categories.

---

## 📋 Order Endpoints

### GET `/orders/`
List all orders with filters.

**Query Parameters:**
- `skip`: Pagination offset
- `limit`: Items per page
- `status`: Filter by status (new, accepted, picking, ready, etc.)
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "order_number": "EZF-20241220-1234",
    "status": "new",
    "total_amount": 45.99,
    "created_at": "2024-12-20T10:00:00"
  }
]
```

### GET `/orders/{order_id}`
Get order details with items.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "order_number": "EZF-20241220-1234",
  "status": "accepted",
  "total_amount": 45.99,
  "items": [
    {
      "product_name": "Jollof Rice Mix",
      "quantity": 2,
      "product_price": 8.99,
      "subtotal": 17.98
    }
  ]
}
```

### PUT `/orders/{order_id}/accept`
Accept an order (new → accepted).

### PUT `/orders/{order_id}/start-picking`
Start picking an order (accepted → picking).

### PUT `/orders/{order_id}/mark-ready`
Mark order as ready (picking → ready).

### PUT `/orders/{order_id}/complete`
Complete order (ready → picked_up/delivered).

### PUT `/orders/{order_id}/cancel`
Cancel an order.

**Request Body:**
```json
{
  "cancellation_reason": "Out of stock"
}
```

---

## 📊 Inventory Endpoints

### POST `/inventory/adjustments`
Create an inventory adjustment.

**Request Body:**
```json
{
  "product_id": "uuid",
  "adjustment_type": "stock_in",
  "quantity_change": 10,
  "reason": "New shipment received",
  "reference_number": "PO-12345"
}
```

**Adjustment Types:**
- `stock_in`: Add stock
- `stock_out`: Remove stock
- `adjustment`: Manual adjustment
- `damage`: Damaged items
- `expired`: Expired items
- `return`: Returned items

### GET `/inventory/adjustments`
Get inventory adjustment history.

**Query Parameters:**
- `skip`: Pagination offset
- `limit`: Items per page
- `product_id`: Filter by product

### GET `/inventory/low-stock-alerts`
Get low stock alerts.

**Query Parameters:**
- `resolved`: Filter by resolved status (default: false)

### PUT `/inventory/low-stock-alerts/{alert_id}/resolve`
Resolve a low stock alert.

### GET `/inventory/expiry-alerts`
Get expiry alerts for perishable products.

### PUT `/inventory/expiry-alerts/{alert_id}/resolve`
Resolve an expiry alert.

---

## 💰 Payout Endpoints

### GET `/payouts/`
List all payouts.

**Query Parameters:**
- `skip`: Pagination offset
- `limit`: Items per page
- `status`: Filter by status (pending, processing, completed)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "payout_number": "PAY-20241220-5678",
    "net_amount": 1250.50,
    "status": "completed",
    "period_start": "2024-12-01",
    "period_end": "2024-12-15"
  }
]
```

### GET `/payouts/{payout_id}`
Get payout details with order items.

### GET `/payouts/balance/available`
Get available balance (orders not yet in payout).

**Response:** `200 OK`
```json
{
  "available_balance": 450.75,
  "pending_orders_count": 12,
  "currency": "USD"
}
```

### GET `/payouts/summary/stats`
Get payout statistics.

**Response:** `200 OK`
```json
{
  "total_payouts": 5,
  "total_paid": 5000.00,
  "pending_payouts": 1,
  "pending_amount": 450.75,
  "currency": "USD"
}
```

---

## 📈 Dashboard Endpoints

### GET `/dashboard/stats`
Get dashboard statistics.

**Response:** `200 OK`
```json
{
  "today_orders": 5,
  "pending_orders": 3,
  "low_stock_alerts": 2,
  "today_revenue": 125.50,
  "week_revenue": 850.00,
  "month_revenue": 3500.00,
  "average_rating": 4.5,
  "total_reviews": 25
}
```

### GET `/dashboard/sales-report`
Get sales report for a date range.

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD) - Required
- `end_date`: End date (YYYY-MM-DD) - Required

**Response:** `200 OK`
```json
{
  "period_start": "2024-12-01",
  "period_end": "2024-12-15",
  "total_orders": 50,
  "total_revenue": 2500.00,
  "total_commission": 375.00,
  "net_payout": 2125.00,
  "average_order_value": 50.00,
  "top_products": [
    {
      "product_id": "uuid",
      "product_name": "Jollof Rice Mix",
      "total_sold": 25,
      "revenue": 224.75
    }
  ]
}
```

---

## Order Status Workflow

```
new → accepted → picking → ready → picked_up/delivered
                    ↓
                cancelled
```

## Testing the API

1. **Start server**: `python3 run.py`
2. **Open docs**: http://localhost:8000/api/docs
3. **Signup**: Create a vendor account
4. **Login**: Get JWT token
5. **Use token**: Click "Authorize" in docs and paste token
6. **Test endpoints**: Try all the endpoints!

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Format:**
```json
{
  "detail": "Error message here"
}
```


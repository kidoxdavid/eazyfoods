# EAZyfoods Vendor Portal API

FastAPI backend for the EAZyfoods multi-vendor grocery delivery marketplace.

## Quick Start

### 1. Install Dependencies
```bash
pip3 install -r requirements.txt
```

### 2. Configure Environment
Make sure your `.env` file has the correct database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyfoods
DB_USER=postgres
DB_PASSWORD=Cr3@tivity
SECRET_KEY=your-secret-key-here
```

### 3. Run the Server
```bash
python3 run.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Vendor signup
- `POST /api/v1/auth/login` - Vendor login (returns JWT token)

### Vendors
- `GET /api/v1/vendors/me` - Get current vendor info (requires auth)
- `PUT /api/v1/vendors/me` - Update vendor info (requires auth)

### Products
- `GET /api/v1/products/` - List all products (requires auth)
- `POST /api/v1/products/` - Create product (requires auth)
- `GET /api/v1/products/{id}` - Get product (requires auth)
- `PUT /api/v1/products/{id}` - Update product (requires auth)
- `DELETE /api/v1/products/{id}` - Delete product (requires auth)
- `GET /api/v1/products/categories/list` - List categories

## Testing the API

### 1. Signup a Vendor
```bash
curl -X POST "http://localhost:8000/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=vendor@example.com&password=password123"
```

This returns a JWT token. Use it in the `Authorization` header:
```
Authorization: Bearer <your-token>
```

### 3. Create a Product
```bash
curl -X POST "http://localhost:8000/api/v1/products/" \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jollof Rice Mix",
    "price": 8.99,
    "unit": "piece",
    "stock_quantity": 50,
    "slug": "jollof-rice-mix"
  }'
```

## Project Structure

```
app/
├── api/
│   └── v1/
│       ├── endpoints/      # API route handlers
│       └── dependencies.py # Auth dependencies
├── core/
│   ├── config.py          # Settings
│   ├── database.py        # DB connection
│   └── security.py        # Auth utilities
├── models/                # SQLAlchemy models
├── schemas/               # Pydantic schemas
└── main.py               # FastAPI app
```

## Next Steps

1. ✅ Backend API structure
2. ✅ Authentication system
3. ⏳ Add more endpoints (orders, inventory, payouts)
4. ⏳ Build frontend
5. ⏳ Add file uploads
6. ⏳ Implement barcode scanning


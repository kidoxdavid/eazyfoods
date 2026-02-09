# EasyFoods - African Grocery Store

An e-commerce platform for an African grocery store.

## Database Setup

### Prerequisites
- PostgreSQL installed and running
- Python 3.7+ installed

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Configure Database Connection

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and update with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyfoods
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

### Step 3: Verify Database Connection

Test your database connection:
```bash
python test_db_connection.py
```

This script will:
- Test the connection to your PostgreSQL database
- Display database version and connection info
- List existing tables (if any)

### Step 4: Create Database Schema

Once the connection test passes, set up the database schema:
```bash
python setup_database.py
```

This will create:
- All necessary tables (products, categories, orders, customers, etc.)
- Indexes for performance
- Triggers for automatic timestamp updates
- Sample categories and products

### Step 5: Verify Setup

Run the connection test again to see all created tables:
```bash
python test_db_connection.py
```

## Database Schema

The database includes the following main tables:

- **categories** - Product categories (Grains, Spices, Beverages, etc.)
- **products** - Store products with pricing, inventory, and details
- **customers** - Customer accounts
- **addresses** - Shipping and billing addresses
- **orders** - Customer orders
- **order_items** - Items in each order
- **cart_items** - Shopping cart items
- **reviews** - Product reviews and ratings

## Troubleshooting

### Connection Issues

1. **PostgreSQL not running:**
   ```bash
   # macOS (Homebrew)
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

2. **Database doesn't exist:**
   ```bash
   createdb easyfoods
   ```

3. **Permission issues:**
   - Ensure your PostgreSQL user has CREATE privileges
   - Check your `.env` file has correct credentials

### Common Errors

- **"relation does not exist"**: Run `setup_database.py` to create tables
- **"password authentication failed"**: Check your `.env` file password
- **"could not connect to server"**: Ensure PostgreSQL is running

## Next Steps

After verifying your database setup:
1. Build your web application (Flask, Django, FastAPI, etc.)
2. Implement product catalog
3. Add shopping cart functionality
4. Create checkout and order processing
5. Add user authentication


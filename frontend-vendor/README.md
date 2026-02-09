# eazyfoods Vendor Portal - Frontend

React-based vendor portal for managing products, orders, inventory, and payouts.

## Setup

1. **Install dependencies:**
   ```bash
   cd frontend-vendor
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000 (make sure it's running)

## Features

- ✅ Authentication (Login/Signup)
- ✅ Dashboard with statistics
- ✅ Product management (CRUD)
- ✅ Order management with workflow
- ✅ Inventory tracking
- ✅ Payouts dashboard

## Project Structure

```
frontend-vendor/
├── src/
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── contexts/       # React contexts (Auth)
│   ├── services/        # API services
│   └── utils/          # Utility functions
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.


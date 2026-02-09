# eazyfoods Customer Frontend

A modern, professional customer-facing e-commerce frontend for eazyfoods African grocery store.

## Features

- 🛒 **Product Browsing**: Browse products by category, search, and filter
- 🛍️ **Shopping Cart**: Add items, manage quantities, and view totals
- 🔐 **Authentication**: Customer signup and login
- 📱 **Responsive Design**: Works beautifully on all devices
- 🎨 **Modern UI**: Clean, professional, and engaging interface

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:8000

### Installation

```bash
cd frontend-customer
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:3001

### Build for Production

```bash
npm run build
```

## Project Structure

```
frontend-customer/
├── src/
│   ├── components/      # Reusable components
│   ├── contexts/        # React contexts (Auth, Cart)
│   ├── pages/          # Page components
│   ├── services/        # API service
│   └── App.jsx         # Main app component
└── public/             # Static assets
```

## Pages

- **Home** (`/`): Hero section, featured products, categories
- **Products** (`/products`): Product listing with filters
- **Product Detail** (`/products/:id`): Individual product page
- **Cart** (`/cart`): Shopping cart management
- **Login** (`/login`): Customer login
- **Signup** (`/signup`): Customer registration

## API Endpoints Used

- `GET /api/v1/customer/products` - Get products
- `GET /api/v1/customer/products/:id` - Get product details
- `GET /api/v1/customer/products/categories` - Get categories
- `POST /api/v1/customer/auth/signup` - Customer signup
- `POST /api/v1/customer/auth/login` - Customer login
- `GET /api/v1/customer/orders` - Get customer orders

## Technologies

- React 18
- React Router DOM
- Axios
- Tailwind CSS
- Lucide React (Icons)
- Vite

## Features in Development

- Order placement and checkout
- Order history and tracking
- Customer profile management
- Address management
- Product reviews and ratings
- Wishlist functionality

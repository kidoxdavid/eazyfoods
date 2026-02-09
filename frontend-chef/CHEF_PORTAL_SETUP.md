# Chef Portal Setup Guide

## ✅ Created Files

### Core Structure
- `package.json` - Dependencies and scripts
- `src/services/api.js` - API service
- `src/contexts/AuthContext.jsx` - Authentication context
- `src/pages/Login.jsx` - Login page
- `src/pages/Signup.jsx` - Signup page

## 🔄 Remaining Files to Create

### Essential Pages
1. **Dashboard** (`src/pages/Dashboard.jsx`)
   - Show chef stats (reviews, ratings, verification status)
   - Quick actions

2. **Profile** (`src/pages/Profile.jsx`)
   - Edit chef profile
   - Manage cuisines
   - Update service details
   - Upload images

3. **Reviews** (`src/pages/Reviews.jsx`)
   - View customer reviews
   - Respond to reviews

### Components
1. **Layout** (`src/components/Layout.jsx`)
   - Sidebar navigation
   - Header with user info

2. **PrivateRoute** (`src/components/PrivateRoute.jsx`)
   - Protect authenticated routes

### App Files
1. **App.jsx** - Main app with routing
2. **main.jsx** - Entry point
3. **index.css** - Styles
4. **vite.config.js** - Vite configuration
5. **tailwind.config.js** - Tailwind configuration

## Quick Start

1. **Install dependencies:**
   ```bash
   cd frontend-chef
   npm install
   ```

2. **Create remaining files** (copy from frontend-vendor and adapt)

3. **Start development:**
   ```bash
   npm run dev
   ```

## API Endpoints Used

- `POST /api/v1/chef/auth/signup` - Chef registration
- `POST /api/v1/chef/auth/login` - Chef login
- `GET /api/v1/chef/auth/me` - Get current chef
- `GET /api/v1/chef/profile` - Get profile
- `PUT /api/v1/chef/profile` - Update profile
- `GET /api/v1/chef/reviews` - Get reviews
- `POST /api/v1/chef/reviews/{id}/respond` - Respond to review


# 🗺️ GPS Routing & Customer ETA Tracking - Implementation Plan

## Overview
This document outlines where and how to implement GPS routing and real-time ETA tracking for the eazyfoods delivery system.

---

## 📍 Where to Add Features

### **1. Customer-Facing Features**

#### **Frontend: `frontend-customer/src/pages/OrderDetail.jsx`**
- **Current State**: Shows order status, items, delivery info
- **Add**: 
  - Real-time ETA display
  - Live map showing driver location
  - Delivery progress tracker
  - Estimated arrival time countdown

#### **Frontend: `frontend-customer/src/pages/Orders.jsx`**
- **Current State**: Lists all customer orders
- **Add**: 
  - Quick ETA badge on active deliveries
  - "Track Order" button for in-transit orders

---

### **2. Driver-Facing Features**

#### **Frontend: `frontend-delivery/src/pages/MyDeliveries.jsx`**
- **Current State**: Shows list of driver's deliveries
- **Add**: 
  - "Start Navigation" button
  - Route optimization for multiple deliveries
  - Real-time location tracking toggle

#### **New Component: `frontend-delivery/src/pages/ActiveDelivery.jsx`** (NEW)
- **Purpose**: Full-screen delivery tracking interface
- **Features**:
  - Interactive map with route
  - Turn-by-turn navigation
  - Customer location marker
  - Distance remaining
  - ETA calculation
  - "Arrived" and "Delivered" buttons

---

### **3. Backend API Endpoints**

#### **New File: `app/api/v1/endpoints/delivery_tracking.py`** (NEW)
- **Endpoints**:
  - `POST /driver/deliveries/{delivery_id}/update-location` - Update driver's current location
  - `GET /customer/deliveries/{delivery_id}/tracking` - Get real-time tracking data
  - `GET /driver/deliveries/{delivery_id}/route` - Get optimized route
  - `GET /driver/deliveries/{delivery_id}/eta` - Calculate ETA

#### **Update: `app/api/v1/endpoints/driver_portal.py`**
- **Enhance**: `PUT /driver/deliveries/{delivery_id}/status` to include location updates

#### **Update: `app/api/v1/endpoints/customer_orders.py`**
- **Enhance**: `GET /customer/orders/{order_id}` to include tracking data

---

### **4. Database Updates**

#### **Update: `app/models/driver.py`**
- Already has: `current_location_latitude`, `current_location_longitude`, `last_location_update`
- ✅ No changes needed

#### **Update: `app/models/driver.py` - Delivery Model**
- Already has: `current_latitude`, `current_longitude`, `pickup_latitude`, `pickup_longitude`, `delivery_latitude`, `delivery_longitude`
- **Add**:
  ```python
  route_polyline = Column(Text)  # Encoded route from Google Maps
  route_distance_km = Column(DECIMAL(8, 2))  # Total route distance
  route_duration_seconds = Column(Integer)  # Estimated route duration
  current_eta_minutes = Column(Integer)  # Current ETA in minutes
  last_location_update = Column(DateTime)  # Last time location was updated
  ```

---

## 🔧 How It Will Work

### **Architecture Flow**

```
┌─────────────────┐
│   Driver App    │
│  (Mobile/Web)   │
└────────┬────────┘
         │
         │ 1. GPS Location Updates (every 10-30 seconds)
         │    POST /driver/deliveries/{id}/update-location
         ▼
┌─────────────────┐
│   Backend API   │
│  (FastAPI)      │
└────────┬────────┘
         │
         │ 2. Calculate ETA using Google Maps API
         │    - Get route from driver → customer
         │    - Calculate distance & time
         │
         │ 3. Store location & ETA in database
         │
         │ 4. Push updates via WebSocket/SSE
         ▼
┌─────────────────┐
│  Customer App   │
│  (Web/Mobile)   │
└─────────────────┘
         │
         │ 5. Poll or receive real-time updates
         │    GET /customer/deliveries/{id}/tracking
         │
         │ 6. Display on map with ETA
```

---

## 🛠️ Implementation Steps

### **Phase 1: Backend Infrastructure**

#### **Step 1.1: Add Google Maps API Integration**
**File**: `app/services/maps_service.py` (NEW)

```python
import googlemaps
from app.core.config import settings

class MapsService:
    def __init__(self):
        self.client = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
    
    def get_route(self, origin_lat, origin_lng, dest_lat, dest_lng):
        """Get route between two points"""
        directions = self.client.directions(
            (origin_lat, origin_lng),
            (dest_lat, dest_lng),
            mode="driving"
        )
        return directions
    
    def calculate_eta(self, origin_lat, origin_lng, dest_lat, dest_lng):
        """Calculate ETA in minutes"""
        route = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        if route:
            duration_seconds = route[0]['legs'][0]['duration']['value']
            return duration_seconds // 60
        return None
    
    def get_distance_km(self, origin_lat, origin_lng, dest_lat, dest_lng):
        """Get distance in kilometers"""
        route = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        if route:
            distance_meters = route[0]['legs'][0]['distance']['value']
            return distance_meters / 1000
        return None
```

#### **Step 1.2: Create Tracking Endpoints**
**File**: `app/api/v1/endpoints/delivery_tracking.py` (NEW)

```python
@router.post("/driver/deliveries/{delivery_id}/update-location")
async def update_driver_location(
    delivery_id: str,
    location_data: LocationUpdate,
    current_driver: dict = Depends(get_current_driver),
    db: Session = Depends(get_db)
):
    """Update driver's current location and recalculate ETA"""
    # 1. Update delivery.current_latitude/longitude
    # 2. Update driver.current_location_latitude/longitude
    # 3. Calculate new ETA using MapsService
    # 4. Update delivery.current_eta_minutes
    # 5. Return updated tracking data
    pass

@router.get("/customer/deliveries/{delivery_id}/tracking")
async def get_tracking_data(
    delivery_id: str,
    current_customer: dict = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get real-time tracking data for customer"""
    # 1. Get delivery with driver location
    # 2. Get customer delivery address
    # 3. Calculate current ETA
    # 4. Return: driver_location, customer_location, eta, distance
    pass
```

#### **Step 1.3: Update Database Model**
**File**: `app/models/driver.py`

Add new columns to `Delivery` model:
```python
route_polyline = Column(Text)
route_distance_km = Column(DECIMAL(8, 2))
route_duration_seconds = Column(Integer)
current_eta_minutes = Column(Integer)
last_location_update = Column(DateTime)
```

#### **Step 1.4: Create Database Migration**
**File**: `migrations/add_delivery_tracking_fields.sql` (NEW)

```sql
ALTER TABLE deliveries 
ADD COLUMN route_polyline TEXT,
ADD COLUMN route_distance_km DECIMAL(8, 2),
ADD COLUMN route_duration_seconds INTEGER,
ADD COLUMN current_eta_minutes INTEGER,
ADD COLUMN last_location_update TIMESTAMP;
```

---

### **Phase 2: Driver App Features**

#### **Step 2.1: Location Tracking Service**
**File**: `frontend-delivery/src/services/locationTracking.js` (NEW)

```javascript
// Use browser Geolocation API or React Native Location
export const startLocationTracking = (deliveryId, updateInterval = 30000) => {
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      // Update location every 30 seconds
      api.post(`/driver/deliveries/${deliveryId}/update-location`, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      })
    },
    (error) => console.error('Location error:', error),
    { enableHighAccuracy: true, timeout: 5000 }
  )
  return watchId
}
```

#### **Step 2.2: Active Delivery Page**
**File**: `frontend-delivery/src/pages/ActiveDelivery.jsx` (NEW)

**Features**:
- Google Maps integration (react-google-maps or @react-google-maps/api)
- Display route from driver → customer
- Show distance remaining
- Show ETA countdown
- "Start Navigation" button (opens Google Maps/Apple Maps)
- "Arrived" and "Delivered" buttons

#### **Step 2.3: Update MyDeliveries Page**
**File**: `frontend-delivery/src/pages/MyDeliveries.jsx`

**Add**:
- "Track Delivery" button for active deliveries
- ETA display for in-transit deliveries
- Location sharing toggle

---

### **Phase 3: Customer App Features**

#### **Step 3.1: Tracking Component**
**File**: `frontend-customer/src/components/DeliveryTracker.jsx` (NEW)

**Features**:
- Google Maps showing:
  - Customer location (destination)
  - Driver location (updates in real-time)
  - Route line
- ETA countdown
- Distance remaining
- Driver info card
- Auto-refresh every 10-15 seconds

#### **Step 3.2: Update OrderDetail Page**
**File**: `frontend-customer/src/pages/OrderDetail.jsx`

**Add**:
- Import and render `DeliveryTracker` component
- Show tracking only when delivery status is:
  - `accepted`, `picked_up`, or `in_transit`
- Replace static delivery info with live map

#### **Step 3.3: Update Orders List**
**File**: `frontend-customer/src/pages/Orders.jsx`

**Add**:
- ETA badge on active deliveries
- "Track Order" link/button

---

## 📦 Required Dependencies

### **Backend**
```bash
pip install googlemaps
```

### **Frontend (Customer & Delivery)**
```bash
npm install @react-google-maps/api
# OR
npm install react-google-maps
```

### **Environment Variables**
Add to `.env`:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 🔐 API Key Setup

1. **Get Google Maps API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable "Maps JavaScript API"
   - Enable "Directions API"
   - Enable "Geocoding API"
   - Create API key and restrict it to your domains

2. **Add to Backend Config**:
   - `app/core/config.py`: Add `GOOGLE_MAPS_API_KEY`

---

## 🎯 Real-Time Updates Options

### **Option 1: Polling (Simplest)**
- Customer app polls `/customer/deliveries/{id}/tracking` every 10-15 seconds
- Pros: Simple, no extra infrastructure
- Cons: Higher server load, slight delay

### **Option 2: Server-Sent Events (SSE)**
- Backend streams updates via SSE
- Pros: Real-time, efficient
- Cons: More complex

### **Option 3: WebSockets**
- Use Socket.io or similar
- Pros: True real-time, bidirectional
- Cons: Most complex, requires WebSocket server

**Recommendation**: Start with **Option 1 (Polling)** for MVP, upgrade to SSE/WebSockets later.

---

## 📱 Mobile Considerations

### **Driver App (Mobile)**
- Use device GPS for accurate location
- Background location tracking
- Battery optimization
- Permissions handling

### **Customer App (Mobile)**
- Request location permission (optional, for "near me" features)
- Handle offline scenarios
- Optimize map rendering

---

## 🚀 Quick Start Implementation Order

1. **Backend** (Day 1-2):
   - ✅ Add Google Maps service
   - ✅ Create tracking endpoints
   - ✅ Update database model
   - ✅ Test API endpoints

2. **Driver App** (Day 3-4):
   - ✅ Add location tracking
   - ✅ Create ActiveDelivery page
   - ✅ Integrate Google Maps

3. **Customer App** (Day 5-6):
   - ✅ Create DeliveryTracker component
   - ✅ Integrate into OrderDetail
   - ✅ Add ETA badges

4. **Testing & Polish** (Day 7):
   - ✅ Test end-to-end flow
   - ✅ Optimize performance
   - ✅ Handle edge cases

---

## 📊 Data Flow Example

### **Scenario: Driver picks up order**

1. **Driver clicks "Picked Up"**:
   - Frontend: `PUT /driver/deliveries/{id}/status` with `status: "picked_up"`
   - Backend: Updates delivery status, sets `picked_up_at`

2. **Driver location updates** (every 30 seconds):
   - Frontend: `POST /driver/deliveries/{id}/update-location` with lat/lng
   - Backend: 
     - Updates `delivery.current_latitude/longitude`
     - Calls Google Maps API to calculate ETA
     - Updates `delivery.current_eta_minutes`
     - Returns updated tracking data

3. **Customer views order**:
   - Frontend: `GET /customer/deliveries/{id}/tracking` (every 15 seconds)
   - Backend: Returns:
     ```json
     {
       "driver_location": { "lat": 51.0447, "lng": -114.0719 },
       "customer_location": { "lat": 51.0500, "lng": -114.0800 },
       "eta_minutes": 12,
       "distance_km": 2.5,
       "status": "in_transit"
     }
     ```
   - Frontend: Updates map and ETA display

---

## 🎨 UI/UX Recommendations

### **Customer Tracking View**
- Large, clear map (60-70% of screen)
- ETA countdown prominently displayed
- Driver info card (name, vehicle, phone)
- "Call Driver" button
- Progress indicator (e.g., "Driver is 2.5 km away")

### **Driver Navigation View**
- Full-screen map
- Large "Navigate" button (opens native maps app)
- Distance and time remaining
- Customer address clearly displayed
- Quick action buttons: "Arrived", "Delivered"

---

## 🔒 Security Considerations

1. **Location Privacy**:
   - Only share driver location during active delivery
   - Stop tracking when delivery is complete
   - Allow drivers to disable location sharing

2. **API Key Security**:
   - Never expose Google Maps API key in frontend
   - Use backend proxy for all Maps API calls
   - Restrict API key to specific domains/IPs

3. **Access Control**:
   - Verify customer can only track their own orders
   - Verify driver can only update their own deliveries
   - Use JWT authentication for all endpoints

---

## 📈 Future Enhancements

1. **Route Optimization**:
   - Optimize routes for multiple deliveries
   - Batch deliveries by zone
   - Suggest optimal pickup order

2. **Predictive ETA**:
   - Use historical data to predict ETAs
   - Account for traffic patterns
   - Machine learning for accuracy

3. **Notifications**:
   - Push notifications when driver is nearby
   - SMS updates for customers without app
   - Email delivery confirmations

4. **Analytics**:
   - Track average delivery times
   - Identify bottlenecks
   - Optimize driver assignments

---

## ✅ Checklist

### Backend
- [ ] Install `googlemaps` package
- [ ] Create `MapsService` class
- [ ] Create `delivery_tracking.py` endpoints
- [ ] Update `Delivery` model with tracking fields
- [ ] Create database migration
- [ ] Add `GOOGLE_MAPS_API_KEY` to config
- [ ] Test location update endpoint
- [ ] Test ETA calculation

### Driver App
- [ ] Install Google Maps library
- [ ] Create location tracking service
- [ ] Create `ActiveDelivery.jsx` page
- [ ] Add "Track Delivery" to `MyDeliveries.jsx`
- [ ] Test location updates
- [ ] Test map rendering

### Customer App
- [ ] Install Google Maps library
- [ ] Create `DeliveryTracker.jsx` component
- [ ] Integrate into `OrderDetail.jsx`
- [ ] Add ETA badges to `Orders.jsx`
- [ ] Test real-time updates
- [ ] Test map rendering

### Testing
- [ ] End-to-end delivery flow
- [ ] Location accuracy
- [ ] ETA calculation accuracy
- [ ] Performance (polling frequency)
- [ ] Error handling
- [ ] Offline scenarios

---

## 📞 Support & Resources

- **Google Maps API Docs**: https://developers.google.com/maps/documentation
- **React Google Maps**: https://react-google-maps-api-docs.netlify.app/
- **Geolocation API**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

---

**Ready to implement? Start with Phase 1, Step 1.1!** 🚀


"""
API v1 routes
"""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, vendors, products, orders, inventory, payouts, dashboard,
    support, reviews, promotions, staff, analytics, upload, vendor_deliveries, vendor_marketing, vendor_stores,
    customer_auth, customer_products, customer_orders, customer_stores, customer_cart, customer_profile, customer_recipes, customer_reviews, customer_promotions, customer_chat, customer_deliveries, customer_support, customer_marketing, customer_chefs,
    driver_auth, driver_portal, delivery_tracking,
    chef_auth, chef_portal, chef_marketing, chef_support, chef_chat, chef_cuisines, chef_orders, chef_promotions,
    admin_auth, admin_vendors, admin_customers, admin_products, admin_orders, admin_dashboard,
    admin_analytics, admin_reviews, admin_support, admin_activity, admin_users, admin_promotions, admin_export, admin_drivers, admin_deliveries, admin_settings, admin_barcode, admin_chefs,
    restore_backup, marketing, marketing_extended, marketing_admin, marketing_recipes, marketing_coupons,
    customer_coupons, barcode, payments_helcim,
    customer_chat_messages, vendor_chat, driver_chat, admin_chat
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(barcode.router, prefix="/barcode", tags=["Barcode"])
api_router.include_router(payouts.router, prefix="/payouts", tags=["Payouts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(support.router, prefix="/support", tags=["Support"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
api_router.include_router(promotions.router, prefix="/promotions", tags=["Promotions"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(upload.router, prefix="/uploads", tags=["Uploads"])
api_router.include_router(vendor_deliveries.router, prefix="/deliveries", tags=["Vendor Deliveries"])
api_router.include_router(vendor_marketing.router, prefix="/vendor/marketing", tags=["Vendor Marketing"])
api_router.include_router(vendor_stores.router, prefix="/stores", tags=["Vendor Stores"])
api_router.include_router(vendor_chat.router, prefix="/vendor/chat", tags=["Vendor Chat"])

# Customer endpoints
api_router.include_router(customer_auth.router, prefix="/customer/auth", tags=["Customer Auth"])
api_router.include_router(customer_products.router, prefix="/customer", tags=["Customer Products"])
api_router.include_router(customer_orders.router, prefix="/customer/orders", tags=["Customer Orders"])
api_router.include_router(customer_stores.router, prefix="/customer/stores", tags=["Customer Stores"])
api_router.include_router(customer_cart.router, prefix="/customer/cart", tags=["Customer Cart"])
api_router.include_router(payments_helcim.router, prefix="/customer/payments", tags=["Payments"])
api_router.include_router(customer_profile.router, prefix="/customer", tags=["Customer Profile"])
api_router.include_router(customer_recipes.router, prefix="/customer/recipes", tags=["Customer Recipes"])
api_router.include_router(customer_reviews.router, prefix="/customer/reviews", tags=["Customer Reviews"])
api_router.include_router(customer_promotions.router, prefix="/customer", tags=["Customer Promotions"])
api_router.include_router(customer_chat.router, prefix="/customer", tags=["Customer Chat"])
api_router.include_router(customer_chat_messages.router, prefix="/customer/chat", tags=["Customer Chat Messages"])
api_router.include_router(customer_deliveries.router, prefix="/customer/deliveries", tags=["Customer Deliveries"])
api_router.include_router(customer_support.router, prefix="/customer/support", tags=["Customer Support"])
api_router.include_router(customer_marketing.router, prefix="/customer/marketing", tags=["Customer Marketing"])

# Driver endpoints
api_router.include_router(driver_auth.router, prefix="/driver/auth", tags=["Driver Auth"])
api_router.include_router(driver_portal.router, prefix="/driver", tags=["Driver Portal"])
api_router.include_router(driver_chat.router, prefix="/driver/chat", tags=["Driver Chat"])
api_router.include_router(delivery_tracking.router, tags=["Delivery Tracking"])

# Chef endpoints
api_router.include_router(chef_auth.router, prefix="/chef/auth", tags=["Chef Auth"])
api_router.include_router(chef_portal.router, prefix="/chef", tags=["Chef Portal"])
api_router.include_router(chef_marketing.router, prefix="/chef/marketing", tags=["Chef Marketing"])
api_router.include_router(chef_support.router, prefix="/chef/support", tags=["Chef Support"])
api_router.include_router(chef_chat.router, prefix="/chef/chat", tags=["Chef Chat"])
api_router.include_router(chef_cuisines.router, prefix="/chef/cuisines", tags=["Chef Cuisines"])
api_router.include_router(chef_orders.router, prefix="/chef/orders", tags=["Chef Orders"])
api_router.include_router(chef_promotions.router, prefix="/chef/promotions", tags=["Chef Promotions"])
api_router.include_router(customer_chefs.router, prefix="/customer", tags=["Customer Chefs"])

# Admin endpoints
api_router.include_router(admin_auth.router, prefix="/admin/auth", tags=["Admin Auth"])
api_router.include_router(admin_dashboard.router, prefix="/admin/dashboard", tags=["Admin Dashboard"])
api_router.include_router(admin_vendors.router, prefix="/admin/vendors", tags=["Admin Vendors"])
api_router.include_router(admin_customers.router, prefix="/admin/customers", tags=["Admin Customers"])
api_router.include_router(admin_products.router, prefix="/admin/products", tags=["Admin Products"])
api_router.include_router(admin_orders.router, prefix="/admin/orders", tags=["Admin Orders"])
api_router.include_router(admin_analytics.router, prefix="/admin/analytics", tags=["Admin Analytics"])
api_router.include_router(admin_reviews.router, prefix="/admin/reviews", tags=["Admin Reviews"])
api_router.include_router(admin_support.router, prefix="/admin/support", tags=["Admin Support"])
api_router.include_router(admin_chat.router, prefix="/admin/chat", tags=["Admin Chat"])
api_router.include_router(admin_activity.router, prefix="/admin/activity", tags=["Admin Activity"])
api_router.include_router(admin_users.router, prefix="/admin/users", tags=["Admin Users"])
api_router.include_router(admin_promotions.router, prefix="/admin/promotions", tags=["Admin Promotions"])
api_router.include_router(admin_export.router, prefix="/admin/export", tags=["Admin Export"])
api_router.include_router(admin_drivers.router, prefix="/admin/drivers", tags=["Admin Drivers"])
api_router.include_router(admin_deliveries.router, prefix="/admin/deliveries", tags=["Admin Deliveries"])
api_router.include_router(admin_settings.router, prefix="/admin", tags=["Admin Settings"])
api_router.include_router(admin_barcode.router, prefix="/admin/barcode", tags=["Admin Barcode"])
api_router.include_router(admin_chefs.router, prefix="/admin/chefs", tags=["Admin Chefs"])
api_router.include_router(restore_backup.router, prefix="/admin", tags=["Admin Restore"])
api_router.include_router(marketing.router, prefix="/admin/marketing", tags=["Admin Marketing"])
api_router.include_router(marketing_extended.router, prefix="/admin/marketing", tags=["Admin Marketing Extended"])
api_router.include_router(marketing_admin.router, prefix="/admin/marketing/admin", tags=["Marketing Admin Control"])
api_router.include_router(marketing_recipes.router, prefix="/admin/marketing", tags=["Marketing Recipes & Meal Plans"])
api_router.include_router(marketing_coupons.router, prefix="/admin/marketing/coupons", tags=["Marketing Coupons"])

# Customer coupon endpoints
api_router.include_router(customer_coupons.router, prefix="/customer/coupons", tags=["Customer Coupons"])


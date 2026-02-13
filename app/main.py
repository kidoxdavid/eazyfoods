"""
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1 import api_router
from pathlib import Path

# Import all models to ensure SQLAlchemy relationships are resolved
from app.models import vendor, customer, product, order, admin, inventory, payout, promotion, recipe, review, support, driver, chef, cuisine

app = FastAPI(
    title="EAZyfoods Vendor Portal API",
    description="API for EAZyfoods multi-vendor grocery delivery marketplace",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware (cors_origins_list parses comma-separated CORS_ORIGINS env)
origins = settings.cors_origins_list
if "*" in origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Mount static files for uploaded images
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(exist_ok=True)
app.mount("/api/v1/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.on_event("startup")
async def startup_log():
    """Log Stripe config so test payments can be verified in Dashboard."""
    sk = getattr(settings, "STRIPE_SECRET_KEY", None) or ""
    if sk:
        mode = "TEST" if sk.startswith("sk_test_") else "LIVE"
        print(f"[Stripe] Configured ({mode}). Test payments: https://dashboard.stripe.com/test/payments")
    else:
        print("[Stripe] Not configured (no STRIPE_SECRET_KEY in .env)")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EAZyfoods Vendor Portal API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


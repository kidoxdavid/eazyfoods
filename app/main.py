"""
FastAPI application entry point
"""
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1 import api_router
from pathlib import Path

logger = logging.getLogger(__name__)

# Import all models to ensure SQLAlchemy relationships are resolved
from app.models import vendor, customer, product, order, admin, inventory, payout, promotion, recipe, review, support, driver, chef, cuisine

app = FastAPI(
    title="EAZyfoods Vendor Portal API",
    description="API for EAZyfoods multi-vendor grocery delivery marketplace",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS origins (must include all frontend origins on Render, e.g. https://eazyfoods.ca,https://admin.eazyfoods.ca)
origins = settings.cors_origins_list or ["*"]
if not origins or "*" in origins:
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


class EnsureCORSHeadersMiddleware(BaseHTTPMiddleware):
    """Ensure CORS headers are on every response (including 500)."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if "access-control-allow-origin" not in [h.lower() for h in response.headers.keys()]:
            origin = request.headers.get("origin", "")
            if "*" in origins or not origins:
                response.headers["Access-Control-Allow-Origin"] = "*"
            elif origin and origin in origins:
                response.headers["Access-Control-Allow-Origin"] = origin
            elif origins:
                response.headers["Access-Control-Allow-Origin"] = origins[0]
        return response


app.add_middleware(EnsureCORSHeadersMiddleware)


def _cors_headers(origin: str) -> dict:
    """Build CORS headers for a response."""
    if "*" in origins or not origins:
        return {"Access-Control-Allow-Origin": "*"}
    if origin and origin in origins:
        return {"Access-Control-Allow-Origin": origin}
    if origins:
        return {"Access-Control-Allow-Origin": origins[0]}
    return {"Access-Control-Allow-Origin": "*"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure 500 and other unhandled errors still return CORS headers so the frontend sees the real error."""
    logger.exception("Unhandled exception: %s", exc)
    origin = request.headers.get("origin", "")
    headers = _cors_headers(origin)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
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


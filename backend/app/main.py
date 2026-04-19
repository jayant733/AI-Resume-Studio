from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth_routes import router as auth_router
from app.api.routes import router
from app.api.products_routes import router as products_router
from app.db import tables  # noqa: F401
from app.db.session import Base, engine
from app.utils.config import get_settings
from app.utils.logging import configure_logging

try:
    from app.api.stripe_routes import router as stripe_router
except ModuleNotFoundError:
    stripe_router = None


settings = get_settings()
logger = logging.getLogger(__name__)


# -----------------------------
# ✅ LIFESPAN (DB FIX ALREADY OK)
# -----------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)


# -----------------------------
# ✅ CORS (RE-IMPLEMENTED FROM SCRATCH)
# -----------------------------
origins = [origin.strip() for origin in settings.backend_cors_origins.split(",")]

# Add explicit CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False, # Set to False temporarily for diagnosis
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Explicit OPTIONS handler for preflight requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return {"status": "ok"}



# -----------------------------
# ROUTES
# -----------------------------
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
if stripe_router is not None:
    app.include_router(stripe_router, prefix="/stripe", tags=["Stripe"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(router)


# -----------------------------
# ✅ BETTER ERROR LOGGING
# -----------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.exception("🔥 REAL ERROR:", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},  # show real error (temporary)
    )


# -----------------------------
# HEALTH
# -----------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.app_name}
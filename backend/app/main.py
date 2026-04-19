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
    # ✅ FIX: ensure upload + generated directories exist
    from pathlib import Path
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    generated_dir = Path(settings.generated_dir)
    generated_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)


# -----------------------------
# ✅ CORS (ROBUST IMPLEMENTATION)
# -----------------------------
# We explicitly include the Vercel URL and local dev environments for flexibility.
origins = [
    "https://ai-resume-studio-tau.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600, # Cache preflight response for 1 hour
)



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
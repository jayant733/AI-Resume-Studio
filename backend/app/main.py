from __future__ import annotations

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.auth_routes import router as auth_router
from app.api.analytics import router as analytics_router
from app.api.applications import router as applications_router
from app.api.evaluation import router as evaluation_router
from app.api.oauth_routes import (
    router as oauth_router,
    _handle_github_callback,
    _handle_google_callback,
)
from app.api.recruiter import router as recruiter_router
from app.api.resumes_versions import router as resumes_router
from app.api.routes import router
from app.api.products_routes import router as products_router
from app.api.templates import router as templates_router
from app.db import tables  # noqa: F401
from app.db.session import Base, engine, get_db
from app.utils.config import get_settings
from app.utils.logging import configure_logging

try:
    from app.api.stripe_routes import router as stripe_router
except ModuleNotFoundError:
    stripe_router = None


settings = get_settings()
logger = logging.getLogger(__name__)


# -----------------------------
# ✅ LIFESPAN
# -----------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    try:
        from app.migrate_db import migrate as migrate_db  # noqa: WPS433
        migrate_db()
    except Exception as exc:
        logger.warning("DB migration step failed (non-fatal): %s", exc)

    Base.metadata.create_all(bind=engine)
    
    from pathlib import Path
    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    generated_dir = Path(settings.generated_dir)
    generated_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)


# -----------------------------
# ✅ CORS
# -----------------------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-resume-studio-tau.vercel.app",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600, 
)


# -----------------------------
# ROUTES
# -----------------------------
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(oauth_router, prefix="/auth/oauth", tags=["OAuth"])
if stripe_router is not None:
    app.include_router(stripe_router, prefix="/stripe", tags=["Stripe"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(templates_router, prefix="/templates", tags=["Templates"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(evaluation_router, prefix="/api/v1", tags=["Evaluation"])
app.include_router(recruiter_router, prefix="/api/v1/recruiter", tags=["Recruiter"])
app.include_router(applications_router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(resumes_router, prefix="/api/v1/resumes", tags=["Resumes"])
app.include_router(router)


# Legacy OAuth callback aliases for Google Console configuration.
@app.get("/oauth/callback")
async def oauth_callback_alias(code: str, db: Session = Depends(get_db)):
    return await _handle_google_callback(code, db)


@app.get("/oauth/github/callback")
async def oauth_github_callback_alias(code: str, db: Session = Depends(get_db)):
    return await _handle_github_callback(code, db)


@app.get("/auth/oauth/github/callback")
async def auth_oauth_github_callback_alias(code: str, db: Session = Depends(get_db)):
    return await _handle_github_callback(code, db)


# -----------------------------
# ✅ ROBUST ERROR HANDLING (Fixes CORS on errors)
# -----------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    error_msg = f"🔥 CRITICAL ERROR in {request.method} {request.url.path}: {str(exc)}"
    logger.exception(error_msg, exc_info=exc)
    
    response = JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "error_type": type(exc).__name__,
            "path": request.url.path
        },
    )
    # Manual CORS headers for error responses
    origin = request.headers.get("origin")
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
    origin = request.headers.get("origin")
    if origin in origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


# -----------------------------
# HEALTH
# -----------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.app_name}

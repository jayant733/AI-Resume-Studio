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
except ModuleNotFoundError:  # pragma: no cover
    stripe_router = None


settings = get_settings()
cors_origins = [origin.strip() for origin in settings.backend_cors_origins.split(",") if origin.strip()]
local_origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=local_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
if stripe_router is not None:
    app.include_router(stripe_router, prefix="/stripe", tags=["Stripe"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.exception("Unhandled server error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": (
                "Internal server error. If this happened after recent schema changes, restart services "
                "and ensure the database is up to date."
            )
        },
    )


@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.app_name}

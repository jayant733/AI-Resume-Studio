from __future__ import annotations

import logging
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.db.tables import User
from app.services.auth_service import AuthService
from app.services.oauth_service import OAuthService
from app.utils.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

async def _handle_google_callback(code: str, db: Session):
    oauth_service = OAuthService()
    settings = get_settings()

    try:
        user_info = await oauth_service.get_google_user_info(code)
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        return RedirectResponse(f"{settings.backend_cors_origins.split(',')[0]}/login?error=google_auth_failed")

    email = user_info.get("email")
    if not email:
        return RedirectResponse(f"{settings.backend_cors_origins.split(',')[0]}/login?error=no_email")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=user_info.get("name"),
            profile_image_url=user_info.get("picture"),
            oauth_provider="google",
            oauth_id=user_info.get("sub"),
            subscription_tier="free",
            credits=3
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update OAuth info if missing
        if not user.oauth_provider:
            user.oauth_provider = "google"
            user.oauth_id = user_info.get("sub")
        if not user.profile_image_url:
            user.profile_image_url = user_info.get("picture")
        db.commit()

    # Issue access token (bearer) and hand it back to the frontend callback handler.
    auth_service = AuthService()
    access_token = auth_service.create_access_token(user)
    frontend_url = (settings.backend_cors_origins.split(",")[0] or "http://localhost:3000").rstrip("/")
    encoded = urllib.parse.quote(access_token, safe="")
    return RedirectResponse(f"{frontend_url}/auth/callback?token={encoded}&provider=google")

async def _handle_github_callback(code: str, db: Session):
    oauth_service = OAuthService()
    settings = get_settings()

    try:
        user_info = await oauth_service.get_github_user_info(code)
    except Exception as e:
        logger.error(f"GitHub OAuth error: {e}")
        return RedirectResponse(f"{settings.backend_cors_origins.split(',')[0]}/login?error=github_auth_failed")

    email = user_info.get("email")
    if not email:
        return RedirectResponse(f"{settings.backend_cors_origins.split(',')[0]}/login?error=no_email")

    # Find or create user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            full_name=user_info.get("name") or user_info.get("login"),
            profile_image_url=user_info.get("avatar_url"),
            oauth_provider="github",
            oauth_id=str(user_info.get("id")),
            subscription_tier="free",
            credits=3
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if not user.oauth_provider:
            user.oauth_provider = "github"
            user.oauth_id = str(user_info.get("id"))
        if not user.profile_image_url:
            user.profile_image_url = user_info.get("avatar_url")
        db.commit()

    auth_service = AuthService()
    access_token = auth_service.create_access_token(user)
    frontend_url = (settings.backend_cors_origins.split(",")[0] or "http://localhost:3000").rstrip("/")
    encoded = urllib.parse.quote(access_token, safe="")
    return RedirectResponse(f"{frontend_url}/auth/callback?token={encoded}&provider=github")

@router.get("/google")
def google_login():
    """Redirects to Google OAuth page."""
    settings = get_settings()
    scope = "openid email profile"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?response_type=code"
        f"&client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&scope={scope}"
    )
    return RedirectResponse(url)

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handles Google OAuth callback."""
    return await _handle_google_callback(code, db)

@router.get("/github")
def github_login():
    """Redirects to GitHub OAuth page."""
    settings = get_settings()
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        f"&scope=user:email"
    )
    return RedirectResponse(url)

@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Handles GitHub OAuth callback."""
    return await _handle_github_callback(code, db)

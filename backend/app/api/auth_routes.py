from __future__ import annotations

import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_db
from app.db.tables import User
from app.models.schemas import AuthLoginRequest, AuthResponse, AuthSignupRequest, UserResponse
from app.services.auth_service import AuthService, get_current_user


router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/signup", response_model=AuthResponse)
def signup(payload: AuthSignupRequest, db: Session = Depends(get_db)):
    logger.info(f"🚀 Signup attempt for email: {payload.email}")
    try:
        # Check DB connection
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"❌ DB Connection failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Database connection is down.")

    try:
        existing = db.query(User).filter(User.email == payload.email.lower()).first()
    except SQLAlchemyError as exc:
        logger.error(f"❌ Error checking existing user: {str(exc)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Database error while checking existing users: {str(exc)}",
        )
        
    if existing:
        logger.warning(f"⚠️  User already exists: {payload.email}")
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    auth_service = AuthService()
    try:
        hashed_password = auth_service.hash_password(payload.password)
        user = User(
            email=payload.email.lower(),
            full_name=payload.full_name,
            password_hash=hashed_password,
            subscription_tier="free",
            subscription_status="active",
            credits=3
        )
        logger.info(f"🛠️  Created User object for {payload.email}")
        
        db.add(user)
        logger.info("🛠️  Added user to session")
        
        db.commit()
        logger.info("✅ Committed user to DB")
        
        db.refresh(user)
        logger.info(f"✅ Refreshed user, ID: {user.id}")
        
    except SQLAlchemyError as exc:
        db.rollback()
        logger.error(f"❌ SQLAlchemy Error during signup: {str(exc)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Database error while creating account: {str(exc)}",
        )
    except Exception as exc:
        db.rollback()
        logger.error(f"❌ Unexpected Error during signup: {str(exc)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(exc)}",
        )

    token = auth_service.create_access_token(user)
    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email or "",
            full_name=user.full_name,
            subscription_tier=user.subscription_tier,
        ),
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == payload.email.lower()).first()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Database error while loading account. Restart backend and verify schema.",
        ) from exc
    auth_service = AuthService()
    if not user or not auth_service.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = auth_service.create_access_token(user)
    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email or "",
            full_name=user.full_name,
            subscription_tier=user.subscription_tier,
        ),
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email or "",
        full_name=current_user.full_name,
        subscription_tier=current_user.subscription_tier,
    )

from sqlalchemy import text

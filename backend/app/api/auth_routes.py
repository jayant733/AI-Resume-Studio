from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import User
from app.models.schemas import AuthLoginRequest, AuthResponse, AuthSignupRequest, UserResponse
from app.services.auth_service import AuthService, get_current_user


router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
def signup(payload: AuthSignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    auth_service = AuthService()
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=auth_service.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

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
    user = db.query(User).filter(User.email == payload.email.lower()).first()
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

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import User
from app.utils.config import get_settings


class AuthService:
    def __init__(self) -> None:
        settings = get_settings()
        self.secret = settings.auth_secret_key.encode("utf-8")
        self.expiry_hours = settings.auth_token_expiry_hours

    def hash_password(self, password: str) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210000)
        return f"{base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"

    def verify_password(self, password: str, password_hash: str | None) -> bool:
        if not password_hash or "$" not in password_hash:
            return False
        salt_b64, digest_b64 = password_hash.split("$", 1)
        salt = base64.urlsafe_b64decode(salt_b64.encode("utf-8"))
        expected = base64.urlsafe_b64decode(digest_b64.encode("utf-8"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210000)
        return hmac.compare_digest(actual, expected)

    def create_access_token(self, user: User) -> str:
        header = self._encode({"alg": "HS256", "typ": "JWT"})
        payload = self._encode(
            {
                "sub": user.id,
                "email": user.email,
                "exp": int((datetime.now(timezone.utc) + timedelta(hours=self.expiry_hours)).timestamp()),
            }
        )
        signature = hmac.new(self.secret, f"{header}.{payload}".encode("utf-8"), hashlib.sha256).digest()
        return f"{header}.{payload}.{self._b64(signature)}"

    def decode_access_token(self, token: str) -> dict:
        try:
            header, payload, signature = token.split(".")
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid authentication token.") from exc

        expected = self._b64(hmac.new(self.secret, f"{header}.{payload}".encode("utf-8"), hashlib.sha256).digest())
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid authentication signature.")

        data = self._decode(payload)
        if int(data.get("exp", 0)) < int(datetime.now(timezone.utc).timestamp()):
            raise HTTPException(status_code=401, detail="Authentication token expired.")
        return data

    def _encode(self, payload: dict) -> str:
        return self._b64(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    def _decode(self, value: str) -> dict:
        return json.loads(base64.urlsafe_b64decode(self._pad(value)).decode("utf-8"))

    def _b64(self, raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")

    def _pad(self, value: str) -> bytes:
        return (value + "=" * (-len(value) % 4)).encode("utf-8")


def get_optional_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = authorization.split(" ", 1)[1]
    auth_service = AuthService()
    payload = auth_service.decode_access_token(token)
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Authenticated user not found.")
    return user


def get_current_user(
    current_user: User | None = Depends(get_optional_current_user),
) -> User:
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return current_user

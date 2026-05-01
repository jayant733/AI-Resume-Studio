from __future__ import annotations

from fastapi import Depends, HTTPException

from app.db.tables import User
from app.services.auth_service import get_current_user


def require_role(required_role: str):
    def _dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
        return current_user

    return _dep


require_recruiter = require_role("recruiter")


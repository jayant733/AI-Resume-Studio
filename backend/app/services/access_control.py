from __future__ import annotations

import logging
from sqlalchemy.orm import Session
from app.db.tables import User
from app.services.template_service import TemplateService
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class AccessControlService:
    def __init__(self, db: Session):
        self.db = db

    def can_perform_ai_optimization(self, user: User) -> bool:
        """Checks if a user has credits or a Pro subscription for AI features."""
        if user.subscription_tier == "pro" and user.subscription_status == "active":
            return True
            
        if user.credits > 0:
            return True
            
        return False

    def can_use_template(self, user: User, template_id: str) -> bool:
        """Checks if a user can use a specific template (Free vs Premium)."""
        ts = TemplateService()
        meta = ts.get_template_metadata(template_id)
        
        if not meta:
            return False
            
        if not meta.get("is_premium", False):
            return True
            
        if user.subscription_tier == "pro" and user.subscription_status == "active":
            return True
            
        return False

    def increment_usage(self, user: User, ai_call: bool = False, resume_gen: bool = False):
        """Track usage and deduct credits for free users."""
        if ai_call:
            user.ai_calls_count += 1
            if user.subscription_tier != "pro":
                user.credits = max(0, user.credits - 1)
        
        if resume_gen:
            user.resumes_generated_count += 1
            
        self.db.commit()

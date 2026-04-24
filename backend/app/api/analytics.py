from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import User
from app.services.auth_service import get_current_user
from app.services.analytics_service import AnalyticsService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/overview")
def get_overview(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """General dashboard stats."""
    service = AnalyticsService(db)
    return service.get_overview(current_user.id)

@router.get("/skills-gap")
def get_skills_gap(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Top missing skills aggregation."""
    service = AnalyticsService(db)
    return service.get_skills_gap(current_user.id)

@router.get("/history")
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Score progression over time."""
    service = AnalyticsService(db)
    return service.get_progress_history(current_user.id)

@router.get("/section-performance/{output_id}")
def get_section_performance(output_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Detailed section-wise scores."""
    service = AnalyticsService(db)
    return service.get_section_performance(output_id)

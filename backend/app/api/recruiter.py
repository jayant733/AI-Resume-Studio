from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import Resume, User
from app.models.schemas import CandidateRankingRequest, CandidateRankingResponse, ResumeStructuredData
from app.services.analytics_service import AnalyticsService
from app.services.resume_parser import ResumeParserService
from app.services.matching_service import MatchingService
from app.services.rbac import require_recruiter


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/overview")
def recruiter_overview(current_user: User = Depends(require_recruiter), db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_overview(current_user.id)


@router.post("/rank-candidates", response_model=CandidateRankingResponse)
def recruiter_rank_candidates(
    payload: CandidateRankingRequest,
    current_user: User = Depends(require_recruiter),
    db: Session = Depends(get_db),
):
    resumes = db.query(Resume).filter(Resume.id.in_(payload.resume_ids)).all()
    if not resumes:
        raise HTTPException(status_code=404, detail="No resumes found for ranking.")

    unauthorized = [resume.id for resume in resumes if resume.user_id and resume.user_id != current_user.id]
    if unauthorized:
        raise HTTPException(status_code=403, detail="You do not have access to one or more resumes.")

    parser = ResumeParserService()
    matcher = MatchingService()

    job_data = parser.parse_job_description(payload.job_description)
    candidates = [(resume.id, ResumeStructuredData(**resume.parsed_data)) for resume in resumes]
    ranking = matcher.rank_candidates(candidates, job_data, sort_by=payload.sort_by)
    return CandidateRankingResponse(ranking=ranking)


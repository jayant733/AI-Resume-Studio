from __future__ import annotations

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import Job, Resume, User
from app.models.schemas import ResumeStructuredData
from app.services.llm_service import LLMService
from app.utils.config import get_settings

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: int
    user_message: str
    chat_history: list[dict] = []
    resume_id: int | None = None

class FeatureRequest(BaseModel):
    user_id: int
    resume_id: int
    job_id: int | None = None

def _check_tier(user_id: int, required_tier: str, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    tiers = {"free": 0, "pro": 1, "premium": 2}
    if tiers.get(user.subscription_tier, 0) < tiers.get(required_tier, 0):
        raise HTTPException(
            status_code=403, 
            detail=f"This feature requires {required_tier.capitalize()} tier. Please upgrade."
        )

@router.post("/chat")
def stream_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    _check_tier(payload.user_id, "premium", db)
    
    resume_data = None
    if payload.resume_id:
        resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
        if resume:
            resume_data = ResumeStructuredData(**resume.parsed_data)

    llm = LLMService()

    def event_generator():
        try:
            for chunk in llm.stream_chat(payload.user_message, payload.chat_history, resume_data):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/mock-interview")
def generate_mock_interview(payload: FeatureRequest, db: Session = Depends(get_db)):
    _check_tier(payload.user_id, "premium", db)
    
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    job = db.query(Job).filter(Job.id == payload.job_id).first() if payload.job_id else None
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    llm = LLMService()
    job_data = job.parsed_data if job else {"title": "General Position", "skills": []}
    return llm.generate_mock_interview(ResumeStructuredData(**resume.parsed_data), job_data)

@router.post("/linkedin-optimize")
def optimize_linkedin(payload: FeatureRequest, db: Session = Depends(get_db)):
    _check_tier(payload.user_id, "pro", db)
    
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    llm = LLMService()
    return llm.generate_linkedin_profile(ResumeStructuredData(**resume.parsed_data))

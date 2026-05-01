from __future__ import annotations

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.db.tables import User, AppliedJob, GeneratedOutput, Job
from app.services.auth_service import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

class ApplicationCreate(BaseModel):
    company: str
    job_title: str
    job_url: Optional[str] = None
    output_id: Optional[int] = None # Linked optimized resume
    status: str = "applied"

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    company: str
    job_title: str
    job_url: Optional[str]
    status: str
    output_id: Optional[int]
    ats_score: Optional[float]
    notes: Optional[str]
    job_description: Optional[str]
    resume_name: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

def enrich_app_data(app: AppliedJob):
    ats_score = None
    job_description = None
    resume_name = None
    
    if app.output:
        if app.output.evaluation_data:
            ats_score = app.output.evaluation_data.get("overall_score", {}).get("after")
        if app.output.resume:
            resume_name = app.output.resume.original_filename
            
    # Fetch job description through secondary relationship or manually
    if app.job:
        job_description = app.job.description

    return {
        "id": app.id,
        "company": app.company,
        "job_title": app.job_title,
        "job_url": app.job_url,
        "status": app.status,
        "output_id": app.output_id,
        "ats_score": ats_score,
        "notes": app.notes,
        "job_description": job_description,
        "resume_name": resume_name,
        "created_at": app.created_at.isoformat()
    }

@router.post("/", response_model=ApplicationResponse)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify output_id belongs to user if provided
    if payload.output_id:
        output = db.query(GeneratedOutput).filter(GeneratedOutput.id == payload.output_id).first()
        if not output or output.resume.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Invalid resume version selected.")

    new_app = AppliedJob(
        user_id=current_user.id,
        company=payload.company,
        job_title=payload.job_title,
        job_url=payload.job_url,
        output_id=payload.output_id,
        status=payload.status
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    return enrich_app_data(new_app)

@router.get("/", response_model=List[ApplicationResponse])
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    apps = db.query(AppliedJob).filter(AppliedJob.user_id == current_user.id).order_by(AppliedJob.created_at.desc()).all()
    return [enrich_app_data(app) for app in apps]

@router.patch("/{app_id}")
def update_application_status(
    app_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(AppliedJob).filter(AppliedJob.id == app_id, AppliedJob.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
        
    if payload.status:
        app.status = payload.status
    if payload.notes is not None:
        app.notes = payload.notes
        
    db.commit()
    return {"status": "success"}

@router.delete("/{app_id}")
def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(AppliedJob).filter(AppliedJob.id == app_id, AppliedJob.user_id == current_user.id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
        
    db.delete(app)
    db.commit()
    return {"status": "success"}

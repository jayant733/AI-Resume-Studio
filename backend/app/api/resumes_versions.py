from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import Resume, ResumeVersion, User
from app.services.auth_service import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
def list_resumes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists resumes owned by the current user (for builder/recruiter UI selection)."""
    resumes = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .all()
    )
    result = []
    for resume in resumes:
        parsed = resume.parsed_data or {}
        result.append(
            {
                "id": resume.id,
                "name": parsed.get("name"),
                "headline": parsed.get("headline"),
                "source_type": resume.source_type,
                "created_at": resume.created_at.isoformat(),
            }
        )
    return result

@router.post("/")
def create_manual_resume(payload: dict[str, Any], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Creates a new resume from scratch via the builder."""
    resume_data = payload.get("data")
    
    if not resume_data:
        raise HTTPException(status_code=400, detail="data is required")

    new_resume = Resume(
        user_id=current_user.id,
        source_type="manual",
        raw_text="", # No raw text for manual
        parsed_data=resume_data
    )
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    
    # Save as v1
    v1 = ResumeVersion(
        resume_id=new_resume.id,
        version_name="Original",
        data=resume_data
    )
    db.add(v1)
    db.commit()
    
    return {"resume_id": new_resume.id, "version_id": v1.id}

@router.post("/{resume_id}/versions")
def save_resume_version(resume_id: int, payload: dict[str, Any], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Saves a new manual version/snapshot of an existing resume."""
    version_name = payload.get("version_name", "Manual Edit")
    data = payload.get("data")
    
    if not data:
        raise HTTPException(status_code=400, detail="data is required")
        
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    new_version = ResumeVersion(
        resume_id=resume_id,
        version_name=version_name,
        data=data
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    
    return {"version_id": new_version.id}

@router.get("/{resume_id}/versions")
def list_resume_versions(resume_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lists all versions for a specific resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    versions = db.query(ResumeVersion).filter(ResumeVersion.resume_id == resume_id).all()
    return versions

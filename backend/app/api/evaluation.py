from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import GeneratedOutput, Resume, User
from app.models.schemas import (
    ATSScoreResponse, 
    ATSScoreDimension
)
from app.services.auth_service import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/analysis")
def get_latest_analysis(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns the latest detailed breakdown UI data for the user's most recent optimization.

    Dashboard endpoint (no output_id needed):
    GET /api/v1/analysis
    """
    output = (
        db.query(GeneratedOutput)
        .join(Resume, Resume.id == GeneratedOutput.resume_id)
        .filter(Resume.user_id == current_user.id)
        .order_by(GeneratedOutput.created_at.desc())
        .first()
    )
    if not output:
        raise HTTPException(status_code=404, detail="No optimized outputs found.")

    if not output.evaluation_data:
        raise HTTPException(status_code=400, detail="Evaluation data not yet available.")

    return {"output_id": output.id, "analysis": output.evaluation_data}


@router.get("/evaluation")
def get_latest_evaluation(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns high-level improvement metrics for the latest optimization (before vs after).

    Dashboard endpoint (no output_id needed):
    GET /api/v1/evaluation
    """
    output = (
        db.query(GeneratedOutput)
        .join(Resume, Resume.id == GeneratedOutput.resume_id)
        .filter(Resume.user_id == current_user.id)
        .order_by(GeneratedOutput.created_at.desc())
        .first()
    )
    if not output:
        raise HTTPException(status_code=404, detail="No optimized outputs found.")

    if not output.evaluation_data:
        raise HTTPException(status_code=400, detail="Evaluation data not yet available.")

    eval_data = output.evaluation_data
    return {
        "output_id": output.id,
        "ats_score_improvement": eval_data.get("overall_score", {}).get("improvement"),
        "keyword_coverage_increase": eval_data.get("metrics", {}).get("keyword_coverage_increase"),
        "overall_score_before": eval_data.get("overall_score", {}).get("before"),
        "overall_score_after": eval_data.get("overall_score", {}).get("after"),
    }


@router.get("/analysis/{output_id}")
def get_analysis_data(output_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns detailed breakdown UI data for the ATS score.
    """
    output = (
        db.query(GeneratedOutput)
        .join(Resume, Resume.id == GeneratedOutput.resume_id)
        .filter(GeneratedOutput.id == output_id, Resume.user_id == current_user.id)
        .first()
    )
    if not output:
        raise HTTPException(status_code=404, detail="Output not found.")
    
    if not output.evaluation_data:
        raise HTTPException(status_code=400, detail="Evaluation data not yet available.")
        
    return output.evaluation_data

@router.get("/evaluation/{output_id}")
def get_evaluation_metrics(output_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns high-level improvement metrics (before vs after).
    """
    output = (
        db.query(GeneratedOutput)
        .join(Resume, Resume.id == GeneratedOutput.resume_id)
        .filter(GeneratedOutput.id == output_id, Resume.user_id == current_user.id)
        .first()
    )
    if not output:
        raise HTTPException(status_code=404, detail="Output not found.")
    
    if not output.evaluation_data:
        raise HTTPException(status_code=400, detail="Evaluation data not yet available.")
        
    eval_data = output.evaluation_data
    return {
        "ats_score_improvement": eval_data["overall_score"]["improvement"],
        "keyword_coverage_increase": eval_data["metrics"]["keyword_coverage_increase"],
        "overall_score_before": eval_data["overall_score"]["before"],
        "overall_score_after": eval_data["overall_score"]["after"]
    }

@router.get("/diff/{output_id}")
def get_diff_data(output_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns mapping between original and optimized bullets for the Diff Viewer.
    """
    output = (
        db.query(GeneratedOutput)
        .join(Resume, Resume.id == GeneratedOutput.resume_id)
        .filter(GeneratedOutput.id == output_id, Resume.user_id == current_user.id)
        .first()
    )
    if not output:
        raise HTTPException(status_code=404, detail="Output not found.")
    
    if not output.explainability_data:
        raise HTTPException(status_code=400, detail="Explainability data not yet available.")
        
    return output.explainability_data

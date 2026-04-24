from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import GeneratedOutput
from app.models.schemas import (
    ATSScoreResponse, 
    ATSScoreDimension
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/analysis/{output_id}")
def get_analysis_data(output_id: int, db: Session = Depends(get_db)):
    """
    Returns detailed breakdown UI data for the ATS score.
    """
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found.")
    
    if not output.evaluation_data:
        raise HTTPException(status_code=400, detail="Evaluation data not yet available.")
        
    return output.evaluation_data

@router.get("/evaluation/{output_id}")
def get_evaluation_metrics(output_id: int, db: Session = Depends(get_db)):
    """
    Returns high-level improvement metrics (before vs after).
    """
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
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
def get_diff_data(output_id: int, db: Session = Depends(get_db)):
    """
    Returns mapping between original and optimized bullets for the Diff Viewer.
    """
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found.")
    
    if not output.explainability_data:
        raise HTTPException(status_code=400, detail="Explainability data not yet available.")
        
    return output.explainability_data

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import User, GeneratedOutput
from app.services.auth_service import get_current_user
from app.services.storage_service import StorageService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/{output_id}/download")
def get_resume_download_url(
    output_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Returns a temporary signed URL for downloading the resume PDF."""
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Resume output not found.")
        
    # Check ownership (assuming output.resume linked to user)
    if output.resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this resume.")

    if not output.storage_path:
        raise HTTPException(status_code=400, detail="Cloud storage path not found for this resume.")

    storage_service = StorageService()
    signed_url = storage_service.get_signed_url(output.storage_path)
    
    if not signed_url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL.")
        
    return {"download_url": signed_url}

@router.delete("/{output_id}")
def delete_resume_output(
    output_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Deletes the resume output from database and cloud storage."""
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Resume output not found.")
        
    if output.resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this resume.")

    storage_service = StorageService()
    if output.storage_path:
        storage_service.delete_file(output.storage_path)
        
    db.delete(output)
    db.commit()
    
    return {"status": "success"}

from __future__ import annotations

import logging
import time
from typing import Any
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.tables import User
from app.services.template_service import TemplateService
from app.services.pdf_service import PDFService
from app.services.auth_service import get_current_user
from app.services.access_control import AccessControlService
from app.utils.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Lists all available resume templates with access status based on tier.
    """
    service = TemplateService()
    templates = service.list_templates()

    is_pro = current_user.subscription_tier == "pro" and current_user.subscription_status == "active"

    for t in templates:
        t["locked"] = t.get("is_premium", False) and not is_pro

    return templates

@router.get("/{template_id}")
def get_template(template_id: str, current_user: User = Depends(get_current_user)):
    """Gets details for a specific template."""
    service = TemplateService()
    meta = service.get_template_metadata(template_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Template not found")
    return meta

@router.post("/render-preview")
def render_preview(payload: dict[str, Any], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Renders a live preview HTML for the builder.
    """
    resume_data = payload.get("resume_data") or payload.get("resume_json")
    template_id = payload.get("template_id", "classic")

    if not resume_data:
        raise HTTPException(status_code=400, detail="resume_data is required")

    ac = AccessControlService(db)
    
    pdf_service = PDFService()
    html = pdf_service.render_html_preview(resume_data, template_id)
    return {"html": html}

@router.post("/export")
def export_pdf(payload: dict[str, Any], db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Generates and returns a PDF file from the builder data.
    """
    resume_data = payload.get("resume_data")
    template_id = payload.get("template_id", "classic")

    if not resume_data:
        raise HTTPException(status_code=400, detail="resume_data is required")

    ac = AccessControlService(db)
    if not ac.can_use_template(current_user, template_id):
        raise HTTPException(status_code=403, detail="Pro subscription required for premium templates.")

    settings = get_settings()
    pdf_service = PDFService()

    output_filename = f"manual-export-{current_user.id}-{int(time.time())}.pdf"
    output_path = Path(settings.generated_dir) / output_filename

    pdf_path = pdf_service.render_pdf(resume_data, output_path, template_id)

    return FileResponse(
        path=pdf_path, 
        media_type="application/pdf", 
        filename="resume.pdf"
    )

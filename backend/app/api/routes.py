from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.agents.resume_pipeline import ResumeOptimizationAgent
from app.db.session import get_db
from app.db.tables import GeneratedOutput, Job, Resume, User
from app.models.schemas import AnalyzeJobRequest, AnalyzeJobResponse, GenerateResumeRequest, GenerateResumeResponse, ResumeStructuredData, UploadResumeResponse
from app.services.document_parser import DocumentParserService
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.services.matching_service import MatchingService
from app.services.vector_store import VectorStoreService
from app.utils.config import get_settings


router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload-resume", response_model=UploadResumeResponse)
async def upload_resume(
    email: str | None = Form(default=None),
    full_name: str | None = Form(default=None),
    source_type: str = Form(default="pdf"),
    resume_file: UploadFile | None = File(default=None),
    linkedin_json: str | None = Form(default=None),
    profile_image: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    parser = DocumentParserService()
    embedder = EmbeddingService()
    vector_store = VectorStoreService()
    llm_service = LLMService()
    settings = get_settings()

    user = None
    if email:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, full_name=full_name)
            db.add(user)
            db.flush()

    upload_dir = Path(settings.upload_dir)
    image_path = None

    if linkedin_json:
        raw_text, parsed_resume = parser.parse_linkedin_json(json.loads(linkedin_json))
        original_filename = "linkedin.json"
        actual_source_type = "linkedin_json"
    elif resume_file:
        suffix = Path(resume_file.filename or "resume.pdf").suffix.lower()
        actual_source_type = "docx" if suffix == ".docx" else source_type
        fallback_name = f"resume{suffix or '.pdf'}"
        file_path = upload_dir / f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{resume_file.filename or fallback_name}"
        file_path.write_bytes(await resume_file.read())
        raw_text, parsed_resume = parser.parse_file(file_path, actual_source_type)
        original_filename = resume_file.filename
    else:
        raise HTTPException(status_code=400, detail="Provide either resume_file or linkedin_json.")

    if profile_image:
        image_path = upload_dir / f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{profile_image.filename or 'profile.png'}"
        image_path.write_bytes(await profile_image.read())

    image_caption = llm_service.describe_image(image_path) if image_path else None

    resume = Resume(
        user_id=user.id if user else None,
        source_type=actual_source_type,
        original_filename=original_filename,
        raw_text=raw_text,
        parsed_data=parsed_resume.model_dump(),
        profile_image_path=str(image_path) if image_path else None,
        image_caption=image_caption,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    fragments = []
    for entry in parsed_resume.experience:
        fragments.extend(entry.bullets or [f"{entry.title} at {entry.company or 'Company'}"])
    vector_store.upsert_resume_fragments(resume.id, fragments, embedder.embed_texts(fragments))

    logger.info("Uploaded resume %s", resume.id)
    return UploadResumeResponse(resume_id=resume.id, parsed_resume=parsed_resume, image_caption=image_caption)


@router.post("/analyze-job", response_model=AnalyzeJobResponse)
def analyze_job(payload: AnalyzeJobRequest, db: Session = Depends(get_db)):
    parser = DocumentParserService()
    embedder = EmbeddingService()
    vector_store = VectorStoreService()
    matcher = MatchingService()

    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    parsed_job = parser.parse_job_description(payload.job_description)
    parsed_job["requirements_text"] = payload.job_description

    job = Job(
        title=payload.job_title,
        company=payload.company,
        description=payload.job_description,
        parsed_data=parsed_job,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    fragments = parsed_job.get("requirements", []) + parsed_job.get("responsibilities", []) + parsed_job.get("skills", [])
    vector_store.upsert_job_fragments(job.id, fragments, embedder.embed_texts(fragments))

    analysis = matcher.score_resume_against_job(ResumeStructuredData(**resume.parsed_data), parsed_job, resume.id)
    return AnalyzeJobResponse(job_id=job.id, **analysis)


@router.post("/generate-resume", response_model=GenerateResumeResponse)
def generate_resume(payload: GenerateResumeRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    agent = ResumeOptimizationAgent()

    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or job not found.")

    output_path = Path(settings.generated_dir) / f"optimized-resume-{resume.id}-{job.id}.pdf"
    optimized = agent.run(
        resume_id=resume.id,
        resume_data=ResumeStructuredData(**resume.parsed_data),
        job_data=job.parsed_data,
        tone=payload.tone,
        additional_context=payload.additional_context,
        output_path=output_path,
        image_caption=resume.image_caption,
    )

    output = GeneratedOutput(
        resume_id=resume.id,
        job_id=job.id,
        output_json=optimized,
        pdf_path=str(output_path),
    )
    db.add(output)
    db.commit()
    db.refresh(output)

    return GenerateResumeResponse(
        output_id=output.id,
        optimized_resume=optimized,
        pdf_download_url=f"/download-pdf?output_id={output.id}",
    )


@router.get("/download-pdf")
def download_pdf(output_id: int = Query(...), db: Session = Depends(get_db)):
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output or not output.pdf_path:
        raise HTTPException(status_code=404, detail="PDF not found.")
    path = Path(output.pdf_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated PDF file is missing.")
    return FileResponse(path=path, media_type="application/pdf", filename=path.name)

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.agents.resume_pipeline import ResumeOptimizationAgent
from app.db.session import get_db
from app.db.tables import GeneratedOutput, GenerationJob, Job, Resume, User
from app.models.schemas import (
    AnalyzeJobRequest,
    AnalyzeJobResponse,
    ATSScoreResponse,
    CoverLetterRequest,
    CoverLetterResponse,
    GenerateJobResponse,
    GenerateResumeRequest,
    GenerateResumeResponse,
    JobStatusResponse,
    ResumeStructuredData,
    ScrapeJobRequest,
    ScrapeJobResponse,
    UploadResumeResponse,
)
from app.services.ats_scorer import ATSScorer
from app.services.document_parser import DocumentParserService
from app.services.embedding_service import EmbeddingService
from app.services.job_scraper import JobScraper
from app.services.llm_service import LLMService
from app.services.matching_service import MatchingService
from app.services.pdf_service import PDFService
from app.services.vector_store import VectorStoreService
from app.utils.config import get_settings


router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Upload resume
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Analyze job
# ---------------------------------------------------------------------------

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
    parsed_job["title"] = payload.job_title
    parsed_job["company"] = payload.company

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


# ---------------------------------------------------------------------------
# Generate resume — background async job
# ---------------------------------------------------------------------------

def _run_generation_job(job_db_id: int, resume_id: int, job_id: int, tone: str, additional_context: str | None, template_id: str) -> None:
    """Background task: run the full pipeline and update GenerationJob status."""
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        settings = get_settings()
        agent = ResumeOptimizationAgent()

        db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({"status": "processing"})
        db.commit()

        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()
        if not resume or not job:
            db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({
                "status": "failed",
                "error_message": "Resume or job not found.",
            })
            db.commit()
            return

        output_path = Path(settings.generated_dir) / f"optimized-resume-{resume_id}-{job_id}-{job_db_id}.pdf"
        optimized = agent.run(
            resume_id=resume.id,
            resume_data=ResumeStructuredData(**resume.parsed_data),
            job_data=job.parsed_data,
            tone=tone,
            additional_context=additional_context,
            output_path=output_path,
            image_caption=resume.image_caption,
            template_id=template_id,
        )
        optimized["name"] = optimized.get("name") or ResumeStructuredData(**resume.parsed_data).name
        optimized["contact"] = optimized.get("contact") or ResumeStructuredData(**resume.parsed_data).contact.model_dump()

        output = GeneratedOutput(
            resume_id=resume_id,
            job_id=job_id,
            output_json=optimized,
            original_resume_json=resume.parsed_data,
            pdf_path=str(output_path),
        )
        db.add(output)
        db.flush()

        db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({
            "status": "done",
            "output_id": output.id,
        })
        db.commit()
        logger.info("Generation job %s completed → output %s", job_db_id, output.id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Generation job %s failed", job_db_id)
        db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({
            "status": "failed",
            "error_message": str(exc),
        })
        db.commit()
    finally:
        db.close()


@router.post("/generate-resume", response_model=GenerateJobResponse)
def generate_resume(
    payload: GenerateResumeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or job not found.")

    gen_job = GenerationJob(
        resume_id=payload.resume_id,
        job_id=payload.job_id,
        status="queued",
    )
    db.add(gen_job)
    db.commit()
    db.refresh(gen_job)

    background_tasks.add_task(
        _run_generation_job,
        gen_job.id,
        payload.resume_id,
        payload.job_id,
        payload.tone,
        payload.additional_context,
        payload.template_id,
    )
    logger.info("Queued generation job %s", gen_job.id)
    return GenerateJobResponse(job_id=gen_job.id)


@router.get("/job-status/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: int, db: Session = Depends(get_db)):
    gen_job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not gen_job:
        raise HTTPException(status_code=404, detail="Generation job not found.")

    output_data: GenerateResumeResponse | None = None
    if gen_job.status == "done" and gen_job.output_id:
        output = db.query(GeneratedOutput).filter(GeneratedOutput.id == gen_job.output_id).first()
        if output:
            output_data = GenerateResumeResponse(
                output_id=output.id,
                optimized_resume=output.output_json,
                pdf_download_url=f"/download-pdf?output_id={output.id}",
            )
    return JobStatusResponse(
        job_id=gen_job.id,
        status=gen_job.status,
        error=gen_job.error_message,
        result=output_data,
    )


# ---------------------------------------------------------------------------
# Stream generate resume (SSE)
# ---------------------------------------------------------------------------

@router.post("/stream-generate")
def stream_generate(payload: GenerateResumeRequest, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or job not found.")

    agent = ResumeOptimizationAgent()

    def event_generator():
        try:
            for chunk in agent.run_streaming(
                resume_id=resume.id,
                resume_data=ResumeStructuredData(**resume.parsed_data),
                job_data=job.parsed_data,
                tone=payload.tone,
                additional_context=payload.additional_context,
            ):
                # SSE format
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # noqa: BLE001
            logger.exception("Stream generate failed")
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# ATS score
# ---------------------------------------------------------------------------

@router.post("/ats-score", response_model=ATSScoreResponse)
def compute_ats_score(output_id: int = Query(...), db: Session = Depends(get_db)):
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Generated output not found.")
    job = db.query(Job).filter(Job.id == output.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")

    scorer = ATSScorer()
    result = scorer.score(output.output_json, job.parsed_data)
    return ATSScoreResponse(**result)


# ---------------------------------------------------------------------------
# Diff view
# ---------------------------------------------------------------------------

@router.get("/diff/{output_id}")
def get_diff(output_id: int, db: Session = Depends(get_db)):
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output:
        raise HTTPException(status_code=404, detail="Output not found.")
    return {
        "original": output.original_resume_json or {},
        "optimized": output.output_json or {},
    }


# ---------------------------------------------------------------------------
# Cover letter
# ---------------------------------------------------------------------------

@router.post("/generate-cover-letter", response_model=CoverLetterResponse)
def generate_cover_letter(payload: CoverLetterRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or job not found.")

    llm = LLMService()
    text = llm.generate_cover_letter(
        resume_data=ResumeStructuredData(**resume.parsed_data),
        job_data=job.parsed_data,
        tone=payload.tone,
    )

    # Render to PDF
    pdf_service = PDFService()
    output_path = Path(settings.generated_dir) / f"cover-letter-{resume.id}-{job.id}.pdf"
    pdf_service.render_cover_letter_pdf(
        context={
            "name": ResumeStructuredData(**resume.parsed_data).name or "Candidate",
            "job_title": job.title or "the position",
            "company": job.company or "the company",
            "cover_letter_text": text,
            "date": datetime.utcnow().strftime("%B %d, %Y"),
        },
        output_path=output_path,
    )

    return CoverLetterResponse(
        cover_letter_text=text,
        pdf_download_url=f"/download-cover-letter?resume_id={resume.id}&job_id={job.id}",
    )


@router.get("/download-cover-letter")
def download_cover_letter(resume_id: int = Query(...), job_id: int = Query(...)):
    settings = get_settings()
    path = Path(settings.generated_dir) / f"cover-letter-{resume_id}-{job_id}.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Cover letter PDF not found.")
    return FileResponse(path=path, media_type="application/pdf", filename=path.name)


# ---------------------------------------------------------------------------
# Job URL scraper
# ---------------------------------------------------------------------------

@router.post("/scrape-job", response_model=ScrapeJobResponse)
def scrape_job(payload: ScrapeJobRequest):
    scraper = JobScraper()
    parser = DocumentParserService()
    try:
        raw_text, title, company = scraper.scrape(str(payload.url))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Could not scrape URL: {exc}") from exc

    parsed = parser.parse_job_description(raw_text)
    return ScrapeJobResponse(
        title=title,
        company=company,
        description=raw_text[:8000],
        parsed=parsed,
    )


# ---------------------------------------------------------------------------
# Download PDF
# ---------------------------------------------------------------------------

@router.get("/download-pdf")
def download_pdf(output_id: int = Query(...), db: Session = Depends(get_db)):
    output = db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
    if not output or not output.pdf_path:
        raise HTTPException(status_code=404, detail="PDF not found.")
    path = Path(output.pdf_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Generated PDF file is missing.")
    return FileResponse(path=path, media_type="application/pdf", filename=path.name)

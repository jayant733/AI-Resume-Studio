from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.agents.resume_pipeline import ResumeOptimizationAgent
from app.agents.job_application_agent import JobApplicationAgent
from app.db.session import get_db
from app.db.tables import AppliedJob, GeneratedOutput, GenerationJob, Job, Resume, User
from app.models.schemas import (
    AnalyzeJobRequest,
    AnalyzeJobResponse,
    ATSScoreResponse,
    AppliedJobSummary,
    CandidateRankingRequest,
    CandidateRankingResponse,
    CoverLetterRequest,
    CoverLetterResponse,
    GenerateJobResponse,
    GenerateResumeRequest,
    GenerateResumeResponse,
    InterviewQuestionRequest,
    InterviewQuestionResponse,
    JobStatusResponse,
    JobApplicationRequest,
    JobApplicationResponse,
    ResumeStructuredData,
    ResumeClaimDetectionRequest,
    ResumeClaimDetectionResponse,
    ScrapeJobRequest,
    ScrapeJobResponse,
    TellMeAboutYourselfRequest,
    TellMeAboutYourselfResponse,
    UploadResumeResponse,
)
from app.services.auth_service import get_optional_current_user
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
    current_user: User | None = Depends(get_optional_current_user),
):
    parser = DocumentParserService()
    embedder = EmbeddingService()
    vector_store = VectorStoreService()
    llm_service = LLMService()
    settings = get_settings()

    user = current_user
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, full_name=full_name)
            db.add(user)
            db.flush()
    elif user and full_name and not user.full_name:
        user.full_name = full_name
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
        try:
            content = await resume_file.read()
            file_path.write_bytes(content)
        except Exception as e:
            logger.exception("❌ FILE WRITE FAILED")
            raise HTTPException(status_code=500, detail=f"File write failed: {str(e)}")
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
    embeddings = embedder.embed_texts(fragments)
    # ✅ FIX: convert numpy floats → Python floats
    clean_embeddings = [
        [float(x) for x in vec]
        for vec in embeddings
    ]
    vector_store.upsert_resume_fragments(resume.id, fragments, clean_embeddings)

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


@router.post("/rank-candidates", response_model=CandidateRankingResponse)
def rank_candidates(
    payload: CandidateRankingRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    parser = DocumentParserService()
    matcher = MatchingService()

    resumes = db.query(Resume).filter(Resume.id.in_(payload.resume_ids)).all()
    if not resumes:
        raise HTTPException(status_code=404, detail="No resumes found for ranking.")

    unauthorized = [resume.id for resume in resumes if resume.user_id and (not current_user or resume.user_id != current_user.id)]
    if unauthorized:
        raise HTTPException(status_code=403, detail="You do not have access to one or more resumes.")

    job_data = parser.parse_job_description(payload.job_description)
    job_data["title"] = payload.job_title
    job_data["company"] = payload.company
    job_data["requirements_text"] = payload.job_description

    candidate_data = [(resume.id, ResumeStructuredData(**resume.parsed_data)) for resume in resumes]
    ranking = matcher.rank_candidates(candidate_data, job_data=job_data, sort_by=payload.sort_by)
    return CandidateRankingResponse(ranking=ranking)


@router.post("/generate-interview-questions", response_model=InterviewQuestionResponse)
def generate_interview_questions(
    payload: InterviewQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    parser = DocumentParserService()
    llm = LLMService()

    if payload.resume_id:
        resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")
        if resume.user_id and (not current_user or resume.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="You do not have access to this resume.")
        resume_data = ResumeStructuredData(**resume.parsed_data)
    elif payload.resume_text:
        resume_data = parser.parse_text(payload.resume_text)
    else:
        raise HTTPException(status_code=400, detail="Provide either resume_id or resume_text.")

    job_data = parser.parse_job_description(payload.job_description)
    job_data["title"] = payload.job_title
    job_data["company"] = payload.company
    job_data["requirements_text"] = payload.job_description

    result = llm.generate_interview_questions(resume_data=resume_data, job_data=job_data)
    return InterviewQuestionResponse(**result)


@router.post("/generate-tell-me-about-yourself", response_model=TellMeAboutYourselfResponse)
def generate_tell_me_about_yourself(payload: TellMeAboutYourselfRequest):
    llm = LLMService()
    result = llm.generate_tell_me_about_yourself(
        resume_data=payload.resume_json,
        target_job_role=payload.target_job_role,
    )
    return TellMeAboutYourselfResponse(**result)


@router.post("/detect-resume-claims", response_model=ResumeClaimDetectionResponse)
def detect_resume_claims(payload: ResumeClaimDetectionRequest):
    parser = DocumentParserService()
    llm = LLMService()
    bullets = parser.extract_resume_bullets(payload.resume_text)
    if not bullets:
        raise HTTPException(status_code=400, detail="No resume bullets or achievement statements could be extracted.")
    result = llm.analyze_resume_claims(bullets)
    return ResumeClaimDetectionResponse(**result)


@router.post("/apply-to-job", response_model=JobApplicationResponse)
def apply_to_job(
    payload: JobApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    if payload.resume_id:
        resume = db.query(Resume).filter(Resume.id == payload.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found.")
        if resume.user_id and (not current_user or resume.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="You do not have access to this resume.")
        resume_data = ResumeStructuredData(**resume.parsed_data)
        resume_id = resume.id
    elif payload.resume_json:
        resume_data = payload.resume_json
        resume_id = None
    else:
        raise HTTPException(status_code=400, detail="Provide either resume_id or resume_json.")

    agent = JobApplicationAgent()
    result = agent.run(
        resume_data=resume_data,
        job_url=str(payload.job_url),
        tone=payload.tone,
        resume_id=resume_id,
    )

    applied_job_id = None
    if payload.store_applied_job:
        applied_job = AppliedJob(
            user_id=current_user.id if current_user else None,
            resume_id=resume_id,
            job_url=str(payload.job_url),
            job_title=result.get("job_title"),
            company=result.get("company"),
            status="applied" if payload.mock_mode else "prepared",
            optimized_resume_json=result["resume_version"],
            cover_letter_text=result["cover_letter"],
            autofill_fields=result.get("autofill_fields"),
            notes="Mock application flow completed." if payload.mock_mode else "Application prepared, not submitted.",
        )
        db.add(applied_job)
        db.commit()
        db.refresh(applied_job)
        applied_job_id = applied_job.id

    return JobApplicationResponse(
        status="applied" if payload.mock_mode else "prepared",
        resume_version=result["resume_version"],
        cover_letter=result["cover_letter"],
        job_title=result.get("job_title"),
        company=result.get("company"),
        applied_job_id=applied_job_id,
        autofill_fields=result.get("autofill_fields"),
    )


@router.get("/applied-jobs", response_model=List[AppliedJobSummary])
def list_applied_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_current_user),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    jobs = (
        db.query(AppliedJob)
        .filter(AppliedJob.user_id == current_user.id)
        .order_by(AppliedJob.created_at.desc())
        .all()
    )
    return [
        AppliedJobSummary(
            id=item.id,
            job_title=item.job_title,
            company=item.company,
            job_url=item.job_url,
            status=item.status,
            created_at=item.created_at.isoformat(),
        )
        for item in jobs
    ]


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

@router.get("/ats-score", response_model=ATSScoreResponse)
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

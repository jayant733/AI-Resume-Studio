from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from datetime import datetime
from typing import Any

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.tables import Resume, Job, GenerationJob, GeneratedOutput, User, AppliedJob
from app.models.schemas import ResumeStructuredData
from app.services.llm_service import LLMService
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService
from app.services.pdf_service import PDFService
from app.services.validator import ValidatorService
from app.services.evaluation import EvaluationService
from app.services.access_control import AccessControlService
from app.services.storage_service import StorageService
from app.utils.config import get_settings

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="app.workers.optimization_tasks.optimize_resume_task")
def optimize_resume_task(self, job_db_id: int, resume_id: int, job_id: int, tone: str, additional_context: str | None, template_id: str, applied_job_id: int | None = None):
    db = SessionLocal()
    settings = get_settings()
    ac = AccessControlService(db)
    
    try:
        # 0. Pre-flight Access Check
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume or not ac.can_perform_ai_optimization(resume.user_id):
            raise ValueError("User has insufficient credits or inactive subscription.")

        # Update job status to processing
        db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({
            "status": "processing",
            "updated_at": datetime.utcnow()
        })
        db.commit()

        # Load data
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()
        
        if not resume or not job:
            raise ValueError("Resume or Job not found in database.")

        # Initialize Services
        llm = LLMService()
        embedder = EmbeddingService()
        vector_store = VectorStoreService()
        pdf_service = PDFService()

        # --- 1. RAG Retrieval ---
        job_data = job.parsed_data
        requirements = job_data.get("requirements", []) + job_data.get("skills", [])
        query_text = " ".join(requirements[:10])
        query_embedding = embedder.embed_text(query_text)
        
        retrieval = vector_store.query_resume_fragments(query_embedding, resume_id=resume_id, limit=8)
        relevant_fragments = retrieval.get("documents", [[]])[0]

        # --- 2. LLM Optimization (Grounded in RAG) ---
        resume_data = ResumeStructuredData(**resume.parsed_data)
        llm_output = llm.optimize_resume(
            resume_data=resume_data,
            job_data=job_data,
            relevant_fragments=relevant_fragments,
            tone=tone,
            additional_context=additional_context
        )
        
        cleaned_json = llm_output.get("cleaned_json", resume_data.model_dump())
        optimized_json = llm_output.get("optimized_json", {})

        # --- 3. Safety Validation Layer ---
        validator = ValidatorService()
        optimized_json = validator.validate_optimized_resume(
            original=resume_data,
            optimized=optimized_json
        )

        # --- 4. PDF Generation ---
        output_filename = f"optimized-resume-{resume_id}-{job_id}-{job_db_id}.pdf"
        output_path = Path(settings.generated_dir) / output_filename
        
        # Ensure name and contact are preserved in the final rendering context
        optimized_json["name"] = optimized_json.get("name") or resume_data.name
        optimized_json["contact"] = optimized_json.get("contact") or resume_data.contact.model_dump()
        
        pdf_service.render_pdf(optimized_json, output_path, template_id=template_id)

        # --- 5. Cloud Storage Upload ---
        storage_service = StorageService()
        remote_filename = f"users/{resume.user_id}/resumes/{resume_id}/optimized-{job_db_id}.pdf"
        storage_path = storage_service.upload_file(output_path, remote_filename)

        # --- 6. Evaluation & Explainability ---
        eval_service = EvaluationService()
        eval_results = eval_service.evaluate_improvement(
            original_json=cleaned_json,
            optimized_json=optimized_json,
            job_data=job_data,
            llm_explainability_log=llm_output.get("explainability_log", [])
        )

        # --- 7. Save Results ---
        output = GeneratedOutput(
            resume_id=resume_id,
            job_id=job_id,
            output_json=optimized_json,
            original_resume_json=cleaned_json,
            evaluation_data=eval_results["evaluation_data"],
            explainability_data=eval_results["explainability_data"],
            pdf_path=str(output_path),
            storage_path=storage_path,
            storage_provider="gcp" if storage_path else None
        )
        db.add(output)
        db.flush()

        # Mark job as done
        db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({
            "status": "done",
            "output_id": output.id,
            "updated_at": datetime.utcnow()
        })
        
        # --- 8. Link to Application CRM if needed ---
        if applied_job_id:
            db.query(AppliedJob).filter(AppliedJob.id == applied_job_id).update({
                "output_id": output.id
            })

        # --- 9. Usage Tracking & Credit Deduction ---
        ac.increment_usage(resume.user_id, ai_call=True, resume_gen=True)

        return {"status": "success", "output_id": output.id}

    except Exception as exc:
        logger.exception(f"Job {job_db_id} failed: {exc}")
        db.query(GenerationJob).filter(GenerationJob.id == job_db_id).update({
            "status": "failed",
            "error_message": str(exc),
            "updated_at": datetime.utcnow()
        })
        db.commit()
        raise exc
    finally:
        db.close()

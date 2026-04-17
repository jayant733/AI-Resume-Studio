from __future__ import annotations

from typing import Any

from app.models.schemas import ResumeStructuredData
from app.services.embedding_service import EmbeddingService
from app.services.job_scraper import JobScraper
from app.services.llm_service import LLMService
from app.services.vector_store import VectorStoreService
from app.services.document_parser import DocumentParserService


class JobApplicationAgent:
    def __init__(self) -> None:
        self.scraper = JobScraper()
        self.parser = DocumentParserService()
        self.llm_service = LLMService()
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStoreService()

    def run(
        self,
        resume_data: ResumeStructuredData,
        job_url: str,
        tone: str,
        resume_id: int | None = None,
    ) -> dict[str, Any]:
        job_description, title, company = self.scraper.scrape(job_url)
        job_data = self.parser.parse_job_description(job_description)
        job_data["title"] = title
        job_data["company"] = company
        job_data["requirements_text"] = job_description

        relevant_fragments = self._retrieve_relevant_fragments(resume_id, resume_data, job_data)
        optimized_resume = self.llm_service.optimize_resume(
            resume_data=resume_data,
            job_data=job_data,
            relevant_fragments=relevant_fragments,
            tone=tone,
            additional_context="Optimize this resume for a live job application.",
        )
        optimized_resume["name"] = resume_data.name
        optimized_resume["headline"] = resume_data.headline
        optimized_resume["contact"] = resume_data.contact.model_dump()

        cover_letter = self.llm_service.generate_cover_letter(
            resume_data=resume_data,
            job_data=job_data,
            tone=tone,
        )

        autofill_fields = self._build_mock_autofill_fields(resume_data, title, company, job_url)
        return {
            "status": "applied",
            "resume_version": optimized_resume,
            "cover_letter": cover_letter,
            "job_title": title,
            "company": company,
            "autofill_fields": autofill_fields,
            "job_description": job_description,
            "job_data": job_data,
        }

    def _retrieve_relevant_fragments(
        self,
        resume_id: int | None,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
    ) -> list[str]:
        fragments = job_data.get("requirements", []) + job_data.get("responsibilities", []) + job_data.get("skills", [])
        if not fragments:
            return []

        if resume_id:
            query_embedding = self.embedding_service.embed_text(" ".join(fragments[:8]))
            retrieval = self.vector_store.query_resume_fragments(query_embedding, resume_id=resume_id, limit=6)
            docs = retrieval.get("documents", [[]])[0]
            if docs:
                return docs

        local_fragments: list[str] = []
        for entry in resume_data.experience:
            local_fragments.extend(entry.bullets or [f"{entry.title} at {entry.company or 'Company'}"])
        return local_fragments[:6]

    def _build_mock_autofill_fields(
        self,
        resume_data: ResumeStructuredData,
        title: str | None,
        company: str | None,
        job_url: str,
    ) -> dict[str, Any]:
        return {
            "full_name": resume_data.name,
            "email": resume_data.contact.email,
            "phone": resume_data.contact.phone,
            "linkedin": resume_data.contact.linkedin,
            "website": resume_data.contact.website,
            "target_role": title,
            "company": company,
            "job_url": job_url,
            "status": "mock_autofill_complete",
        }

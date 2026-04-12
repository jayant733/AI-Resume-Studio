from __future__ import annotations

from pathlib import Path
from typing import Any

from app.models.schemas import ResumeStructuredData
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.services.pdf_service import PDFService
from app.services.vector_store import VectorStoreService


class ResumeOptimizationAgent:
    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStoreService()
        self.llm_service = LLMService()
        self.pdf_service = PDFService()

    def run(
        self,
        resume_id: int,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        tone: str,
        additional_context: str | None,
        output_path: Path,
        image_caption: str | None,
    ) -> dict[str, Any]:
        relevant_fragments = self._retrieve_relevant_fragments(resume_id, job_data)
        optimized = self.llm_service.optimize_resume(
            resume_data=resume_data,
            job_data=job_data,
            relevant_fragments=relevant_fragments,
            tone=tone,
            additional_context=additional_context,
        )
        optimized["name"] = resume_data.name
        optimized["headline"] = resume_data.headline
        optimized["contact"] = resume_data.contact.model_dump()
        optimized["image_caption"] = image_caption
        self.pdf_service.render_pdf(optimized, output_path)
        return optimized

    def _retrieve_relevant_fragments(self, resume_id: int, job_data: dict[str, Any]) -> list[str]:
        fragments = job_data.get("requirements", []) + job_data.get("responsibilities", []) + job_data.get("skills", [])
        if not fragments:
            return []
        query_embedding = self.embedding_service.embed_text(" ".join(fragments[:8]))
        retrieval = self.vector_store.query_resume_fragments(query_embedding, resume_id=resume_id, limit=6)
        return retrieval.get("documents", [[]])[0]

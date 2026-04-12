from __future__ import annotations

from typing import Any

import chromadb

from app.utils.config import get_settings


class VectorStoreService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = chromadb.PersistentClient(path=settings.vector_store_path)
        self.resume_collection = self.client.get_or_create_collection(name="resume_fragments")
        self.job_collection = self.client.get_or_create_collection(name="job_requirements")

    def upsert_resume_fragments(self, resume_id: int, fragments: list[str], embeddings: list[list[float]]) -> None:
        if not fragments:
            return
        ids = [f"resume-{resume_id}-{index}" for index in range(len(fragments))]
        metadatas = [{"resume_id": resume_id, "kind": "experience_fragment"} for _ in fragments]
        self.resume_collection.upsert(ids=ids, documents=fragments, embeddings=embeddings, metadatas=metadatas)

    def upsert_job_fragments(self, job_id: int, fragments: list[str], embeddings: list[list[float]]) -> None:
        if not fragments:
            return
        ids = [f"job-{job_id}-{index}" for index in range(len(fragments))]
        metadatas = [{"job_id": job_id, "kind": "job_requirement"} for _ in fragments]
        self.job_collection.upsert(ids=ids, documents=fragments, embeddings=embeddings, metadatas=metadatas)

    def query_resume_fragments(self, embedding: list[float], resume_id: int, limit: int = 5) -> dict[str, Any]:
        return self.resume_collection.query(
            query_embeddings=[embedding],
            n_results=limit,
            where={"resume_id": resume_id},
        )

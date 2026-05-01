from __future__ import annotations

from typing import Any
import uuid

import chromadb

from app.utils.config import get_settings


class VectorStoreService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client = chromadb.PersistentClient(path=settings.vector_store_path)
        
        # We use unique collection names or reset them to handle dimensionality changes
        # Gemini embeddings are 3072 dims, old ones were 128 (hash-based) or others.
        collection_suffix = "v2_3072"
        self.resume_collection = self.client.get_or_create_collection(
            name=f"resume_fragments_{collection_suffix}"
        )
        self.job_collection = self.client.get_or_create_collection(
            name=f"job_requirements_{collection_suffix}"
        )

    def upsert_resume_fragments(self, resume_id: int, fragments: list[str], embeddings: list[list[float]]) -> None:
        if not fragments:
            return
        # Ensure we have a unique ID for every fragment to avoid collisions
        ids = [f"resume-{resume_id}-{index}-{uuid.uuid4().hex[:8]}" for index in range(len(fragments))]
        metadatas = [{"resume_id": resume_id, "kind": "experience_fragment"} for _ in fragments]
        self.resume_collection.upsert(ids=ids, documents=fragments, embeddings=embeddings, metadatas=metadatas)

    def upsert_job_fragments(self, job_id: int, fragments: list[str], embeddings: list[list[float]]) -> None:
        if not fragments:
            return
        ids = [f"job-{job_id}-{index}-{uuid.uuid4().hex[:8]}" for index in range(len(fragments))]
        metadatas = [{"job_id": job_id, "kind": "job_requirement"} for _ in fragments]
        self.job_collection.upsert(ids=ids, documents=fragments, embeddings=embeddings, metadatas=metadatas)

    def query_resume_fragments(self, embedding: list[float], resume_id: int, limit: int = 5) -> dict[str, Any]:
        # Handle cases where n_results might be greater than the number of documents in the collection
        count = self.resume_collection.count()
        actual_limit = min(limit, count) if count > 0 else 1
        
        # If count is 0, query will return empty results anyway, but let's be safe
        if count == 0:
            return {"documents": [[]], "distances": [[]]}

        return self.resume_collection.query(
            query_embeddings=[embedding],
            n_results=actual_limit,
            where={"resume_id": resume_id},
        )

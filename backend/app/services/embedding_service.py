from __future__ import annotations

import hashlib
import logging
import math
from typing import Iterable

from openai import OpenAI

from app.utils.config import get_settings


logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.openai_embedding_model
        self.local_model_name = settings.local_embedding_model
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self._local_embedder = self._init_local_embedder()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if self.client:
            response = self.client.embeddings.create(model=self.model, input=texts)
            return [item.embedding for item in response.data]
        if self._local_embedder:
            try:
                vectors = list(self._local_embedder.embed(texts))
                return [list(vector) for vector in vectors]
            except Exception as exc:  # noqa: BLE001
                logger.warning("Local embedding model failed, falling back to hash embeddings: %s", exc)
        return [self._local_embed(text) for text in texts]

    def embed_text(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def cosine_similarity(self, left: Iterable[float], right: Iterable[float]) -> float:
        left_list = list(left)
        right_list = list(right)
        numerator = sum(a * b for a, b in zip(left_list, right_list))
        left_norm = math.sqrt(sum(a * a for a in left_list))
        right_norm = math.sqrt(sum(b * b for b in right_list))
        if not left_norm or not right_norm:
            return 0.0
        return numerator / (left_norm * right_norm)

    def _local_embed(self, text: str, dimensions: int = 128) -> list[float]:
        vector = [0.0] * dimensions
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            slot = digest[0] % dimensions
            vector[slot] += 1.0 + (digest[1] / 255.0)
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

    def _init_local_embedder(self):
        try:
            from fastembed import TextEmbedding
        except Exception:  # noqa: BLE001
            logger.info("fastembed is not installed; using hash-based local embeddings.")
            return None

        try:
            logger.info("Loading local embedding model: %s", self.local_model_name)
            return TextEmbedding(model_name=self.local_model_name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not load local embedding model %s: %s", self.local_model_name, exc)
            return None

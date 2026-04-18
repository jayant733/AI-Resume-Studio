from __future__ import annotations

import re
from typing import Any

from app.services.embedding_service import EmbeddingService


# Action verbs commonly found at the start of strong resume bullets
_ACTION_VERBS = {
    "achieved", "accelerated", "architected", "automated", "built", "championed",
    "collaborated", "contributed", "created", "cut", "decreased", "defined",
    "delivered", "deployed", "designed", "developed", "directed", "drove",
    "enhanced", "established", "executed", "expanded", "generated", "grew",
    "implemented", "improved", "increased", "initiated", "launched", "led",
    "managed", "migrated", "modernized", "optimized", "orchestrated", "owned",
    "partnered", "pioneered", "produced", "reduced", "refactored", "scaled",
    "shipped", "spearheaded", "streamlined", "transformed", "unified", "upgraded",
}

# Sections that should be present for a "complete" resume
_EXPECTED_SECTIONS = ["summary", "skills", "experience", "education", "certifications"]


class ATSScorer:
    """Compute a structured ATS compatibility score for an optimized resume."""

    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()

    def score(self, resume_json: dict[str, Any], job_data: dict[str, Any]) -> dict[str, Any]:
        keyword_dim = self._score_keyword_density(resume_json, job_data)
        verb_dim = self._score_action_verbs(resume_json)
        quant_dim = self._score_quantification(resume_json)
        section_dim = self._score_section_completeness(resume_json)

        # Weighted total: keywords 35%, verbs 25%, quants 20%, sections 20%
        total = int(
            keyword_dim["score"] * 35
            + verb_dim["score"] * 25
            + quant_dim["score"] * 20
            + section_dim["score"] * 20
        )

        tips = self._generate_tips(keyword_dim, verb_dim, quant_dim, section_dim)

        return {
            "total_score": min(total, 100),
            "keyword_density": keyword_dim,
            "action_verb_rate": verb_dim,
            "quantification_rate": quant_dim,
            "section_completeness": section_dim,
            "improvement_tips": tips,
        }

    # ------------------------------------------------------------------

    def _score_keyword_density(self, resume_json: dict, job_data: dict) -> dict:
        job_keywords = {kw.lower() for kw in job_data.get("skills", [])}
        if not job_keywords:
            return {"score": 1.0, "label": "Keyword Density", "detail": "No job keywords provided for comparison."}

        resume_text = self._resume_to_text(resume_json).lower()
        matched = {kw for kw in job_keywords if kw in resume_text}
        exact_score = len(matched) / len(job_keywords)
        semantic_score = self._semantic_alignment_score(resume_json, job_data)
        score = min(1.0, (exact_score * 0.7) + (semantic_score * 0.3))
        return {
            "score": round(score, 3),
            "label": "Keyword Density",
            "detail": (
                f"{len(matched)} of {len(job_keywords)} job keywords present in resume. "
                f"Semantic alignment: {round(semantic_score * 100)}%."
            ),
        }

    def _score_action_verbs(self, resume_json: dict) -> dict:
        bullets = self._get_all_bullets(resume_json)
        if not bullets:
            return {"score": 0.0, "label": "Action Verb Rate", "detail": "No experience bullets found."}

        strong = sum(
            1 for b in bullets
            if b and b.split()[0].lower().rstrip(".,;") in _ACTION_VERBS
        )
        score = strong / len(bullets)
        return {
            "score": round(score, 3),
            "label": "Action Verb Rate",
            "detail": f"{strong} of {len(bullets)} bullets start with a strong action verb.",
        }

    def _score_quantification(self, resume_json: dict) -> dict:
        bullets = self._get_all_bullets(resume_json)
        if not bullets:
            return {"score": 0.0, "label": "Quantification Rate", "detail": "No experience bullets found."}

        # Looks for numbers, percentages, dollar signs, or multipliers
        pattern = re.compile(r"(\d+[%xX]?|\$[\d,]+|[\d,]+\+?)")
        quantified = sum(1 for b in bullets if pattern.search(b))
        score = quantified / len(bullets)
        return {
            "score": round(score, 3),
            "label": "Quantification Rate",
            "detail": f"{quantified} of {len(bullets)} bullets contain measurable metrics.",
        }

    def _score_section_completeness(self, resume_json: dict) -> dict:
        present = [s for s in _EXPECTED_SECTIONS if resume_json.get(s)]
        score = len(present) / len(_EXPECTED_SECTIONS)
        missing = [s for s in _EXPECTED_SECTIONS if s not in present]
        detail = (
            f"All {len(_EXPECTED_SECTIONS)} key sections present."
            if not missing
            else f"Missing sections: {', '.join(missing)}."
        )
        return {
            "score": round(score, 3),
            "label": "Section Completeness",
            "detail": detail,
        }

    # ------------------------------------------------------------------

    def _get_all_bullets(self, resume_json: dict) -> list[str]:
        bullets: list[str] = []
        for exp in resume_json.get("experience", []):
            if isinstance(exp, dict):
                bullets.extend(exp.get("bullets", []))
        return [str(b) for b in bullets if b]

    def _resume_to_text(self, resume_json: dict) -> str:
        parts: list[str] = []
        parts.append(resume_json.get("summary", "") or "")
        parts.extend(resume_json.get("skills", []))
        parts.extend(resume_json.get("ats_keywords", []))
        parts.extend(resume_json.get("certifications", []))
        for exp in resume_json.get("experience", []):
            if isinstance(exp, dict):
                parts.extend(exp.get("bullets", []))
        return " ".join(str(p) for p in parts if p)

    def _generate_tips(self, keyword: dict, verb: dict, quant: dict, section: dict) -> list[str]:
        tips: list[str] = []
        if keyword["score"] < 0.6:
            tips.append("Mirror more keywords from the job description — especially in your skills and experience bullets.")
        if verb["score"] < 0.7:
            tips.append("Start at least 70% of your bullets with a strong action verb (e.g., 'Led', 'Built', 'Reduced').")
        if quant["score"] < 0.4:
            tips.append("Add measurable outcomes to your bullets — use numbers, percentages, or dollar amounts.")
        if section["score"] < 1.0:
            tips.append(section["detail"])
        if not tips:
            tips.append("Your resume is well-optimized! Consider tailoring the summary for each specific role.")
        return tips

    def _semantic_alignment_score(self, resume_json: dict, job_data: dict) -> float:
        resume_text = self._resume_to_text(resume_json)
        job_text_parts: list[str] = []
        job_text_parts.extend(job_data.get("skills", []))
        job_text_parts.extend(job_data.get("requirements", []))
        job_text_parts.extend(job_data.get("responsibilities", []))
        if isinstance(job_data.get("requirements_text"), str):
            job_text_parts.append(job_data.get("requirements_text"))
        job_text = " ".join(part for part in job_text_parts if part)
        if not resume_text.strip() or not job_text.strip():
            return 0.0

        similarity = self.embedding_service.cosine_similarity(
            self.embedding_service.embed_text(resume_text[:8000]),
            self.embedding_service.embed_text(job_text[:8000]),
        )
        return max(0.0, min(1.0, float(similarity)))

from __future__ import annotations

import logging
from typing import Any
from app.services.ats_scorer import ATSScorer

logger = logging.getLogger(__name__)

class EvaluationService:
    """
    Orchestrates Before vs After comparisons and constructs explainability data.
    """

    def __init__(self) -> None:
        self.scorer = ATSScorer()

    def evaluate_improvement(
        self, 
        original_json: dict[str, Any], 
        optimized_json: dict[str, Any], 
        job_data: dict[str, Any],
        llm_explainability_log: list[dict]
    ) -> dict[str, Any]:
        """
        Computes detailed comparison metrics and structures diff data.
        """
        # 1. Compute Scores
        before_scores = self.scorer.score(original_json, job_data)
        after_scores = self.scorer.score(optimized_json, job_data)
        
        # 2. Extract Skills Comparison
        original_skills = set(str(s).lower() for s in original_json.get("skills", []))
        optimized_skills = set(str(s).lower() for s in optimized_json.get("skills", []))
        job_keywords = set(str(s).lower() for s in job_data.get("skills", []))
        
        matched_before = job_keywords.intersection(original_skills)
        matched_after = job_keywords.intersection(optimized_skills)
        missing_after = job_keywords - matched_after

        # 3. Calculate Improvement Metrics
        ats_improvement = after_scores["total_score"] - before_scores["total_score"]
        keyword_coverage_increase = (len(matched_after) - len(matched_before)) / max(1, len(job_keywords))
        
        evaluation_data = {
            "overall_score": {
                "before": before_scores["total_score"],
                "after": after_scores["total_score"],
                "improvement": round(ats_improvement, 1)
            },
            "breakdown": after_scores["breakdown"],
            "metrics": {
                "keyword_coverage_increase": f"{round(keyword_coverage_increase * 100)}%",
                "matched_keywords": list(matched_after),
                "missing_keywords": list(missing_after)[:10]
            }
        }
        
        # 4. Structure Explainability (Diff Data)
        # We use the LLM explainability log and supplement it with our own mapping if needed
        explainability_data = {
            "experience": llm_explainability_log
        }
        
        return {
            "evaluation_data": evaluation_data,
            "explainability_data": explainability_data
        }

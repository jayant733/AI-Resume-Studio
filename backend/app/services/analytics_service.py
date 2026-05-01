from __future__ import annotations

import logging
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.tables import AppliedJob, GeneratedOutput, Resume, User
from datetime import datetime

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview(self, user_id: int) -> Dict[str, Any]:
        """Aggregate high-level stats for the user dashboard."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {}

        total_resumes = self.db.query(Resume).filter(Resume.user_id == user_id).count()
        total_optimizations = self.db.query(GeneratedOutput).join(Resume).filter(Resume.user_id == user_id).count()
        
        # Average Improvement
        outputs = self.db.query(GeneratedOutput).join(Resume).filter(Resume.user_id == user_id).all()
        improvements = [
            (o.evaluation_data.get("overall_score", {}).get("improvement") or 0)
            for o in outputs if o.evaluation_data
        ]
        avg_improvement = sum(improvements) / len(improvements) if improvements else 0

        ats_scores_after = [
            (o.evaluation_data.get("overall_score", {}).get("after") or 0)
            for o in outputs if o.evaluation_data
        ]
        avg_ats_score = sum(ats_scores_after) / len(ats_scores_after) if ats_scores_after else 0

        last_output = (
            self.db.query(GeneratedOutput)
            .join(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(GeneratedOutput.created_at.desc())
            .first()
        )
        last_ats_score = None
        if last_output and last_output.evaluation_data:
            last_ats_score = last_output.evaluation_data.get("overall_score", {}).get("after")

        total_applications = self.db.query(AppliedJob).filter(AppliedJob.user_id == user_id).count()
        interview_or_offer = (
            self.db.query(AppliedJob)
            .filter(AppliedJob.user_id == user_id, AppliedJob.status.in_(["interview", "offer"]))
            .count()
        )
        interview_rate = (interview_or_offer / total_applications * 100) if total_applications else 0

        strength_label = "Developing"
        if avg_ats_score >= 85:
            strength_label = "Expert"
        elif avg_ats_score >= 70:
            strength_label = "Strong"
        elif avg_ats_score >= 55:
            strength_label = "Competitive"

        return {
            "stats": {
                "total_resumes": total_resumes,
                "total_optimizations": total_optimizations,
                "avg_improvement": round(avg_improvement, 1),
                "avg_ats_score": round(avg_ats_score, 1),
                "last_output_id": last_output.id if last_output else None,
                "last_ats_score": last_ats_score,
                "total_applications": total_applications,
                "interview_rate": round(interview_rate, 1),
                "profile_strength": strength_label,
                "credits_remaining": user.credits,
                "tier": user.subscription_tier,
                "status": user.subscription_status
            }
        }

    def get_skills_gap(self, user_id: int) -> List[Dict[str, Any]]:
        """Identify top missing skills across all jobs the user analyzed."""
        outputs = self.db.query(GeneratedOutput).join(Resume).filter(Resume.user_id == user_id).all()
        
        missing_skills_freq = {}
        for o in outputs:
            if o.evaluation_data and "metrics" in o.evaluation_data:
                missing = o.evaluation_data["metrics"].get("missing_keywords", [])
                for skill in missing:
                    missing_skills_freq[skill] = missing_skills_freq.get(skill, 0) + 1
                    
        # Sort and return top 10
        sorted_skills = sorted(missing_skills_freq.items(), key=lambda x: x[1], reverse=True)
        return [
            {"skill": name, "count": freq, "priority": "high" if freq > 1 else "medium"}
            for name, freq in sorted_skills[:10]
        ]

    def get_progress_history(self, user_id: int) -> List[Dict[str, Any]]:
        """Fetch score progression over time."""
        outputs = (
            self.db.query(GeneratedOutput)
            .join(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(GeneratedOutput.created_at.asc())
            .all()
        )
        
        history = []
        for o in outputs:
            if o.evaluation_data:
                history.append({
                    "date": o.created_at.strftime("%b %d"),
                    "score_before": o.evaluation_data["overall_score"].get("before"),
                    "score_after": o.evaluation_data["overall_score"].get("after"),
                    "improvement": o.evaluation_data["overall_score"].get("improvement")
                })
        return history

    def get_section_performance(self, output_id: int) -> Dict[str, Any]:
        """Break down ATS performance by section for a specific optimization."""
        output = self.db.query(GeneratedOutput).filter(GeneratedOutput.id == output_id).first()
        if not output or not output.evaluation_data:
            return {}
            
        breakdown = output.evaluation_data.get("breakdown", {})
        return {
            "skills": round(breakdown.get("keyword_match", {}).get("score", 0) * 100),
            "experience": round(breakdown.get("experience_alignment", {}).get("score", 0) * 100),
            "formatting": round(breakdown.get("formatting_score", {}).get("score", 0) * 100),
            "semantic": round(breakdown.get("semantic_similarity", {}).get("score", 0) * 100)
        }

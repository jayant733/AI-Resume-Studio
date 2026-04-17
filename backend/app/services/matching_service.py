from __future__ import annotations

import re

from app.models.schemas import ResumeStructuredData
from app.services.embedding_service import EmbeddingService
from app.services.vector_store import VectorStoreService


class MatchingService:
    def __init__(self) -> None:
        self.embedding_service = EmbeddingService()
        self.vector_store = VectorStoreService()

    def score_resume_against_job(self, resume: ResumeStructuredData, job_data: dict, resume_id: int) -> dict:
        job_skills = {skill.lower() for skill in job_data.get("skills", [])}
        resume_skills = {skill.lower() for skill in resume.skills}
        matched_skills = sorted(job_skills & resume_skills)
        missing_skills = sorted(job_skills - resume_skills)

        job_embedding = self.embedding_service.embed_text(
            job_data.get("requirements_text", " ".join(job_data.get("requirements", [])) or " ".join(job_data.get("skills", [])))
        )
        retrieval = self.vector_store.query_resume_fragments(job_embedding, resume_id=resume_id, limit=5)
        relevant_experience = []
        documents = retrieval.get("documents", [[]])[0]
        distances = retrieval.get("distances", [[]])[0]
        for doc, distance in zip(documents, distances):
            relevant_experience.append({"fragment": doc, "distance": float(distance or 0)})

        skill_score = len(matched_skills) / max(len(job_skills), 1)
        similarity_bonus = 0.0
        if relevant_experience:
            best_distance = min(item["distance"] for item in relevant_experience)
            similarity_bonus = max(0.0, 1 - best_distance)
        semantic_score = round(min(1.0, (skill_score * 0.6) + (similarity_bonus * 0.4)), 3)

        recommendations = []
        if missing_skills:
            recommendations.append(f"Address missing keywords: {', '.join(missing_skills[:6])}.")
        if matched_skills:
            recommendations.append(f"Prominently feature matched strengths: {', '.join(matched_skills[:6])}.")
        if not recommendations:
            recommendations.append("Resume and job are closely aligned; focus on impact metrics and ATS phrasing.")

        return {
            "semantic_score": semantic_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "relevant_experience": relevant_experience,
            "recommendations": recommendations,
        }

    def rank_candidates(self, candidates: list[tuple[int, ResumeStructuredData]], job_data: dict, sort_by: str = "relevance") -> list[dict]:
        ranking = []
        for resume_id, resume in candidates:
            analysis = self.score_resume_against_job(resume, job_data, resume_id)
            experience_score, experience_years_estimate = self._estimate_experience_score(resume)
            skills_match_score = round(len(analysis["matched_skills"]) / max(len(job_data.get("skills", [])), 1), 3)
            match_score = round(
                min(
                    1.0,
                    (analysis["semantic_score"] * 0.55)
                    + (skills_match_score * 0.25)
                    + (experience_score * 0.20),
                ),
                3,
            )

            strengths = []
            if analysis["matched_skills"]:
                strengths.append(f"Strong skills overlap: {', '.join(analysis['matched_skills'][:5])}")
            if analysis["relevant_experience"]:
                strengths.append("Relevant experience fragments align closely with the target role")
            if experience_years_estimate >= 3:
                strengths.append(f"Estimated experience depth of about {experience_years_estimate:.1f} years")
            if not strengths:
                strengths.append("Baseline alignment across transferable experience")

            weaknesses = []
            if analysis["missing_skills"]:
                weaknesses.append(f"Missing target skills: {', '.join(analysis['missing_skills'][:5])}")
            if experience_years_estimate < 2:
                weaknesses.append("Limited visible experience depth from the uploaded resume")
            if not analysis["relevant_experience"]:
                weaknesses.append("Resume bullets show limited direct alignment to the job description")
            if not weaknesses:
                weaknesses.append("Few obvious weaknesses detected for this target role")

            ranking.append(
                {
                    "resume_id": resume_id,
                    "candidate_name": resume.name,
                    "headline": resume.headline,
                    "match_score": match_score,
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                    "matched_skills": analysis["matched_skills"],
                    "missing_skills": analysis["missing_skills"],
                    "relevance_score": analysis["semantic_score"],
                    "experience_score": experience_score,
                    "skills_match_score": skills_match_score,
                    "experience_years_estimate": experience_years_estimate,
                }
            )

        sort_key_map = {
            "relevance": "relevance_score",
            "experience": "experience_score",
            "skills_match": "skills_match_score",
        }
        sort_key = sort_key_map.get(sort_by, "relevance_score")
        return sorted(ranking, key=lambda item: item[sort_key], reverse=True)

    def _estimate_experience_score(self, resume: ResumeStructuredData) -> tuple[float, float]:
        years = 0.0
        for entry in resume.experience:
            years += self._extract_years_delta(entry.start_date, entry.end_date)
        if years == 0.0 and resume.experience:
            years = min(1.0 + (len(resume.experience) * 0.5), 4.0)
        experience_score = round(min(years / 8.0, 1.0), 3)
        return experience_score, round(years, 1)

    def _extract_years_delta(self, start_date: str | None, end_date: str | None) -> float:
        year_pattern = r"(19|20)\d{2}"
        start_match = re.search(year_pattern, str(start_date or ""))
        end_text = str(end_date or "")
        end_match = re.search(year_pattern, end_text)
        if not start_match:
            return 0.0
        start_year = int(start_match.group(0))
        end_year = int(end_match.group(0)) if end_match else start_year + (1 if "present" in end_text.lower() else 0)
        return max(0.5, float(end_year - start_year or 1))

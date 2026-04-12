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

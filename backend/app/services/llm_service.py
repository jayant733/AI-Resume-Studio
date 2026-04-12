import base64
import json
import logging
from pathlib import Path
from typing import Any

from openai import OpenAI

from app.models.schemas import ResumeStructuredData
from app.utils.config import get_settings


logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.openai_chat_model
        self.client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

    def describe_image(self, image_path: Path) -> str | None:
        if not image_path or not image_path.exists():
            return None
        if not self.client:
            return "Professional profile image supplied by the candidate."
        encoded = base64.b64encode(image_path.read_bytes()).decode("utf-8")
        response = self.client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Describe this candidate profile image for a professional resume in one sentence."},
                        {"type": "input_image", "image_url": f"data:image/png;base64,{encoded}"},
                    ],
                }
            ],
        )
        return response.output_text.strip()

    def optimize_resume(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        relevant_fragments: list[str],
        tone: str,
        additional_context: str | None,
    ) -> dict[str, Any]:
        if not self.client:
            return self._fallback_resume(resume_data, job_data, relevant_fragments, tone, additional_context)

        prompt = f"""
You are a senior resume strategist and ATS optimization expert.
Return valid JSON with keys: summary, skills, experience, education, certifications, projects, ats_keywords, recommendations.

Tone: {tone}
Additional context: {additional_context or "None"}
Target job data:
{json.dumps(job_data, indent=2)}

Relevant resume fragments:
{json.dumps(relevant_fragments, indent=2)}

Candidate resume:
{resume_data.model_dump_json(indent=2)}

Rules:
- Keep claims grounded in provided input.
- Rewrite bullets with action verbs and quantified outcomes where possible.
- Prioritize ATS keywords naturally.
- Preserve concise single-column resume structure.
"""
        response = self.client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
            text={"format": {"type": "json_object"}},
        )
        return json.loads(response.output_text.strip())

    def _fallback_resume(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        relevant_fragments: list[str],
        tone: str,
        additional_context: str | None,
    ) -> dict[str, Any]:
        target_skills = job_data.get("skills", [])
        prioritized_skills = list(dict.fromkeys(resume_data.skills + target_skills))[:12]
        summary = (
            f"{resume_data.name or 'Candidate'} is a {tone} professional with strengths in "
            f"{', '.join(prioritized_skills[:5]) or 'delivery, collaboration, and execution'}. "
            "The resume is aligned to the target role by highlighting transferable impact and ATS keywords."
        )
        if additional_context:
            summary += f" Additional context: {additional_context}"

        experience = []
        for entry in resume_data.experience:
            optimized_bullets = []
            for bullet in entry.bullets[:4]:
                if bullet:
                    optimized_bullets.append(
                        f"Delivered {bullet[:1].lower() + bullet[1:]} with focus on {', '.join(target_skills[:3]) or 'business outcomes'}."
                    )
            experience.append(
                {
                    "title": entry.title,
                    "company": entry.company,
                    "start_date": entry.start_date,
                    "end_date": entry.end_date,
                    "bullets": optimized_bullets or relevant_fragments[:2],
                }
            )

        return {
            "summary": summary,
            "skills": prioritized_skills,
            "experience": experience,
            "education": [entry.model_dump() for entry in resume_data.education],
            "certifications": resume_data.certifications,
            "projects": resume_data.projects,
            "ats_keywords": target_skills[:12],
            "recommendations": [
                "Mirror the language of the job description in key achievements.",
                "Keep formatting ATS-friendly with clear headings and standard section names.",
                "Prioritize the most relevant impact statements near the top of each section.",
            ],
        }

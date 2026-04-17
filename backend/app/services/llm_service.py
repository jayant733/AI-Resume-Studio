from __future__ import annotations

import base64
import json
import logging
import time
from pathlib import Path
from typing import Any, Generator

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

    def stream_optimize_resume(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        relevant_fragments: list[str],
        tone: str,
        additional_context: str | None,
    ) -> Generator[str, None, None]:
        """Stream the optimized resume JSON as text chunks."""
        if not self.client:
            # Fallback: yield the full fallback response in small chunks
            fallback = self._fallback_resume(resume_data, job_data, relevant_fragments, tone, additional_context)
            text = json.dumps(fallback, indent=2)
            chunk_size = 12
            for i in range(0, len(text), chunk_size):
                yield text[i : i + chunk_size]
                time.sleep(0.02)
            return

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
        with self.client.responses.stream(
            model=self.model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
        ) as stream:
            for event in stream:
                # The streaming API emits text delta events
                delta = getattr(event, "delta", None)
                if delta and isinstance(delta, str):
                    yield delta

    def generate_cover_letter(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        tone: str = "professional",
    ) -> str:
        """Generate a tailored cover letter text."""
        if not self.client:
            return self._fallback_cover_letter(resume_data, job_data, tone)

        prompt = f"""
You are a professional career coach and expert writer.
Write a compelling, personalized cover letter in plain text (no markdown) using the following:

Tone: {tone}
Job: {job_data.get('title', 'the target role')} at {job_data.get('company', 'the company')}
Key requirements: {', '.join(job_data.get('requirements', [])[:6])}
Key skills needed: {', '.join(job_data.get('skills', [])[:8])}

Candidate:
Name: {resume_data.name or 'The Candidate'}
Headline: {resume_data.headline or ''}
Top skills: {', '.join(resume_data.skills[:8])}
Summary: {resume_data.summary or ''}

Write 3 paragraphs:
1. Opening - strong hook referencing the specific role
2. Body - 2-3 quantified achievements aligned to the job requirements
3. Closing - confident call to action

Keep it under 300 words. Do not add placeholders or [brackets].
"""
        response = self.client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
        )
        return response.output_text.strip()

    def _fallback_cover_letter(self, resume_data: ResumeStructuredData, job_data: dict[str, Any], tone: str) -> str:
        job_title = job_data.get("title", "the position")
        company = job_data.get("company", "your organization")
        name = resume_data.name or "I"
        skills = ", ".join(resume_data.skills[:4]) if resume_data.skills else "technical and analytical skills"
        return (
            f"Dear Hiring Manager,\n\n"
            f"I am writing to express my strong interest in the {job_title} role at {company}. "
            f"With a background in {skills}, I am confident in my ability to make a meaningful contribution to your team.\n\n"
            f"Throughout my career, I have consistently delivered impactful results by leveraging my expertise in {skills}. "
            f"My experience aligns closely with the requirements outlined in the job description, and I am eager to bring "
            f"this same level of dedication to {company}.\n\n"
            f"I welcome the opportunity to discuss how my background can contribute to your team's success. "
            f"Thank you for your time and consideration.\n\nSincerely,\n{name}"
        )

    def generate_mock_interview(self, resume_data: ResumeStructuredData, job_data: dict[str, Any]) -> dict[str, Any]:
        """Generate 5 behavioral and technical questions based on the candidate's resume and job."""
        if not self.client:
            return {"questions": ["Tell me about yourself.", "What is your biggest weakness?", "Why this company?", "Describe a challenge.", "Any questions for us?"]}

        prompt = f"""
        You are an expert technical recruiter interviewing a candidate for the following job:
        Title: {job_data.get('title', 'Unknown')}
        Skills needed: {', '.join(job_data.get('skills', [])[:10])}

        Candidate's background:
        {resume_data.model_dump_json(indent=2)}

        Generate exactly 5 targeted interview questions. Incorporate both technical and behavioral questions specific to the candidate's experience.
        Return ONLY valid JSON in format: {{"questions": ["question 1", "question 2", "question 3", "question 4", "question 5"]}}
        """
        response = self.client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
            text={"format": {"type": "json_object"}},
        )
        return json.loads(response.output_text.strip())

    def generate_interview_questions(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
    ) -> dict[str, list[str]]:
        if not self.client:
            return self._fallback_interview_questions(resume_data, job_data)

        prompt = f"""
You are a senior engineering interviewer preparing a candidate for a targeted technical interview.

Candidate resume:
{resume_data.model_dump_json(indent=2)}

Target job:
{json.dumps(job_data, indent=2)}

Task:
1. Use the candidate's actual skills, projects, and experience.
2. Use the job's required skills.
3. Make the difficulty progressive, from moderate to advanced.
4. Return exactly:
- 5 technical interview questions
- 3 behavioral questions
- 2 project-based deep dive questions

Requirements:
- Tailor the questions to the candidate's real background.
- Avoid generic filler questions.
- Project questions must reference a likely project, system, or implementation from the resume.
- Return ONLY valid JSON with keys:
  technical_questions, behavioral_questions, project_questions
"""
        response = self.client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
            text={"format": {"type": "json_object"}},
        )
        return json.loads(response.output_text.strip())

    def generate_linkedin_profile(self, resume_data: ResumeStructuredData) -> dict[str, Any]:
        """Generate optimized LinkedIn headline and summary."""
        if not self.client:
            return {
                "headline": f"{resume_data.headline or 'Professional'} | Seeking new opportunities",
                "about": f"Passionate professional with experience in {', '.join(resume_data.skills[:3]) if resume_data.skills else 'various fields'}."
            }

        prompt = f"""
        You are a top-tier LinkedIn profile optimizer. Given the following resume, write:
        1. A highly engaging, SEO-optimized Headline (under 120 chars).
        2. A compelling 'About' section summary (under 400 words) that tells a professional story, highlights key achievements, and uses line breaks for readability.

        Resume:
        {resume_data.model_dump_json(indent=2)}

        Return ONLY valid JSON in format: {{"headline": "...", "about": "..."}}
        """
        response = self.client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
            text={"format": {"type": "json_object"}},
        )
        return json.loads(response.output_text.strip())

    def stream_chat(self, user_message: str, chat_history: list[dict], resume_data: ResumeStructuredData | None) -> Generator[str, None, None]:
        """Stream chat completions for the AI Career Assistant."""
        if not self.client:
            yield "Mock Chatbot: Please configure the OpenAI API key to access full AI Chat capabilities."
            return

        messages = [
            {"role": "system", "content": [
                {"type": "input_text", "text": "You are an elite Career Assistant and Resume Coach for FAANG-level candidates. Be concise, actionable, and encouraging."}
            ]}
        ]
        
        if resume_data:
            messages[0]["content"][0]["text"] += f"\n\nContext - The user's parsed resume is: {resume_data.model_dump_json(indent=2)}"

        for msg in chat_history:
            messages.append({"role": msg["role"], "content": [{"type": "input_text", "text": msg["content"]}]})
            
        messages.append({"role": "user", "content": [{"type": "input_text", "text": user_message}]})

        with self.client.responses.stream(
            model=self.model,
            input=messages,
        ) as stream:
            for event in stream:
                delta = getattr(event, "delta", None)
                if delta and isinstance(delta, str):
                    yield delta

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

    def _fallback_interview_questions(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
    ) -> dict[str, list[str]]:
        resume_skills = resume_data.skills[:8]
        job_skills = job_data.get("skills", [])[:8]
        focus_skills = list(dict.fromkeys(job_skills + resume_skills))[:5]
        experience_entry = resume_data.experience[0] if resume_data.experience else None
        project_entry = resume_data.projects[0] if resume_data.projects else None
        experience_name = experience_entry.title if experience_entry else "your recent engineering work"
        project_name = str(project_entry.get("name")) if project_entry else "your most relevant project"

        technical_questions = [
            f"How would you explain your hands-on experience with {focus_skills[0] if len(focus_skills) > 0 else 'the core technologies in this role'} from {experience_name}?",
            f"What trade-offs did you manage when applying {focus_skills[1] if len(focus_skills) > 1 else 'scalable system design'} in a production setting?",
            f"If this role required deeper ownership of {focus_skills[2] if len(focus_skills) > 2 else 'backend architecture'}, how would you improve your previous implementation?",
            f"Describe how you would debug a performance bottleneck in a system built with {focus_skills[3] if len(focus_skills) > 3 else 'distributed services'}.",
            f"Design a higher-scale version of the solution you built in {experience_name}, focusing on {focus_skills[4] if len(focus_skills) > 4 else 'reliability and maintainability'}.",
        ]
        behavioral_questions = [
            f"Tell me about a time you had to learn a new skill quickly to deliver results in {experience_name}.",
            "Describe a situation where you disagreed with a technical decision and how you handled it.",
            "Tell me about a high-pressure delivery or deadline and how you kept quality under control.",
        ]
        project_questions = [
            f"Walk me through the architecture, technical decisions, and biggest bottlenecks in {project_name}.",
            f"If you had to rebuild {project_name} for this target role, what would you redesign first and why?",
        ]
        return {
            "technical_questions": technical_questions,
            "behavioral_questions": behavioral_questions,
            "project_questions": project_questions,
        }

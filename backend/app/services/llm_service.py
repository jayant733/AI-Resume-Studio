from __future__ import annotations

import base64
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Generator

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.models.schemas import ResumeStructuredData
from app.utils.config import get_settings


logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()
        self.model_name = settings.gemini_model
        self.api_key = settings.gemini_api_key
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(self.model_name)
        else:
            self.model = None

    def describe_image(self, image_path: Path) -> str | None:
        if not image_path or not image_path.exists():
            return None
        if not self.model:
            return "Professional profile image supplied by the candidate."
        
        try:
            image_data = image_path.read_bytes()
            response = self.model.generate_content([
                "Describe this candidate profile image for a professional resume in one sentence.",
                {"mime_type": "image/png", "data": image_data}
            ])
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error describing image: {e}")
            return "Professional profile image."

    def optimize_resume(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        relevant_fragments: list[str],
        tone: str,
        additional_context: str | None,
    ) -> dict[str, Any]:
        if not self.model:
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
- RETURN ONLY VALID JSON.
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            # Remove markdown code blocks if present
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            elif text.startswith("```"):
                text = text[3:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error optimizing resume: {e}")
            return self._fallback_resume(resume_data, job_data, relevant_fragments, tone, additional_context)

    def stream_optimize_resume(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        relevant_fragments: list[str],
        tone: str,
        additional_context: str | None,
    ) -> Generator[str, None, None]:
        """Stream the optimized resume JSON as text chunks."""
        if not self.model:
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
- RETURN ONLY VALID JSON.
"""
        try:
            response = self.model.generate_content(
                prompt,
                stream=True,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Error streaming resume optimization: {e}")
            yield json.dumps(self._fallback_resume(resume_data, job_data, relevant_fragments, tone, additional_context))

    def generate_cover_letter(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
        tone: str = "professional",
    ) -> str:
        """Generate a tailored cover letter text."""
        if not self.model:
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
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error generating cover letter: {e}")
            return self._fallback_cover_letter(resume_data, job_data, tone)

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
        if not self.model:
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
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error generating mock interview: {e}")
            return {"questions": ["Tell me about yourself.", "What is your biggest weakness?", "Why this company?", "Describe a challenge.", "Any questions for us?"]}

    def generate_interview_questions(
        self,
        resume_data: ResumeStructuredData,
        job_data: dict[str, Any],
    ) -> dict[str, list[str]]:
        if not self.model:
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
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error generating interview questions: {e}")
            return self._fallback_interview_questions(resume_data, job_data)

    def generate_linkedin_profile(self, resume_data: ResumeStructuredData) -> dict[str, Any]:
        """Generate optimized LinkedIn headline and summary."""
        if not self.model:
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
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error generating linkedin profile: {e}")
            return {
                "headline": f"{resume_data.headline or 'Professional'} | Seeking new opportunities",
                "about": f"Passionate professional with experience in {', '.join(resume_data.skills[:3]) if resume_data.skills else 'various fields'}."
            }

    def generate_tell_me_about_yourself(
        self,
        resume_data: ResumeStructuredData,
        target_job_role: str,
    ) -> dict[str, str]:
        if not self.model:
            return {"answer": self._fallback_tell_me_about_yourself(resume_data, target_job_role)}

        prompt = f"""
You are an expert interview coach.

Create a strong "Tell me about yourself" interview answer using:
- Resume JSON
- Target job role

Resume JSON:
{resume_data.model_dump_json(indent=2)}

Target job role:
{target_job_role}

Rules:
- 120 to 180 words
- Natural, conversational tone
- Storytelling format, not robotic
- Start with the candidate's current role, most recent role, or education
- Highlight 2 to 3 key achievements from the actual resume
- Align the story to the target job role
- End with a future-facing goal related to the role
- Keep all claims grounded in the provided resume

Return ONLY valid JSON:
{{
  "answer": "..."
}}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error generating tell me about yourself: {e}")
            return {"answer": self._fallback_tell_me_about_yourself(resume_data, target_job_role)}

    def analyze_resume_claims(self, bullets: list[str]) -> dict[str, list[dict[str, str]]]:
        if not self.model:
            return {"analysis": [self._fallback_claim_analysis(bullet) for bullet in bullets]}

        prompt = f"""
You are a resume-quality and credibility reviewer.

Given the following resume bullets, classify each one as exactly one of:
- strong
- weak
- suspicious

Review criteria:
1. Flag vague claims such as "improved performance significantly"
2. Flag unrealistic or inflated metrics such as extreme percentages or impossible impact
3. Flag missing evidence, including:
   - no numbers
   - no tools or technologies
   - no context about what was improved or built

Bullets:
{json.dumps(bullets, indent=2)}

Return ONLY valid JSON:
{{
  "analysis": [
    {{
      "bullet": "...",
      "label": "weak",
      "reason": "missing quantification"
    }}
  ]
}}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error analyzing resume claims: {e}")
            return {"analysis": [self._fallback_claim_analysis(bullet) for bullet in bullets]}

    def stream_chat(self, user_message: str, chat_history: list[dict], resume_data: ResumeStructuredData | None) -> Generator[str, None, None]:
        """Stream chat completions for the AI Career Assistant."""
        if not self.model:
            yield "Mock Chatbot: Please configure the Gemini API key to access full AI Chat capabilities."
            return

        system_instruction = "You are an elite Career Assistant and Resume Coach for FAANG-level candidates. Be concise, actionable, and encouraging."
        if resume_data:
            system_instruction += f"\n\nContext - The user's parsed resume is: {resume_data.model_dump_json(indent=2)}"

        # Convert history to Gemini format
        history = []
        for msg in chat_history:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        try:
            chat = self.model.start_chat(history=history)
            response = chat.send_message(user_message, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Error in stream_chat: {e}")
            yield "I encountered an error while processing your request. Please check your Gemini API configuration."

    def improve_text(self, text: str, context: str | None = None) -> str:
        """General purpose text improvement for resume sections using Gemini."""
        if not self.model:
            return f"Improved: {text} (Mock mode: Gemini API key missing)"

        prompt = f"""
You are an expert resume writer. Improve the following text for a professional resume.
Focus on:
- Strong action verbs
- Quantifiable results (estimate if not provided, but keep it realistic)
- Concise and professional language
- ATS optimization

Text to improve:
{text}

Additional context:
{context or "General resume section"}

Return ONLY the improved text, no preamble or extra commentary.
"""
        try:
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Error in improve_text: {e}")
            return text

    def parse_resume_with_llm(self, text: str) -> dict[str, Any]:
        """Convert raw resume text into a structured dictionary using Gemini."""
        if not self.model:
            return {}

        prompt = f"""
Convert this resume text into a STRICT structured JSON object. 
DO NOT hallucinate. DO NOT add fake data.
If a field is missing, leave it as empty string or empty array.

JSON STRUCTURE:
{{
  "name": "Full Name",
  "headline": "Professional Headline",
  "email": "Email Address",
  "phone": "Phone Number",
  "location": "City, Country",
  "summary": "Brief professional summary",
  "skills": ["Skill 1", "Skill 2"],
  "experience": [
    {{
      "company": "Company Name",
      "role": "Job Title",
      "start_date": "MM/YYYY",
      "end_date": "MM/YYYY or Present",
      "bullets": ["Achievement 1", "Achievement 2"]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Project description and impact"
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Degree Name",
      "graduation_date": "Year"
    }}
  ],
  "links": {{
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL",
    "portfolio": "Portfolio or Personal Website URL"
  }}
}}

RESUME TEXT:
{text[:10000]}
"""
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text_response = response.text.strip()
            if text_response.startswith("```json"):
                text_response = text_response[7:-3].strip()
            elif text_response.startswith("```"):
                text_response = text_response[3:-3].strip()
            return json.loads(text_response)
        except Exception as e:
            logger.error(f"Error in parse_resume_with_llm: {e}")
            return {}

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

    def _fallback_tell_me_about_yourself(
        self,
        resume_data: ResumeStructuredData,
        target_job_role: str,
    ) -> str:
        current_anchor = (
            resume_data.experience[0].title
            if resume_data.experience
            else resume_data.education[0].degree
            if resume_data.education
            else resume_data.headline
            if resume_data.headline
            else "my recent work"
        )

        achievements: list[str] = []
        for entry in resume_data.experience[:2]:
            for bullet in entry.bullets[:2]:
                cleaned = bullet.strip()
                if cleaned:
                    achievements.append(cleaned)
            if len(achievements) >= 3:
                break

        while len(achievements) < 3:
            if resume_data.skills:
                achievements.append(f"built practical strength in {resume_data.skills[min(len(achievements), len(resume_data.skills) - 1)]}")
            else:
                break

        first_achievement = achievements[0] if len(achievements) > 0 else "worked on meaningful technical problems"
        second_achievement = achievements[1] if len(achievements) > 1 else "improved the way teams deliver solutions"
        third_achievement = achievements[2] if len(achievements) > 2 else "built a stronger foundation in solving real user needs"

        return (
            f"I’m currently focused on {current_anchor}, and over the last few years I’ve been building experience by taking on work that combines problem-solving with real delivery. "
            f"One of the things I’m proud of is how I’ve {first_achievement.lower()}, and I’ve also had the chance to {second_achievement.lower()}. "
            f"Along the way, that helped me become more thoughtful about both the technical side and the impact the work creates. "
            f"I’d say that experience has naturally prepared me for a {target_job_role} role, because it has taught me how to learn quickly, contribute across the stack, and stay focused on outcomes. "
            f"At this stage, I’m looking for an opportunity where I can bring that background into a stronger {target_job_role} position and keep growing by taking on deeper ownership and more challenging problems."
        )

    def _fallback_claim_analysis(self, bullet: str) -> dict[str, str]:
        lowered = bullet.lower()
        numbers = re.findall(r"\b\d+(?:\.\d+)?%?\b", bullet)
        has_number = len(numbers) > 0
        has_tool = bool(re.search(r"\b(python|java|sql|aws|docker|kubernetes|react|fastapi|postgresql|spark|tensorflow|excel|tableau|api)\b", lowered))
        has_context = bool(re.search(r"\b(system|service|pipeline|dashboard|application|model|api|database|platform|process|feature|product)\b", lowered))
        vague_terms = ["significantly", "various", "many", "multiple", "several", "large", "huge", "major"]
        has_vague = any(term in lowered for term in vague_terms)

        suspicious = False
        suspicious_reason = ""
        for token in numbers:
            if token.endswith("%"):
                try:
                    value = float(token[:-1])
                except ValueError:
                    continue
                if value >= 1000:
                    suspicious = True
                    suspicious_reason = "unrealistic metric"
                    break
        if "revenue by 5000%" in lowered or "100x" in lowered or "1000x" in lowered:
            suspicious = True
            suspicious_reason = "unrealistic metric"

        if suspicious:
            return {
                "bullet": bullet,
                "label": "suspicious",
                "reason": suspicious_reason or "metric appears inflated",
            }

        if not has_number and not has_tool and not has_context:
            return {
                "bullet": bullet,
                "label": "weak",
                "reason": "missing numbers, tools, and context",
            }
        if has_vague and not has_number:
            return {
                "bullet": bullet,
                "label": "weak",
                "reason": "vague claim without quantification",
            }
        if not has_number:
            return {
                "bullet": bullet,
                "label": "weak",
                "reason": "missing quantification",
            }
        if not has_tool and not has_context:
            return {
                "bullet": bullet,
                "label": "weak",
                "reason": "missing tools and context",
            }

        return {
            "bullet": bullet,
            "label": "strong",
            "reason": "specific claim with supporting context",
        }

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

import docx2txt
import pdfplumber

from app.models.schemas import ContactInfo, EducationEntry, ExperienceEntry, ResumeStructuredData
from app.services.llm_service import LLMService


logger = logging.getLogger(__name__)


class ResumeParserService:
    def __init__(self) -> None:
        self.llm = LLMService()

    def parse_resume(self, file_path: Path, source_type: str) -> ResumeStructuredData:
        """Main entry point to parse any resume into structured JSON."""
        logger.info(f"🚀 Parsing resume: {file_path} (Type: {source_type})")
        
        try:
            # Step 1: Extract Text
            raw_text = self._extract_text(file_path, source_type)
            
            # Step 2: Clean Text
            clean_text = self._clean_text(raw_text)
            
            if not clean_text or len(clean_text) < 30:
                logger.warning("Extracted text too short or empty.")
                return self._empty_resume()

            # Step 3, 4, 5, 6: Use LLM for high-fidelity structured extraction
            # This handles section detection, entity extraction, and formatting correctly.
            structured_dict = self.llm.parse_resume_with_llm(clean_text)
            
            # Map LLM output to Pydantic model
            parsed_data = self._map_to_model(structured_dict)
            
            # Step 7: Validation & Refinement Layer
            return self._validate_and_refine(parsed_data)

        except Exception as e:
            logger.exception(f"❌ Failed to parse resume: {e}")
            return self._empty_resume()

    def _extract_text(self, file_path: Path, source_type: str) -> str:
        if source_type == "pdf":
            text = ""
            try:
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text += extracted + "\n"
            except Exception as e:
                logger.error(f"pdfplumber failed, trying basic read: {e}")
            return text
        elif source_type == "docx":
            return docx2txt.process(str(file_path))
        elif source_type in ["txt", "text"]:
            return file_path.read_text(encoding="utf-8", errors="ignore")
        else:
            try:
                return file_path.read_text(encoding="utf-8", errors="ignore")
            except:
                return ""

    def _clean_text(self, text: str) -> str:
        # 1. Remove extra horizontal whitespace
        text = re.sub(r'[ \t]+', ' ', text)
        # 2. Fix broken words (newline hyphenation)
        text = re.sub(r'(\w+)-\n(\w+)', r'\1\2', text)
        # 3. Normalize newlines
        text = re.sub(r'\n\s*\n', '\n\n', text)
        # 4. Remove duplicate consecutive lines
        lines = text.splitlines()
        cleaned_lines = []
        last_line = None
        for line in lines:
            line = line.strip()
            if line != last_line:
                cleaned_lines.append(line)
                if line: # Only track non-empty lines for duplication
                    last_line = line
        return "\n".join(cleaned_lines).strip()

    def _map_to_model(self, d: dict[str, Any]) -> ResumeStructuredData:
        # Extract links
        links = d.get("links", {})
        linkedin = links.get("linkedin") or ""
        github = links.get("github") or ""
        website = links.get("portfolio") or ""

        # Map experience
        experience = []
        for exp in d.get("experience", []):
            experience.append(
                ExperienceEntry(
                    title=exp.get("role", "Professional"),
                    company=exp.get("company", "Independent"),
                    location=None,
                    start_date=exp.get("start_date"),
                    end_date=exp.get("end_date"),
                    bullets=[str(b).strip() for b in exp.get("bullets", []) if str(b).strip()],
                )
            )

        # Map education
        education = []
        for edu in d.get("education", []):
            education.append(
                EducationEntry(
                    institution=edu.get("institution", "University"),
                    degree=edu.get("degree", "Degree"),
                    graduation_date=edu.get("graduation_date"),
                )
            )

        return ResumeStructuredData(
            name=d.get("name") or "",
            headline=d.get("headline") or "",
            summary=d.get("summary") or "",
            contact=ContactInfo(
                email=d.get("email"),
                phone=d.get("phone"),
                location=d.get("location"),
                linkedin=linkedin if "linkedin.com" in linkedin else None,
                website=website if website else None,
                github=github if "github.com" in github else None,
            ),
            skills=[str(s).strip() for b in d.get("skills", []) for s in (b.split(",") if "," in str(b) else [b]) if str(s).strip()],
            experience=experience,
            education=education,
            projects=d.get("projects", []),
        )

    def _validate_and_refine(self, data: ResumeStructuredData) -> ResumeStructuredData:
        # 1. Refine Skills: No sentences, no emails, no noise
        refined_skills = []
        seen = set()
        for s in data.skills:
            s_clean = s.strip(" •*-")
            # Skip if empty or too long (likely a sentence)
            if not s_clean or len(s_clean.split()) > 4:
                continue
            # Skip if looks like email
            if "@" in s_clean:
                continue
            # Skip if likely part of contact info (phone/linkedin)
            if "linkedin.com" in s_clean.lower() or "github.com" in s_clean.lower():
                continue
            
            if s_clean.lower() not in seen:
                refined_skills.append(s_clean)
                seen.add(s_clean.lower())
        data.skills = refined_skills[:40]

        # 2. Refine Experience Bullets: No raw text dumping
        for exp in data.experience:
            # Filter out short noise lines like "Remote", "Full-time", or dates from bullets
            clean_bullets = []
            for b in exp.bullets:
                b_clean = b.strip()
                if len(b_clean) < 10: # Likely noise or header info
                    continue
                # Remove duplicated bullets
                if b_clean not in clean_bullets:
                    clean_bullets.append(b_clean)
            exp.bullets = clean_bullets

        return data

    def _empty_resume(self) -> ResumeStructuredData:
        return ResumeStructuredData(
            name="",
            headline="",
            contact=ContactInfo(),
            summary="",
            skills=[],
            experience=[],
            education=[],
            projects=[],
        )

    def parse_linkedin_json(self, payload: dict) -> ResumeStructuredData:
        """Parse LinkedIn JSON into clean structured model."""
        # Convert JSON to a readable format for LLM to handle normalization
        readable_text = json.dumps(payload, indent=2)
        return self.parse_resume_from_text(readable_text)

    def parse_resume_from_text(self, text: str) -> ResumeStructuredData:
        """Parse raw text string directly."""
        clean_text = self._clean_text(text)
        structured_dict = self.llm.parse_resume_with_llm(clean_text)
        parsed_data = self._map_to_model(structured_dict)
        return self._validate_and_refine(parsed_data)

    def parse_job_description(self, description: str) -> dict[str, Any]:
        """Convert job description into structured requirements/skills."""
        clean_desc = self._clean_text(description)
        # Use LLM for high-quality job parsing
        prompt = f"""
Extract key information from this job description into a structured JSON.
FIELDS:
- skills: list of technical and soft skills (short tags)
- requirements: list of mandatory qualifications (short sentences)
- responsibilities: list of what the person will do (short sentences)

JOB DESCRIPTION:
{clean_desc[:6000]}
"""
        try:
            from google.generativeai.types import GenerationConfig
            response = self.llm.model.generate_content(
                prompt,
                generation_config=GenerationConfig(response_mime_type="application/json")
            )
            text = response.text.strip()
            if text.startswith("```json"): text = text[7:-3].strip()
            elif text.startswith("```"): text = text[3:-3].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Job parsing failed: {e}")
            return {"skills": [], "requirements": [], "responsibilities": []}

    def extract_resume_bullets(self, raw_text: str) -> list[str]:
        """Extract achievement statements for claim detection."""
        parsed = self.parse_resume_from_text(raw_text)
        bullets = []
        for exp in parsed.experience:
            bullets.extend(exp.bullets)
        return bullets[:30]

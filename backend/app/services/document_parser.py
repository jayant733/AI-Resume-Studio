from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import docx2txt
import fitz

from app.models.schemas import ContactInfo, EducationEntry, ExperienceEntry, ResumeStructuredData


logger = logging.getLogger(__name__)


class DocumentParserService:
    def parse_file(self, file_path: Path, source_type: str) -> tuple[str, ResumeStructuredData]:
        raw_text = self._extract_text(file_path, source_type)
        parsed = self._basic_resume_parse(raw_text)
        return raw_text, parsed

    def parse_text(self, raw_text: str) -> ResumeStructuredData:
        return self._basic_resume_parse(raw_text)

    def parse_linkedin_json(self, payload: dict) -> tuple[str, ResumeStructuredData]:
        raw_text = json.dumps(payload, indent=2)
        basics = payload.get("basics", {})
        experience = [
            ExperienceEntry(
                title=item.get("position", "Role"),
                company=item.get("companyName"),
                start_date=str(item.get("timePeriod", {}).get("startDate", {}).get("year", "")) or None,
                end_date=str(item.get("timePeriod", {}).get("endDate", {}).get("year", "")) or None,
                bullets=[item.get("description", "")],
            )
            for item in payload.get("positions", [])
        ]
        education = [
            EducationEntry(
                institution=item.get("schoolName", "Institution"),
                degree=item.get("degreeName"),
                graduation_date=str(item.get("timePeriod", {}).get("endDate", {}).get("year", "")) or None,
            )
            for item in payload.get("education", [])
        ]
        parsed = ResumeStructuredData(
            name=basics.get("name"),
            headline=basics.get("headline"),
            summary=basics.get("summary"),
            contact=ContactInfo(
                email=basics.get("email"),
                linkedin=basics.get("publicIdentifier"),
                location=basics.get("locationName"),
            ),
            skills=[skill.get("name") if isinstance(skill, dict) else skill for skill in payload.get("skills", []) if (isinstance(skill, dict) and skill.get("name")) or (isinstance(skill, str) and skill.strip())],
            experience=experience,
            education=education,
            projects=payload.get("projects", []),
        )
        return raw_text, parsed

    def parse_job_description(self, description: str) -> dict:
        skills = self._extract_skills(description)
        requirements = self._extract_list_after_heading(description, ["requirements", "qualifications"])
        responsibilities = self._extract_list_after_heading(description, ["responsibilities", "what you'll do"])
        return {
            "skills": skills,
            "requirements": requirements,
            "responsibilities": responsibilities,
        }

    def _extract_text(self, file_path: Path, source_type: str) -> str:
        if source_type == "pdf":
            with fitz.open(file_path) as document:
                return "\n".join(page.get_text() for page in document)
        if source_type == "docx":
            return docx2txt.process(str(file_path))
        raise ValueError(f"Unsupported resume source type: {source_type}")

    def _basic_resume_parse(self, raw_text: str) -> ResumeStructuredData:
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        email = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
        phone = re.search(r"(\+\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})", raw_text)
        name = lines[0] if lines else None
        section_map = self._split_sections(raw_text)
        parsed = ResumeStructuredData(
            name=name,
            headline=lines[1] if len(lines) > 1 else None,
            contact=ContactInfo(
                email=email.group(0) if email else None,
                phone=phone.group(0) if phone else None,
                linkedin=self._extract_first_url(raw_text, "linkedin.com"),
                website=self._extract_first_url(raw_text, None),
            ),
            summary=self._extract_summary(section_map, raw_text),
            skills=self._extract_skills(section_map.get("skills", raw_text)),
            experience=self._parse_experience(section_map.get("experience", "")),
            education=self._parse_education(section_map.get("education", "")),
            certifications=self._extract_bullets(section_map.get("certifications", "")),
            projects=self._parse_projects(section_map.get("projects", "")),
        )
        logger.info("Parsed resume for %s", parsed.name or "unknown candidate")
        return parsed

    def _split_sections(self, raw_text: str) -> dict[str, str]:
        headings = ["summary", "profile", "experience", "work experience", "education", "skills", "projects", "certifications"]
        current = "general"
        sections: dict[str, list[str]] = {current: []}
        for line in raw_text.splitlines():
            stripped = line.strip()
            lower = stripped.lower()
            if lower in headings:
                current = lower.replace("work experience", "experience").replace("profile", "summary")
                sections.setdefault(current, [])
                continue
            sections.setdefault(current, []).append(stripped)
        return {key: "\n".join(value).strip() for key, value in sections.items()}

    def _extract_summary(self, section_map: dict[str, str], raw_text: str) -> str | None:
        summary = section_map.get("summary")
        if summary:
            return summary[:700]
        chunks = [chunk.strip() for chunk in raw_text.split("\n\n") if chunk.strip()]
        return chunks[1][:700] if len(chunks) > 1 else None

    def _extract_skills(self, text: str) -> list[str]:
        candidates = re.split(r"[,|\n•]+", text)
        cleaned = []
        seen: set[str] = set()
        for item in candidates:
            skill = item.strip(" -\t").strip()
            if 1 < len(skill) < 40 and skill.lower() not in seen:
                seen.add(skill.lower())
                cleaned.append(skill)
        return cleaned[:25]

    def _extract_list_after_heading(self, text: str, headings: list[str]) -> list[str]:
        blocks = self._split_sections(text)
        for heading in headings:
            if heading in blocks:
                return self._extract_bullets(blocks[heading])
        return []

    def _extract_bullets(self, text: str) -> list[str]:
        bullets = []
        for line in text.splitlines():
            stripped = line.strip().lstrip("-•*").strip()
            if stripped:
                bullets.append(stripped)
        return bullets[:12]

    def _parse_experience(self, text: str) -> list[ExperienceEntry]:
        if not text:
            return []
        blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
        items: list[ExperienceEntry] = []
        for block in blocks[:8]:
            lines = [line.strip() for line in block.splitlines() if line.strip()]
            if not lines:
                continue
            first = lines[0]
            if " at " in first.lower():
                title, company = first.split(" at ", 1)
            else:
                title, company = first, None
            bullets = [line.lstrip("-•* ").strip() for line in lines[1:] if line.strip()]
            items.append(ExperienceEntry(title=title, company=company, bullets=bullets[:5]))
        return items

    def _parse_education(self, text: str) -> list[EducationEntry]:
        if not text:
            return []
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        entries = []
        for line in lines[:6]:
            parts = [part.strip() for part in line.split(",")]
            entries.append(
                EducationEntry(
                    institution=parts[0],
                    degree=parts[1] if len(parts) > 1 else None,
                    graduation_date=parts[2] if len(parts) > 2 else None,
                )
            )
        return entries

    def _extract_first_url(self, text: str, contains: str | None) -> str | None:
        urls = re.findall(r"https?://[^\s]+", text)
        for url in urls:
            if contains is None or contains in url:
                return url
        return None

    def _parse_projects(self, text: str) -> list[dict]:
        if not text:
            return []
        blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
        projects = []
        for block in blocks[:6]:
            lines = [line.strip() for line in block.splitlines() if line.strip()]
            if not lines:
                continue
            projects.append(
                {
                    "name": lines[0],
                    "description": " ".join(lines[1:4]) if len(lines) > 1 else None,
                }
            )
        return projects

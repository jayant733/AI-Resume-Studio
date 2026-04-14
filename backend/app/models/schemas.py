from __future__ import annotations

from typing import Any

from pydantic import AnyHttpUrl, BaseModel, Field


class ContactInfo(BaseModel):
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    website: str | None = None


class ExperienceEntry(BaseModel):
    title: str
    company: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    bullets: list[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    institution: str
    degree: str | None = None
    graduation_date: str | None = None


class ResumeStructuredData(BaseModel):
    name: str | None = None
    headline: str | None = None
    contact: ContactInfo = Field(default_factory=ContactInfo)
    summary: str | None = None
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[dict[str, Any]] = Field(default_factory=list)


class UploadResumeResponse(BaseModel):
    resume_id: int
    parsed_resume: ResumeStructuredData
    image_caption: str | None = None


class AnalyzeJobRequest(BaseModel):
    resume_id: int
    job_title: str | None = None
    company: str | None = None
    job_description: str


class AnalyzeJobResponse(BaseModel):
    job_id: int
    semantic_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    relevant_experience: list[dict[str, Any]]
    recommendations: list[str]


class GenerateResumeRequest(BaseModel):
    resume_id: int
    job_id: int
    tone: str = "professional"
    additional_context: str | None = None
    template_id: str = "classic"


class GenerateResumeResponse(BaseModel):
    output_id: int
    optimized_resume: dict[str, Any]
    pdf_download_url: str


# --- Async job tracking ---

class GenerateJobResponse(BaseModel):
    job_id: int


class JobStatusResponse(BaseModel):
    job_id: int
    status: str  # queued | processing | done | failed
    error: str | None = None
    result: GenerateResumeResponse | None = None


# --- ATS Scoring ---

class ATSScoreDimension(BaseModel):
    score: float
    label: str
    detail: str


class ATSScoreResponse(BaseModel):
    total_score: int
    keyword_density: ATSScoreDimension
    action_verb_rate: ATSScoreDimension
    quantification_rate: ATSScoreDimension
    section_completeness: ATSScoreDimension
    improvement_tips: list[str]


# --- Job Scraper ---

class ScrapeJobRequest(BaseModel):
    url: AnyHttpUrl


class ScrapeJobResponse(BaseModel):
    title: str | None
    company: str | None
    description: str
    parsed: dict[str, Any]


# --- Cover Letter ---

class CoverLetterRequest(BaseModel):
    resume_id: int
    job_id: int
    tone: str = "professional"


class CoverLetterResponse(BaseModel):
    cover_letter_text: str
    pdf_download_url: str

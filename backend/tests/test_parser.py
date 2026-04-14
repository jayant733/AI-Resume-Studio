"""Unit tests for the DocumentParserService."""
from __future__ import annotations

from app.services.document_parser import DocumentParserService
from tests.conftest import SAMPLE_RESUME_TEXT


def test_parse_basic_resume():
    parser = DocumentParserService()
    parsed = parser._basic_resume_parse(SAMPLE_RESUME_TEXT)
    assert parsed.name == "John Doe"
    assert parsed.contact.email == "john.doe@example.com"
    assert "Python" in parsed.skills


def test_extract_skills_comma_separated():
    parser = DocumentParserService()
    skills = parser._extract_skills("Python, FastAPI, React, PostgreSQL, Docker")
    assert "Python" in skills
    assert "FastAPI" in skills
    assert len(skills) == 5


def test_extract_skills_bullet_separated():
    parser = DocumentParserService()
    skills = parser._extract_skills("Python\n• FastAPI\n• React")
    assert "Python" in skills


def test_parse_experience_basic():
    parser = DocumentParserService()
    text = "Senior Engineer at Acme\n- Built APIs\n- Reduced latency by 40%"
    experience = parser._parse_experience(text)
    assert len(experience) == 1
    assert experience[0].title == "Senior Engineer"
    assert experience[0].company == "Acme"
    assert len(experience[0].bullets) == 2


def test_parse_job_description_extracts_skills():
    parser = DocumentParserService()
    job_text = """
    Requirements:
    - 5+ years Python experience
    - FastAPI and PostgreSQL
    
    Skills: Python, FastAPI, Docker, AWS
    """
    result = parser.parse_job_description(job_text)
    assert isinstance(result["skills"], list)


def test_parse_education():
    parser = DocumentParserService()
    section_map = {"education": "State University, B.Sc. Computer Science, 2019"}
    parsed = parser._parse_education(section_map["education"])
    assert len(parsed) == 1
    assert parsed[0].institution == "State University"
    assert parsed[0].degree == "B.Sc. Computer Science"


def test_split_sections_identifies_headings():
    parser = DocumentParserService()
    text = "John Doe\n\nSummary\nGreat engineer\n\nExperience\nSenior Eng at Corp\n\nSkills\nPython, Docker"
    sections = parser._split_sections(text)
    assert "summary" in sections
    assert "experience" in sections
    assert "skills" in sections

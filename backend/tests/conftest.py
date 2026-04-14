"""Shared test fixtures for the AI Resume Optimization Platform test suite."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import Base, get_db
from app.main import app


# ---------------------------------------------------------------------------
# In-memory SQLite database (isolated per test session)
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = "sqlite:///./test_resume_ai.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Sample resume text fixture
# ---------------------------------------------------------------------------
SAMPLE_RESUME_TEXT = """
John Doe
Software Engineer | john.doe@example.com | +1-555-0101 | linkedin.com/in/johndoe

Summary
Results-driven software engineer with 5 years of experience building scalable web applications
using Python, FastAPI, and React.

Experience
Senior Software Engineer at Acme Corp
- Led development of a microservices platform serving 1M+ daily active users
- Reduced API latency by 40% through caching and query optimization
- Managed a team of 4 engineers to deliver features on time

Software Engineer at StartupXYZ
- Built REST APIs using FastAPI and PostgreSQL
- Increased test coverage from 30% to 85% using pytest

Education
State University, B.Sc. Computer Science, 2019

Skills
Python, FastAPI, React, PostgreSQL, Docker, AWS, TypeScript, Redis

Certifications
AWS Certified Solutions Architect
"""

SAMPLE_JOB_DATA = {
    "title": "Senior Python Engineer",
    "company": "TechCorp",
    "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
    "requirements": ["5+ years experience", "Strong Python skills", "Experience with cloud platforms"],
    "responsibilities": ["Design scalable APIs", "Mentor junior engineers", "Drive technical roadmap"],
    "requirements_text": "We need a Senior Python Engineer with FastAPI and cloud experience.",
}

SAMPLE_RESUME_JSON = {
    "name": "John Doe",
    "headline": "Software Engineer",
    "summary": "Results-driven software engineer with 5 years of experience.",
    "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "AWS"],
    "experience": [
        {
            "title": "Senior Software Engineer",
            "company": "Acme Corp",
            "start_date": "2021",
            "end_date": "Present",
            "bullets": [
                "Led development of a microservices platform serving 1M+ daily active users",
                "Reduced API latency by 40% through caching and query optimization",
                "Managed a team of 4 engineers to deliver features on time",
            ],
        }
    ],
    "education": [
        {"institution": "State University", "degree": "B.Sc. Computer Science", "graduation_date": "2019"}
    ],
    "certifications": ["AWS Certified Solutions Architect"],
    "projects": [],
    "contact": {"email": "john.doe@example.com"},
}

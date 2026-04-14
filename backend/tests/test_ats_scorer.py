"""Unit tests for the ATSScorer service."""
from __future__ import annotations

from app.services.ats_scorer import ATSScorer
from tests.conftest import SAMPLE_JOB_DATA, SAMPLE_RESUME_JSON


def test_total_score_in_range():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, SAMPLE_JOB_DATA)
    assert 0 <= result["total_score"] <= 100


def test_keyword_density_high_overlap():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, SAMPLE_JOB_DATA)
    # Resume has Python, FastAPI, PostgreSQL, Docker, AWS — same as job
    assert result["keyword_density"]["score"] > 0.7


def test_keyword_density_no_job_keywords():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, {"skills": []})
    # No job keywords → perfect score (1.0)
    assert result["keyword_density"]["score"] == 1.0


def test_action_verb_rate():
    scorer = ATSScorer()
    resume_with_verbs = {
        **SAMPLE_RESUME_JSON,
        "experience": [
            {
                "title": "Engineer",
                "company": "Co",
                "bullets": [
                    "Led a team of 5 engineers",
                    "Built scalable microservices",
                    "Reduced latency by 40%",
                ],
            }
        ],
    }
    result = scorer.score(resume_with_verbs, SAMPLE_JOB_DATA)
    assert result["action_verb_rate"]["score"] > 0.9


def test_action_verb_rate_no_experience():
    scorer = ATSScorer()
    result = scorer.score({"skills": ["Python"]}, SAMPLE_JOB_DATA)
    assert result["action_verb_rate"]["score"] == 0.0


def test_quantification_rate():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, SAMPLE_JOB_DATA)
    # Two quantified bullets: "1M+ daily active users" and "40%"
    assert result["quantification_rate"]["score"] > 0


def test_section_completeness_full():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, SAMPLE_JOB_DATA)
    # Has summary, skills, experience, education, certifications
    assert result["section_completeness"]["score"] == 1.0


def test_section_completeness_missing():
    scorer = ATSScorer()
    sparse = {"skills": ["Python"]}
    result = scorer.score(sparse, SAMPLE_JOB_DATA)
    assert result["section_completeness"]["score"] < 1.0


def test_improvement_tips_generated():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, SAMPLE_JOB_DATA)
    assert isinstance(result["improvement_tips"], list)
    assert len(result["improvement_tips"]) > 0


def test_score_structure():
    scorer = ATSScorer()
    result = scorer.score(SAMPLE_RESUME_JSON, SAMPLE_JOB_DATA)
    required_keys = ["total_score", "keyword_density", "action_verb_rate", "quantification_rate",
                     "section_completeness", "improvement_tips"]
    for key in required_keys:
        assert key in result, f"Missing key: {key}"

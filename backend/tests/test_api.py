"""Integration tests for all API endpoints."""
from __future__ import annotations

import io
from unittest.mock import MagicMock, patch


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


# ---------------------------------------------------------------------------
# Upload resume
# ---------------------------------------------------------------------------

def test_upload_resume_pdf(client, tmp_path):
    """Test PDF upload creates a resume record."""
    # Create a minimal valid-looking PDF (just a text file for parsing)
    fake_pdf = tmp_path / "resume.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4 fake pdf content John Doe python developer")

    with patch("app.services.document_parser.DocumentParserService.parse_file") as mock_parse:
        from app.models.schemas import ContactInfo, ResumeStructuredData
        mock_parse.return_value = (
            "John Doe\nSoftware Engineer",
            ResumeStructuredData(
                name="John Doe",
                headline="Software Engineer",
                contact=ContactInfo(email="john@example.com"),
                skills=["Python", "FastAPI"],
            ),
        )
        with patch("app.services.embedding_service.EmbeddingService.embed_texts", return_value=[[0.1] * 10]):
            with patch("app.services.vector_store.VectorStoreService.upsert_resume_fragments"):
                with open(fake_pdf, "rb") as f:
                    response = client.post(
                        "/upload-resume",
                        data={"email": "john@example.com", "source_type": "pdf"},
                        files={"resume_file": ("resume.pdf", f, "application/pdf")},
                    )

    assert response.status_code == 200
    data = response.json()
    assert "resume_id" in data
    assert data["parsed_resume"]["name"] == "John Doe"


def test_upload_requires_file_or_json(client):
    """Upload without any resume data should return 400."""
    response = client.post("/upload-resume", data={"email": "test@example.com"})
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Scrape job
# ---------------------------------------------------------------------------

def test_scrape_job_invalid_url(client):
    """Non-existent URL should return a 422 error."""
    response = client.post(
        "/scrape-job",
        json={"url": "http://localhost:19999/totally-nonexistent-page"},
    )
    assert response.status_code == 422


def test_scrape_job_valid_structure(client):
    """Mock a successful scrape and verify response shape."""
    with patch("app.services.job_scraper.JobScraper.scrape") as mock_scrape:
        mock_scrape.return_value = (
            "Python developer required. Skills: Python, FastAPI, Docker. 5 years experience.",
            "Senior Python Engineer",
            "TechCorp",
        )
        response = client.post("/scrape-job", json={"url": "https://example.com/jobs/123"})

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Senior Python Engineer"
    assert data["company"] == "TechCorp"
    assert "description" in data
    assert "parsed" in data


# ---------------------------------------------------------------------------
# ATS score
# ---------------------------------------------------------------------------

def test_ats_score_not_found(client):
    response = client.post("/ats-score?output_id=99999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Job status
# ---------------------------------------------------------------------------

def test_job_status_not_found(client):
    response = client.get("/job-status/99999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Download PDF
# ---------------------------------------------------------------------------

def test_download_pdf_not_found(client):
    response = client.get("/download-pdf?output_id=99999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Diff
# ---------------------------------------------------------------------------

def test_diff_not_found(client):
    response = client.get("/diff/99999")
    assert response.status_code == 404

from __future__ import annotations

import html
import re

import httpx


class JobScraper:
    """Scrape a job posting URL and return the main text content."""

    _HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }

    def scrape(self, url: str) -> tuple[str, str | None, str | None]:
        """
        Fetch a job posting URL and return (description_text, title, company).
        Raises httpx.HTTPError or ValueError on failure.
        """
        with httpx.Client(headers=self._HEADERS, follow_redirects=True, timeout=15) as client:
            response = client.get(url)
            response.raise_for_status()

        raw_html = response.text
        title = self._extract_title(raw_html)
        company = self._extract_company(raw_html, url)
        text = self._html_to_text(raw_html)

        # Keep the largest meaningful block
        text = self._clean_text(text)
        return text, title, company

    # ------------------------------------------------------------------

    def _html_to_text(self, raw_html: str) -> str:
        # Remove script / style blocks first
        cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw_html, flags=re.DOTALL | re.IGNORECASE)
        # Remove all remaining HTML tags
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        # Decode HTML entities
        cleaned = html.unescape(cleaned)
        return cleaned

    def _clean_text(self, text: str) -> str:
        # Collapse multiple whitespace
        text = re.sub(r"[ \t]+", " ", text)
        # Collapse many blank lines into two
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Strip leading/trailing whitespace from each line
        lines = [line.strip() for line in text.splitlines()]
        # Remove very short lines (nav links, buttons)
        lines = [line for line in lines if len(line) > 20]
        return "\n".join(lines).strip()

    def _extract_title(self, raw_html: str) -> str | None:
        # Try <title> tag first
        m = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.DOTALL | re.IGNORECASE)
        if m:
            title = html.unescape(m.group(1)).strip()
            # Many sites format: "Job Title | Company" or "Job Title - Company"
            title = re.split(r"[|\-–—]", title)[0].strip()
            if title:
                return title[:200]
        return None

    def _extract_company(self, raw_html: str, url: str) -> str | None:
        # Try common meta patterns
        for pattern in [
            r'name="author"\s+content="([^"]+)"',
            r'property="og:site_name"\s+content="([^"]+)"',
            r'"hiringOrganization"[^}]*"name"\s*:\s*"([^"]+)"',
        ]:
            m = re.search(pattern, raw_html, re.IGNORECASE)
            if m:
                return html.unescape(m.group(1)).strip()[:200]

        # Fallback: extract domain as company hint
        m = re.search(r"https?://(?:www\.)?([^/]+)", url)
        if m:
            domain = m.group(1).split(".")[0].title()
            return domain
        return None

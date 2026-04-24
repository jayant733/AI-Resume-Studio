from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

class TemplateService:
    def __init__(self) -> None:
        self.template_dir = Path(__file__).resolve().parent.parent / "templates"

    def list_templates(self) -> list[dict[str, Any]]:
        """Lists all templates available on disk by reading metadata.json in subfolders."""
        templates = []
        # We look into classic, modern, minimal, etc.
        for path in self.template_dir.iterdir():
            if path.is_dir() and (path / "metadata.json").exists():
                try:
                    with open(path / "metadata.json", "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        meta["id"] = path.name
                        templates.append(meta)
                except Exception as e:
                    logger.error(f"Error loading template metadata from {path}: {e}")
        return templates

    def get_template_metadata(self, template_id: str) -> dict[str, Any] | None:
        path = self.template_dir / template_id
        if path.is_dir() and (path / "metadata.json").exists():
            with open(path / "metadata.json", "r", encoding="utf-8") as f:
                meta = json.load(f)
                meta["id"] = template_id
                return meta
        return None

    def get_template_files(self, template_id: str) -> dict[str, str]:
        """Returns the HTML and CSS content for a specific template."""
        path = self.template_dir / template_id
        result = {}
        if (path / "index.html").exists():
            result["html"] = (path / "index.html").read_text(encoding="utf-8")
        if (path / "style.css").exists():
            result["css"] = (path / "style.css").read_text(encoding="utf-8")
        return result

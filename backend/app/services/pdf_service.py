from __future__ import annotations

import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.utils.config import get_settings


logger = logging.getLogger(__name__)


_TEMPLATE_MAP = {
    "classic": "resume_classic.html",
    "modern": "resume_modern.html",
    "minimal": "resume_minimal.html",
    "ats_safe": "resume_classic.html", # Fallback to classic
}


class PDFService:
    def __init__(self) -> None:
        # ✅ Windows-specific fix for WeasyPrint
        import os
        import platform
        if os.name == "nt":
            settings = get_settings()
            # 1. Try environment variable
            dll_dir = os.environ.get("WEASYPRINT_DLL_DIRECTORIES")
            # 2. Try common scoop/msys2 path
            if not dll_dir:
                scoop_msys2 = os.path.expanduser("~\\scoop\\apps\\msys2\\current\\mingw64\\bin")
                if os.path.exists(scoop_msys2):
                    dll_dir = scoop_msys2
            
            if dll_dir and os.path.exists(dll_dir):
                logger.info("Adding WeasyPrint DLL directory: %s", dll_dir)
                try:
                    os.add_dll_directory(dll_dir)
                except Exception as e:
                    logger.warning("Could not add DLL directory %s: %s", dll_dir, e)

        template_dir = Path(__file__).resolve().parent.parent / "templates" / "resume"
        self.environment = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )
        self.template_dir = template_dir

        # Cover letter template lives one level up
        cover_dir = Path(__file__).resolve().parent.parent / "templates"
        self.cover_environment = Environment(
            loader=FileSystemLoader(str(cover_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def render_html_preview(self, context: dict, template_id: str = "classic") -> str:
        """Renders the HTML content for live preview in the builder."""
        template_name = _TEMPLATE_MAP.get(template_id, "resume_classic.html")
        html_template = self.environment.get_template(template_name)
        
        # Load CSS
        styles_path = self.template_dir / "styles.css"
        styles = styles_path.read_text(encoding="utf-8") if styles_path.exists() else ""

        override_path = self.template_dir / f"styles_{template_id}.css"
        if override_path.exists():
            styles += "\n" + override_path.read_text(encoding="utf-8")

        rendered_body = html_template.render(**context)
        
        # Wrap in a basic HTML structure with styles for the iframe
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>{styles}</style>
        </head>
        <body>
            {rendered_body}
        </body>
        </html>
        """
        return full_html

    def render_pdf(self, context: dict, output_path: Path, template_id: str = "classic") -> Path:
        try:
            from weasyprint import CSS, HTML
        except Exception as e:
            logger.error(f"WeasyPrint failed to load (likely missing GTK+): {e}")
            raise RuntimeError(
                "PDF Generation failed: System dependencies missing (GTK+ runtime required for WeasyPrint on Windows). "
                "Please install GTK+ or contact support."
            ) from e

        template_name = _TEMPLATE_MAP.get(template_id, "resume_classic.html")
        html_template = self.environment.get_template(template_name)

        # All templates share the same base CSS; modern/minimal have additional overrides
        styles_path = self.template_dir / "styles.css"
        styles = styles_path.read_text(encoding="utf-8") if styles_path.exists() else ""

        override_path = self.template_dir / f"styles_{template_id}.css"
        if override_path.exists():
            styles += "\n" + override_path.read_text(encoding="utf-8")

        html = html_template.render(**context)
        HTML(string=html, base_url=str(self.template_dir)).write_pdf(
            str(output_path),
            stylesheets=[CSS(string=styles)],
        )
        return output_path

    def render_cover_letter_pdf(self, context: dict, output_path: Path) -> Path:
        try:
            from weasyprint import CSS, HTML
        except Exception as e:
            logger.error(f"WeasyPrint failed to load (likely missing GTK+): {e}")
            raise RuntimeError(
                "PDF Generation failed: System dependencies missing (GTK+ runtime required for WeasyPrint on Windows). "
                "Please install GTK+ or contact support."
            ) from e

        html_template = self.cover_environment.get_template("cover_letter.html")
        html = html_template.render(**context)

        cover_css = (Path(__file__).resolve().parent.parent / "templates" / "cover_letter.css")
        styles = cover_css.read_text(encoding="utf-8") if cover_css.exists() else ""

        HTML(string=html, base_url=str(self.template_dir)).write_pdf(
            str(output_path),
            stylesheets=[CSS(string=styles)],
        )
        return output_path

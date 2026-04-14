from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape


_TEMPLATE_MAP = {
    "classic": "resume_classic.html",
    "modern": "resume_modern.html",
    "minimal": "resume_minimal.html",
}


class PDFService:
    def __init__(self) -> None:
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

    def render_pdf(self, context: dict, output_path: Path, template_id: str = "classic") -> Path:
        from weasyprint import CSS, HTML

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
        from weasyprint import CSS, HTML

        html_template = self.cover_environment.get_template("cover_letter.html")
        html = html_template.render(**context)

        cover_css = (Path(__file__).resolve().parent.parent / "templates" / "cover_letter.css")
        styles = cover_css.read_text(encoding="utf-8") if cover_css.exists() else ""

        HTML(string=html, base_url=str(self.template_dir)).write_pdf(
            str(output_path),
            stylesheets=[CSS(string=styles)],
        )
        return output_path

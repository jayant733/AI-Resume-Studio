from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape


class PDFService:
    def __init__(self) -> None:
        template_dir = Path(__file__).resolve().parent.parent / "templates" / "resume"
        self.environment = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )
        self.template_dir = template_dir

    def render_pdf(self, context: dict, output_path: Path) -> Path:
        from weasyprint import CSS, HTML

        html_template = self.environment.get_template("resume.html")
        styles = (self.template_dir / "styles.css").read_text(encoding="utf-8")
        html = html_template.render(**context)
        HTML(string=html, base_url=str(self.template_dir)).write_pdf(
            str(output_path),
            stylesheets=[CSS(string=styles)],
        )
        return output_path

"""Report generation service using docxtpl for templates."""
from pathlib import Path
from typing import Dict, Any
from io import BytesIO
import openpyxl
from docxtpl import DocxTemplate
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader


class ReportService:
    """Service for generating reports from templates."""

    def __init__(self):
        self.template_dir = Path(__file__).parent.parent / "templates" / "reports"

        # Jinja2 environment for HTML templates
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(self.template_dir))
        )

    async def generate_pdf_from_docx(
        self,
        template_name: str,
        data: Dict[str, Any]
    ) -> bytes:
        """
        Generate PDF from Word template.

        Args:
            template_name: Name of .docx template file
            data: Dictionary with data to inject into template

        Returns:
            PDF file as bytes
        """
        template_path = self.template_dir / template_name

        # Load docx template
        doc = DocxTemplate(str(template_path))

        # Render with data
        doc.render(data)

        # Save to BytesIO
        docx_bytes = BytesIO()
        doc.save(docx_bytes)
        docx_bytes.seek(0)

        return docx_bytes.getvalue()

    async def generate_pdf_from_html(
        self,
        template_name: str,
        data: Dict[str, Any]
    ) -> bytes:
        """
        Generate PDF from HTML template using weasyprint.

        Args:
            template_name: Name of .html template file
            data: Dictionary with data to inject into template

        Returns:
            PDF file as bytes
        """
        # Render HTML template
        template = self.jinja_env.get_template(template_name)
        html_content = template.render(**data)

        # Convert to PDF
        pdf_bytes = BytesIO()
        HTML(string=html_content).write_pdf(pdf_bytes)
        pdf_bytes.seek(0)

        return pdf_bytes.getvalue()

    async def generate_excel(
        self,
        template_name: str,
        data: Dict[str, Any]
    ) -> bytes:
        """
        Generate Excel file from template.

        Args:
            template_name: Name of .xlsx template file
            data: Dictionary with data to populate Excel

        Returns:
            Excel file as bytes
        """
        template_path = self.template_dir / template_name

        # Load template
        wb = openpyxl.load_workbook(str(template_path))
        ws = wb.active

        # For simple data lists (e.g., customer list)
        if "rows" in data:
            start_row = data.get("start_row", 2)  # Default to row 2 (after header)

            for i, row_data in enumerate(data["rows"], start=start_row):
                for col_idx, value in enumerate(row_data.values(), start=1):
                    ws.cell(row=i, column=col_idx, value=value)

        # Save to BytesIO
        excel_bytes = BytesIO()
        wb.save(excel_bytes)
        excel_bytes.seek(0)

        return excel_bytes.getvalue()

    async def generate_simple_excel(
        self,
        headers: list[str],
        rows: list[list[Any]],
        sheet_name: str = "Sheet1"
    ) -> bytes:
        """
        Generate Excel file from scratch (no template).

        Args:
            headers: Column headers
            rows: Data rows
            sheet_name: Name of the Excel sheet

        Returns:
            Excel file as bytes
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name

        # Write headers
        for col_idx, header in enumerate(headers, start=1):
            ws.cell(row=1, column=col_idx, value=header)

        # Write data rows
        for row_idx, row in enumerate(rows, start=2):
            for col_idx, value in enumerate(row, start=1):
                ws.cell(row=row_idx, column=col_idx, value=value)

        # Save to BytesIO
        excel_bytes = BytesIO()
        wb.save(excel_bytes)
        excel_bytes.seek(0)

        return excel_bytes.getvalue()

"""PDF Generator Service for pdfme templates.

This service generates PDFs from pdfme template JSON structures.
It supports text, images, barcodes (Code128, EAN13, Code39), and QR codes.
"""
import base64
import logging
from io import BytesIO
from typing import Dict, Any, List, Optional, Tuple

from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

import barcode
from barcode.writer import ImageWriter
import qrcode
from PIL import Image

logger = logging.getLogger(__name__)


class PdfmeGeneratorService:
    """Generate PDFs from pdfme template JSON structures."""

    def __init__(self):
        self._fonts_registered = False

    def _register_fonts(self):
        """Register custom fonts for Norwegian character support."""
        if self._fonts_registered:
            return

        # ReportLab's built-in Helvetica supports basic Latin characters
        # For full Norwegian support, we'd register DejaVuSans if available
        # For now, use Helvetica which handles æøå in most cases
        self._fonts_registered = True

    def generate_pdf(
        self,
        template_json: Dict[str, Any],
        inputs: Dict[str, Any],
        width_mm: float = 100,
        height_mm: float = 50
    ) -> bytes:
        """
        Generate a single label PDF from pdfme template.

        Args:
            template_json: pdfme template structure with schemas
            inputs: Dictionary of field values
            width_mm: Label width in millimeters
            height_mm: Label height in millimeters

        Returns:
            PDF as bytes
        """
        self._register_fonts()

        buffer = BytesIO()
        page_size = (width_mm * mm, height_mm * mm)

        c = canvas.Canvas(buffer, pagesize=page_size)

        # Parse and render schemas
        # pdfme v4 format: schemas is an array of objects where each object is a page
        # Each page object has field names as keys and schema configs as values
        schemas = template_json.get("schemas", [{}])
        if schemas and len(schemas) > 0:
            page_schemas = schemas[0]  # First page schemas (dict)
            # Iterate over field names and their schema configs
            for field_name, schema_config in page_schemas.items():
                if isinstance(schema_config, dict):
                    # Add the field name to schema for reference
                    schema_with_name = {**schema_config, "name": field_name}
                    self._render_element(c, schema_with_name, inputs, height_mm)

        c.save()
        buffer.seek(0)
        return buffer.getvalue()

    def generate_pdf_batch(
        self,
        template_json: Dict[str, Any],
        inputs_list: List[Dict[str, Any]],
        width_mm: float = 100,
        height_mm: float = 50
    ) -> bytes:
        """
        Generate multiple labels in a single PDF.

        Args:
            template_json: pdfme template structure with schemas
            inputs_list: List of input dictionaries, one per label
            width_mm: Label width in millimeters
            height_mm: Label height in millimeters

        Returns:
            PDF as bytes with multiple pages
        """
        self._register_fonts()

        buffer = BytesIO()
        page_size = (width_mm * mm, height_mm * mm)

        c = canvas.Canvas(buffer, pagesize=page_size)

        schemas = template_json.get("schemas", [{}])
        page_schemas = schemas[0] if schemas else {}

        for i, inputs in enumerate(inputs_list):
            if i > 0:
                c.showPage()

            for field_name, schema_config in page_schemas.items():
                if isinstance(schema_config, dict):
                    schema_with_name = {**schema_config, "name": field_name}
                    self._render_element(c, schema_with_name, inputs, height_mm)

        c.save()
        buffer.seek(0)
        return buffer.getvalue()

    def _render_element(
        self,
        c: canvas.Canvas,
        schema: Dict[str, Any],
        inputs: Dict[str, Any],
        page_height_mm: float
    ):
        """Render a single element based on its type."""
        element_type = schema.get("type", "text")
        name = schema.get("name", "")

        # Get value from inputs or use empty string
        value = inputs.get(name, "")
        if value is None:
            value = ""

        # Get position (pdfme uses top-left origin, ReportLab uses bottom-left)
        position = schema.get("position", {"x": 0, "y": 0})
        x = position.get("x", 0) * mm
        # Convert Y coordinate (pdfme: top-down, ReportLab: bottom-up)
        y = (page_height_mm - position.get("y", 0)) * mm

        width = schema.get("width", 50) * mm
        height = schema.get("height", 10) * mm

        try:
            if element_type == "text":
                self._render_text(c, schema, x, y, width, height, str(value))
            elif element_type == "image":
                self._render_image(c, schema, x, y, width, height, str(value))
            elif element_type == "qrcode":
                self._render_qr(c, x, y, width, height, str(value))
            elif element_type in ["code128", "ean13", "code39", "barcode"]:
                barcode_type = element_type if element_type != "barcode" else "code128"
                self._render_barcode(c, x, y, width, height, str(value), barcode_type)
            elif element_type == "line":
                self._render_line(c, schema, x, y, width)
            elif element_type == "rectangle":
                self._render_rectangle(c, schema, x, y, width, height)
        except Exception as e:
            logger.warning(f"Failed to render element '{name}' of type '{element_type}': {e}")

    def _parse_rich_text(self, text: str) -> List[Tuple[str, bool]]:
        """
        Parse text with <b>...</b> tags into segments.

        Returns list of (text, is_bold) tuples.
        Example: "normal <b>bold</b> text" -> [("normal ", False), ("bold", True), (" text", False)]
        """
        import re
        segments = []
        pattern = r'<b>(.*?)</b>'

        last_end = 0
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Add text before the bold tag
            if match.start() > last_end:
                segments.append((text[last_end:match.start()], False))
            # Add bold text
            segments.append((match.group(1), True))
            last_end = match.end()

        # Add remaining text after last bold tag
        if last_end < len(text):
            segments.append((text[last_end:], False))

        # If no tags found, return original text
        if not segments:
            segments.append((text, False))

        return segments

    def _wrap_text_with_rich(
        self,
        c: canvas.Canvas,
        text: str,
        width: float,
        font_size: float,
        get_font_name: callable
    ) -> List[List[Tuple[str, bool]]]:
        """
        Wrap text with <b> tags to fit within width.
        Returns list of lines, where each line is a list of (text, is_bold) segments.
        """
        segments = self._parse_rich_text(text)
        lines = []
        current_line = []
        current_width = 0

        for segment_text, is_bold in segments:
            font_name = get_font_name(is_bold, False)
            words = segment_text.split(' ')

            for i, word in enumerate(words):
                # Add space before word if not first word in segment or line
                if i > 0 or (current_line and current_line[-1][0] and not current_line[-1][0].endswith(' ')):
                    word_with_space = ' ' + word
                else:
                    word_with_space = word

                word_width = c.stringWidth(word_with_space, font_name, font_size)

                if current_width + word_width <= width or not current_line:
                    # Word fits on current line
                    if current_line and current_line[-1][1] == is_bold:
                        # Merge with previous segment of same style
                        current_line[-1] = (current_line[-1][0] + word_with_space, is_bold)
                    else:
                        current_line.append((word_with_space, is_bold))
                    current_width += word_width
                else:
                    # Start new line
                    if current_line:
                        lines.append(current_line)
                    current_line = [(word, is_bold)]
                    current_width = c.stringWidth(word, font_name, font_size)

        if current_line:
            lines.append(current_line)

        return lines

    def _render_text(
        self,
        c: canvas.Canvas,
        schema: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
        value: str
    ):
        """Render text element with styling, supporting inline <b> tags for bold and word wrap."""
        if not value:
            return

        # Get styling
        font_size = schema.get("fontSize", 12)
        font_color = schema.get("fontColor", "#000000")
        alignment = schema.get("alignment", "left")
        base_font = schema.get("fontName", "Helvetica")

        # Handle schema-level bold/italic
        schema_bold = schema.get("fontWeight") == "bold" or schema.get("bold")
        schema_italic = schema.get("fontStyle") == "italic" or schema.get("italic")

        def get_font_name(bold: bool, italic: bool) -> str:
            """Get appropriate font name based on style."""
            is_bold = bold or schema_bold
            is_italic = italic or schema_italic

            if is_bold and is_italic:
                return "Helvetica-BoldOblique"
            elif is_bold:
                return "Helvetica-Bold"
            elif is_italic:
                return "Helvetica-Oblique"
            return "Helvetica"

        # Set color
        r, g, b = self._hex_to_rgb(font_color)
        c.setFillColorRGB(r, g, b)

        # Calculate text position based on alignment
        text_y = y - font_size  # Adjust for text baseline
        line_height = font_size * 1.2

        # Handle explicit newlines first, then wrap each paragraph
        paragraphs = value.split("\n")
        current_y = text_y

        for paragraph in paragraphs:
            if current_y < (y - height):
                break

            # Wrap this paragraph
            wrapped_lines = self._wrap_text_with_rich(c, paragraph, width, font_size, get_font_name)

            for line_segments in wrapped_lines:
                if current_y < (y - height):
                    break

                # Calculate total width for alignment
                total_width = 0
                for text, is_bold in line_segments:
                    font_name = get_font_name(is_bold, False)
                    total_width += c.stringWidth(text, font_name, font_size)

                # Determine starting x position
                if alignment == "center":
                    text_x = x + (width - total_width) / 2
                elif alignment == "right":
                    text_x = x + width - total_width
                else:
                    text_x = x

                # Render each segment
                for text, is_bold in line_segments:
                    font_name = get_font_name(is_bold, False)
                    c.setFont(font_name, font_size)
                    c.drawString(text_x, current_y, text)
                    text_x += c.stringWidth(text, font_name, font_size)

                current_y -= line_height

    def _render_barcode(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        width: float,
        height: float,
        value: str,
        barcode_type: str = "code128"
    ):
        """Render barcode element."""
        if not value:
            return

        try:
            # Generate barcode image
            barcode_img = self._generate_barcode_image(value, barcode_type)
            if barcode_img:
                # Draw barcode
                img_reader = ImageReader(barcode_img)
                c.drawImage(
                    img_reader,
                    x,
                    y - height,
                    width=width,
                    height=height,
                    preserveAspectRatio=True,
                    anchor='nw'
                )
        except Exception as e:
            logger.warning(f"Failed to generate barcode: {e}")
            # Draw placeholder text
            c.setFont("Helvetica", 8)
            c.drawString(x, y - 10, f"[Barcode: {value}]")

    def _generate_barcode_image(self, data: str, barcode_type: str) -> Optional[BytesIO]:
        """Generate barcode as PNG image in memory."""
        try:
            # Map barcode types
            type_mapping = {
                "code128": "code128",
                "ean13": "ean13",
                "ean8": "ean8",
                "code39": "code39",
                "upca": "upca",
            }

            bc_type = type_mapping.get(barcode_type.lower(), "code128")

            # Get barcode class
            bc_class = barcode.get_barcode_class(bc_type)

            # Create barcode with ImageWriter
            bc = bc_class(data, writer=ImageWriter())

            # Write to buffer
            buffer = BytesIO()
            bc.write(buffer, options={
                "write_text": False,  # Don't include text below barcode
                "module_width": 0.4,
                "module_height": 15,
                "quiet_zone": 2,
            })
            buffer.seek(0)

            return buffer

        except Exception as e:
            logger.warning(f"Barcode generation failed for {barcode_type}: {e}")
            return None

    def _render_qr(
        self,
        c: canvas.Canvas,
        x: float,
        y: float,
        width: float,
        height: float,
        value: str
    ):
        """Render QR code element."""
        if not value:
            return

        try:
            # Generate QR code
            qr_img = self._generate_qr_image(value)
            if qr_img:
                img_reader = ImageReader(qr_img)
                # Use smaller dimension for square QR
                size = min(width, height)
                c.drawImage(
                    img_reader,
                    x,
                    y - size,
                    width=size,
                    height=size,
                    preserveAspectRatio=True
                )
        except Exception as e:
            logger.warning(f"Failed to generate QR code: {e}")
            c.setFont("Helvetica", 8)
            c.drawString(x, y - 10, f"[QR: {value[:20]}...]")

    def _generate_qr_image(self, data: str) -> Optional[BytesIO]:
        """Generate QR code as PNG image in memory."""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=10,
                border=1,
            )
            qr.add_data(data)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")

            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)

            return buffer

        except Exception as e:
            logger.warning(f"QR code generation failed: {e}")
            return None

    def _render_image(
        self,
        c: canvas.Canvas,
        schema: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float,
        value: str
    ):
        """Render image element (base64 or URL)."""
        if not value:
            return

        try:
            img_data = None

            if value.startswith("data:image"):
                # Base64 encoded image
                # Format: data:image/png;base64,<data>
                parts = value.split(",", 1)
                if len(parts) == 2:
                    img_bytes = base64.b64decode(parts[1])
                    img_data = BytesIO(img_bytes)
            elif value.startswith("http"):
                # URL - would need to fetch, skip for now
                logger.info(f"URL images not yet supported: {value[:50]}")
                return
            else:
                # Try as raw base64
                try:
                    img_bytes = base64.b64decode(value)
                    img_data = BytesIO(img_bytes)
                except Exception:
                    return

            if img_data:
                img_reader = ImageReader(img_data)
                c.drawImage(
                    img_reader,
                    x,
                    y - height,
                    width=width,
                    height=height,
                    preserveAspectRatio=True,
                    anchor='nw'
                )

        except Exception as e:
            logger.warning(f"Failed to render image: {e}")

    def _render_line(
        self,
        c: canvas.Canvas,
        schema: Dict[str, Any],
        x: float,
        y: float,
        width: float
    ):
        """Render a horizontal line."""
        color = schema.get("color", "#000000")
        stroke_width = schema.get("strokeWidth", 1)

        r, g, b = self._hex_to_rgb(color)
        c.setStrokeColorRGB(r, g, b)
        c.setLineWidth(stroke_width)

        c.line(x, y, x + width, y)

    def _render_rectangle(
        self,
        c: canvas.Canvas,
        schema: Dict[str, Any],
        x: float,
        y: float,
        width: float,
        height: float
    ):
        """Render a rectangle."""
        border_color = schema.get("borderColor", "#000000")
        fill_color = schema.get("color", None)  # pdfme uses "color" for fill
        # pdfme uses "borderWidth", fallback to "strokeWidth"
        stroke_width = schema.get("borderWidth", schema.get("strokeWidth", 1))

        c.setLineWidth(stroke_width)

        # Border color
        r, g, b = self._hex_to_rgb(border_color)
        c.setStrokeColorRGB(r, g, b)

        if fill_color:
            r, g, b = self._hex_to_rgb(fill_color)
            c.setFillColorRGB(r, g, b)
            c.rect(x, y - height, width, height, fill=1, stroke=1)
        else:
            c.rect(x, y - height, width, height, fill=0, stroke=1)

    def _hex_to_rgb(self, hex_color: str) -> Tuple[float, float, float]:
        """Convert hex color to RGB tuple (0-1 range)."""
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 3:
            hex_color = "".join([c * 2 for c in hex_color])

        try:
            r = int(hex_color[0:2], 16) / 255.0
            g = int(hex_color[2:4], 16) / 255.0
            b = int(hex_color[4:6], 16) / 255.0
            return (r, g, b)
        except (ValueError, IndexError):
            return (0.0, 0.0, 0.0)  # Default to black

    def generate_preview_png(
        self,
        template_json: Dict[str, Any],
        inputs: Dict[str, Any],
        width_mm: float = 100,
        height_mm: float = 50,
        scale: float = 2.0
    ) -> bytes:
        """
        Generate a PNG preview of the label.

        Args:
            template_json: pdfme template structure
            inputs: Dictionary of field values
            width_mm: Label width in millimeters
            height_mm: Label height in millimeters
            scale: Scale factor for preview resolution

        Returns:
            PNG image as bytes
        """
        try:
            # First generate PDF
            pdf_bytes = self.generate_pdf(template_json, inputs, width_mm, height_mm)

            # Convert PDF to PNG using pdf2image if available
            # For now, return the PDF as-is and let frontend handle preview
            # This is a placeholder - in production you'd use pdf2image or similar
            return pdf_bytes

        except Exception as e:
            logger.error(f"Preview generation failed: {e}")
            raise


# Singleton instance
_pdfme_generator = None


def get_pdfme_generator() -> PdfmeGeneratorService:
    """Get or create the pdfme generator singleton."""
    global _pdfme_generator
    if _pdfme_generator is None:
        _pdfme_generator = PdfmeGeneratorService()
    return _pdfme_generator

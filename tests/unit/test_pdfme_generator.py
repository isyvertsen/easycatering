"""Unit tests for pdfme PDF generator service."""
import pytest
from app.services.pdfme_generator import PdfmeGeneratorService, get_pdfme_generator


class TestPdfmeGeneratorService:
    """Test suite for PdfmeGeneratorService."""

    @pytest.fixture
    def generator(self):
        """Create a fresh generator instance."""
        return PdfmeGeneratorService()

    @pytest.fixture
    def simple_template(self):
        """Simple template with text element."""
        return {
            "schemas": [[
                {
                    "name": "title",
                    "type": "text",
                    "position": {"x": 10, "y": 10},
                    "width": 80,
                    "height": 10,
                    "fontSize": 14,
                    "fontColor": "#000000"
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

    @pytest.fixture
    def barcode_template(self):
        """Template with barcode element."""
        return {
            "schemas": [[
                {
                    "name": "barcode",
                    "type": "code128",
                    "position": {"x": 10, "y": 20},
                    "width": 80,
                    "height": 15
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

    @pytest.fixture
    def qr_template(self):
        """Template with QR code element."""
        return {
            "schemas": [[
                {
                    "name": "qr",
                    "type": "qrcode",
                    "position": {"x": 35, "y": 10},
                    "width": 30,
                    "height": 30
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

    @pytest.fixture
    def complex_template(self):
        """Complex template with multiple elements."""
        return {
            "schemas": [[
                {
                    "name": "title",
                    "type": "text",
                    "position": {"x": 5, "y": 5},
                    "width": 90,
                    "height": 8,
                    "fontSize": 14,
                    "fontWeight": "bold",
                    "alignment": "center"
                },
                {
                    "name": "description",
                    "type": "text",
                    "position": {"x": 5, "y": 15},
                    "width": 50,
                    "height": 8,
                    "fontSize": 10
                },
                {
                    "name": "barcode",
                    "type": "code128",
                    "position": {"x": 5, "y": 25},
                    "width": 50,
                    "height": 12
                },
                {
                    "name": "qr",
                    "type": "qrcode",
                    "position": {"x": 60, "y": 15},
                    "width": 25,
                    "height": 25
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

    def test_generate_pdf_simple_text(self, generator, simple_template):
        """Test PDF generation with simple text."""
        inputs = {"title": "Test Produkt"}

        pdf_bytes = generator.generate_pdf(
            simple_template,
            inputs,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert len(pdf_bytes) > 0
        # PDF should start with %PDF
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_with_barcode(self, generator, barcode_template):
        """Test PDF generation with barcode."""
        inputs = {"barcode": "1234567890"}

        pdf_bytes = generator.generate_pdf(
            barcode_template,
            inputs,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_with_qr(self, generator, qr_template):
        """Test PDF generation with QR code."""
        inputs = {"qr": "https://example.com/product/123"}

        pdf_bytes = generator.generate_pdf(
            qr_template,
            inputs,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_complex(self, generator, complex_template):
        """Test PDF generation with complex template."""
        inputs = {
            "title": "Premium Produkt",
            "description": "Beste kvalitet",
            "barcode": "7041234567890",
            "qr": "https://example.com"
        }

        pdf_bytes = generator.generate_pdf(
            complex_template,
            inputs,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_empty_inputs(self, generator, simple_template):
        """Test PDF generation with empty inputs."""
        inputs = {}

        pdf_bytes = generator.generate_pdf(
            simple_template,
            inputs,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_missing_field(self, generator, simple_template):
        """Test PDF generation with missing field in inputs."""
        inputs = {"nonexistent_field": "value"}

        pdf_bytes = generator.generate_pdf(
            simple_template,
            inputs,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_batch(self, generator, simple_template):
        """Test batch PDF generation."""
        inputs_list = [
            {"title": "Produkt 1"},
            {"title": "Produkt 2"},
            {"title": "Produkt 3"},
        ]

        pdf_bytes = generator.generate_pdf_batch(
            simple_template,
            inputs_list,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b'%PDF'

    def test_generate_pdf_batch_empty_list(self, generator, simple_template):
        """Test batch PDF generation with empty list."""
        inputs_list = []

        pdf_bytes = generator.generate_pdf_batch(
            simple_template,
            inputs_list,
            width_mm=100,
            height_mm=50
        )

        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_different_label_sizes(self, generator, simple_template):
        """Test PDF generation with different label sizes."""
        inputs = {"title": "Test"}
        sizes = [
            (50, 25),
            (100, 50),
            (104, 127),
            (76, 51),
        ]

        for width, height in sizes:
            pdf_bytes = generator.generate_pdf(
                simple_template,
                inputs,
                width_mm=width,
                height_mm=height
            )
            assert pdf_bytes is not None
            assert pdf_bytes[:4] == b'%PDF'

    def test_text_alignment(self, generator):
        """Test text alignment options."""
        alignments = ["left", "center", "right"]

        for alignment in alignments:
            template = {
                "schemas": [[
                    {
                        "name": "text",
                        "type": "text",
                        "position": {"x": 10, "y": 10},
                        "width": 80,
                        "height": 10,
                        "alignment": alignment
                    }
                ]],
                "basePdf": {"width": 100, "height": 50}
            }

            pdf_bytes = generator.generate_pdf(
                template,
                {"text": "Aligned Text"},
                width_mm=100,
                height_mm=50
            )
            assert pdf_bytes is not None
            assert pdf_bytes[:4] == b'%PDF'

    def test_text_styling(self, generator):
        """Test text styling (bold, italic)."""
        template = {
            "schemas": [[
                {
                    "name": "bold_text",
                    "type": "text",
                    "position": {"x": 10, "y": 10},
                    "width": 80,
                    "height": 10,
                    "fontWeight": "bold"
                },
                {
                    "name": "italic_text",
                    "type": "text",
                    "position": {"x": 10, "y": 20},
                    "width": 80,
                    "height": 10,
                    "fontStyle": "italic"
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

        pdf_bytes = generator.generate_pdf(
            template,
            {"bold_text": "Bold", "italic_text": "Italic"},
            width_mm=100,
            height_mm=50
        )
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_hex_color_conversion(self, generator):
        """Test hex color conversion."""
        # Test full hex
        r, g, b = generator._hex_to_rgb("#FF0000")
        assert r == 1.0
        assert g == 0.0
        assert b == 0.0

        # Test short hex
        r, g, b = generator._hex_to_rgb("#F00")
        assert r == 1.0
        assert g == 0.0
        assert b == 0.0

        # Test without hash
        r, g, b = generator._hex_to_rgb("00FF00")
        assert r == 0.0
        assert g == 1.0
        assert b == 0.0

        # Test invalid color defaults to black
        r, g, b = generator._hex_to_rgb("invalid")
        assert r == 0.0
        assert g == 0.0
        assert b == 0.0

    def test_barcode_types(self, generator):
        """Test different barcode types."""
        barcode_types = ["code128", "code39"]

        for bc_type in barcode_types:
            template = {
                "schemas": [[
                    {
                        "name": "bc",
                        "type": bc_type,
                        "position": {"x": 10, "y": 10},
                        "width": 80,
                        "height": 20
                    }
                ]],
                "basePdf": {"width": 100, "height": 50}
            }

            pdf_bytes = generator.generate_pdf(
                template,
                {"bc": "123456"},
                width_mm=100,
                height_mm=50
            )
            assert pdf_bytes is not None
            assert pdf_bytes[:4] == b'%PDF'

    def test_ean13_barcode(self, generator):
        """Test EAN13 barcode (requires 13 digits)."""
        template = {
            "schemas": [[
                {
                    "name": "ean",
                    "type": "ean13",
                    "position": {"x": 10, "y": 10},
                    "width": 80,
                    "height": 20
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

        # EAN13 needs 12-13 digits
        pdf_bytes = generator.generate_pdf(
            template,
            {"ean": "5901234123457"},
            width_mm=100,
            height_mm=50
        )
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_multiline_text(self, generator):
        """Test multiline text rendering."""
        template = {
            "schemas": [[
                {
                    "name": "multiline",
                    "type": "text",
                    "position": {"x": 10, "y": 10},
                    "width": 80,
                    "height": 30,
                    "fontSize": 10
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

        pdf_bytes = generator.generate_pdf(
            template,
            {"multiline": "Line 1\nLine 2\nLine 3"},
            width_mm=100,
            height_mm=50
        )
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_norwegian_characters(self, generator):
        """Test Norwegian character support (æøå)."""
        template = {
            "schemas": [[
                {
                    "name": "norwegian",
                    "type": "text",
                    "position": {"x": 10, "y": 10},
                    "width": 80,
                    "height": 10
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

        pdf_bytes = generator.generate_pdf(
            template,
            {"norwegian": "Blåbær og grønnsaker på lørdag"},
            width_mm=100,
            height_mm=50
        )
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_singleton_instance(self):
        """Test that get_pdfme_generator returns singleton."""
        gen1 = get_pdfme_generator()
        gen2 = get_pdfme_generator()
        assert gen1 is gen2

    def test_empty_template(self, generator):
        """Test with empty template schemas."""
        template = {
            "schemas": [[]],
            "basePdf": {"width": 100, "height": 50}
        }

        pdf_bytes = generator.generate_pdf(
            template,
            {},
            width_mm=100,
            height_mm=50
        )
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_rectangle_element(self, generator):
        """Test rectangle element rendering."""
        template = {
            "schemas": [[
                {
                    "name": "rect",
                    "type": "rectangle",
                    "position": {"x": 10, "y": 10},
                    "width": 30,
                    "height": 20,
                    "borderColor": "#FF0000",
                    "backgroundColor": "#FFFF00"
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

        pdf_bytes = generator.generate_pdf(template, {}, width_mm=100, height_mm=50)
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'

    def test_line_element(self, generator):
        """Test line element rendering."""
        template = {
            "schemas": [[
                {
                    "name": "line",
                    "type": "line",
                    "position": {"x": 10, "y": 25},
                    "width": 80,
                    "height": 1,
                    "color": "#000000",
                    "strokeWidth": 2
                }
            ]],
            "basePdf": {"width": 100, "height": 50}
        }

        pdf_bytes = generator.generate_pdf(template, {}, width_mm=100, height_mm=50)
        assert pdf_bytes is not None
        assert pdf_bytes[:4] == b'%PDF'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

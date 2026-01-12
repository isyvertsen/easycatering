"""Test label templates API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.infrastructure.database.session import AsyncSessionLocal
from sqlalchemy import select, text
from app.models.label_template import LabelTemplate, TemplateParameter, PrintHistory


class TestLabelTemplatesAPI:
    """Test suite for label templates API endpoints."""

    @pytest.fixture
    async def async_client(self):
        """Create an async HTTP client for testing."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    @pytest.fixture
    def sample_template_data(self):
        """Sample template data for testing."""
        return {
            "name": "Test Etikett",
            "description": "Test beskrivelse",
            "template_json": {
                "schemas": [[
                    {
                        "name": "produktnavn",
                        "type": "text",
                        "position": {"x": 10, "y": 10},
                        "width": 80,
                        "height": 10,
                        "fontSize": 14,
                        "fontColor": "#000000",
                        "alignment": "left"
                    },
                    {
                        "name": "strekkode",
                        "type": "code128",
                        "position": {"x": 10, "y": 25},
                        "width": 80,
                        "height": 15
                    }
                ]],
                "basePdf": {"width": 100, "height": 50}
            },
            "width_mm": 100,
            "height_mm": 50,
            "is_global": False,
            "parameters": [
                {
                    "field_name": "produktnavn",
                    "display_name": "Produktnavn",
                    "parameter_type": "text",
                    "source_type": "manual",
                    "is_required": True,
                    "sort_order": 0
                },
                {
                    "field_name": "strekkode",
                    "display_name": "Strekkode",
                    "parameter_type": "barcode",
                    "source_type": "manual",
                    "is_required": True,
                    "sort_order": 1
                }
            ]
        }

    @pytest.mark.asyncio
    async def test_get_label_templates_list(self, async_client):
        """Test GET /label-templates endpoint."""
        response = await async_client.get(
            "/api/v1/label-templates/",
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_create_label_template(self, async_client, sample_template_data):
        """Test POST /label-templates endpoint."""
        response = await async_client.post(
            "/api/v1/label-templates/",
            json=sample_template_data,
            follow_redirects=True
        )
        assert response.status_code in [200, 201]
        data = response.json()

        assert "id" in data
        assert data["name"] == sample_template_data["name"]
        assert data["description"] == sample_template_data["description"]
        assert data["width_mm"] == sample_template_data["width_mm"]
        assert data["height_mm"] == sample_template_data["height_mm"]
        assert len(data.get("parameters", [])) == 2

        # Store ID for cleanup
        return data["id"]

    @pytest.mark.asyncio
    async def test_get_label_template_by_id(self, async_client, sample_template_data):
        """Test GET /label-templates/{id} endpoint."""
        # First create a template
        create_response = await async_client.post(
            "/api/v1/label-templates/",
            json=sample_template_data,
            follow_redirects=True
        )
        assert create_response.status_code in [200, 201]
        template_id = create_response.json()["id"]

        # Then get it by ID
        response = await async_client.get(
            f"/api/v1/label-templates/{template_id}",
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()

        assert data["id"] == template_id
        assert data["name"] == sample_template_data["name"]
        assert "template_json" in data
        assert "schemas" in data["template_json"]

    @pytest.mark.asyncio
    async def test_update_label_template(self, async_client, sample_template_data):
        """Test PUT /label-templates/{id} endpoint."""
        # Create template
        create_response = await async_client.post(
            "/api/v1/label-templates/",
            json=sample_template_data,
            follow_redirects=True
        )
        template_id = create_response.json()["id"]

        # Update template
        update_data = {
            "name": "Oppdatert Etikett",
            "description": "Oppdatert beskrivelse"
        }
        response = await async_client.put(
            f"/api/v1/label-templates/{template_id}",
            json=update_data,
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "Oppdatert Etikett"
        assert data["description"] == "Oppdatert beskrivelse"

    @pytest.mark.asyncio
    async def test_delete_label_template(self, async_client, sample_template_data):
        """Test DELETE /label-templates/{id} endpoint."""
        # Create template
        create_response = await async_client.post(
            "/api/v1/label-templates/",
            json=sample_template_data,
            follow_redirects=True
        )
        template_id = create_response.json()["id"]

        # Delete template
        response = await async_client.delete(
            f"/api/v1/label-templates/{template_id}",
            follow_redirects=True
        )
        assert response.status_code in [200, 204]

        # Verify deleted
        get_response = await async_client.get(
            f"/api/v1/label-templates/{template_id}",
            follow_redirects=True
        )
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_template(self, async_client):
        """Test GET for non-existent template returns 404."""
        response = await async_client.get(
            "/api/v1/label-templates/99999999",
            follow_redirects=True
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_template_invalid_data(self, async_client):
        """Test POST with invalid data returns 422."""
        invalid_data = {
            "name": "",  # Empty name
            "template_json": {}  # Empty template
        }
        response = await async_client.post(
            "/api/v1/label-templates/",
            json=invalid_data,
            follow_redirects=True
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_template_with_parameters(self, async_client, sample_template_data):
        """Test template parameters are correctly stored and retrieved."""
        response = await async_client.post(
            "/api/v1/label-templates/",
            json=sample_template_data,
            follow_redirects=True
        )
        assert response.status_code in [200, 201]
        data = response.json()

        parameters = data.get("parameters", [])
        assert len(parameters) == 2

        # Check parameter fields
        param_names = [p["field_name"] for p in parameters]
        assert "produktnavn" in param_names
        assert "strekkode" in param_names

        # Check parameter properties
        for param in parameters:
            if param["field_name"] == "produktnavn":
                assert param["parameter_type"] == "text"
                assert param["is_required"] == True
            elif param["field_name"] == "strekkode":
                assert param["parameter_type"] == "barcode"


class TestLabelsPDFGeneration:
    """Test suite for PDF generation endpoints."""

    @pytest.fixture
    async def async_client(self):
        """Create an async HTTP client for testing."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    @pytest.fixture
    def preview_request_data(self):
        """Sample preview request data."""
        return {
            "template_json": {
                "schemas": [[
                    {
                        "name": "title",
                        "type": "text",
                        "position": {"x": 10, "y": 10},
                        "width": 80,
                        "height": 10,
                        "fontSize": 16,
                        "fontColor": "#000000"
                    }
                ]],
                "basePdf": {"width": 100, "height": 50}
            },
            "inputs": {"title": "Test Produkt"},
            "width_mm": 100,
            "height_mm": 50
        }

    @pytest.mark.asyncio
    async def test_preview_label(self, async_client, preview_request_data):
        """Test POST /labels/preview endpoint."""
        response = await async_client.post(
            "/api/v1/labels/preview",
            json=preview_request_data,
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()

        assert "preview" in data
        assert "content_type" in data
        # Preview should be base64 encoded
        assert len(data["preview"]) > 0

    @pytest.mark.asyncio
    async def test_preview_with_barcode(self, async_client):
        """Test preview with barcode element."""
        request_data = {
            "template_json": {
                "schemas": [[
                    {
                        "name": "barcode",
                        "type": "code128",
                        "position": {"x": 10, "y": 10},
                        "width": 80,
                        "height": 20
                    }
                ]],
                "basePdf": {"width": 100, "height": 50}
            },
            "inputs": {"barcode": "1234567890"},
            "width_mm": 100,
            "height_mm": 50
        }

        response = await async_client.post(
            "/api/v1/labels/preview",
            json=request_data,
            follow_redirects=True
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_preview_with_qr(self, async_client):
        """Test preview with QR code element."""
        request_data = {
            "template_json": {
                "schemas": [[
                    {
                        "name": "qr",
                        "type": "qrcode",
                        "position": {"x": 10, "y": 10},
                        "width": 30,
                        "height": 30
                    }
                ]],
                "basePdf": {"width": 100, "height": 50}
            },
            "inputs": {"qr": "https://example.com"},
            "width_mm": 100,
            "height_mm": 50
        }

        response = await async_client.post(
            "/api/v1/labels/preview",
            json=request_data,
            follow_redirects=True
        )
        assert response.status_code == 200


class TestDataSources:
    """Test suite for data source endpoints."""

    @pytest.fixture
    async def async_client(self):
        """Create an async HTTP client for testing."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    @pytest.mark.asyncio
    async def test_get_tables(self, async_client):
        """Test GET /label-templates/sources/tables endpoint."""
        response = await async_client.get(
            "/api/v1/label-templates/sources/tables",
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least some tables
        if len(data) > 0:
            assert isinstance(data[0], str)

    @pytest.mark.asyncio
    async def test_get_columns(self, async_client):
        """Test GET /label-templates/sources/columns endpoint."""
        # First get tables
        tables_response = await async_client.get(
            "/api/v1/label-templates/sources/tables",
            follow_redirects=True
        )
        tables = tables_response.json()

        if len(tables) > 0:
            # Get columns for first table
            response = await async_client.get(
                f"/api/v1/label-templates/sources/columns?table={tables[0]}",
                follow_redirects=True
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            if len(data) > 0:
                assert "name" in data[0]
                assert "type" in data[0]


class TestPrintHistory:
    """Test suite for print history endpoints."""

    @pytest.fixture
    async def async_client(self):
        """Create an async HTTP client for testing."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    @pytest.mark.asyncio
    async def test_get_print_history(self, async_client):
        """Test GET /label-templates/print-history endpoint."""
        response = await async_client.get(
            "/api/v1/label-templates/print-history/",
            follow_redirects=True
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_log_print_history(self, async_client):
        """Test POST /label-templates/print-history endpoint."""
        # First we need a template
        template_data = {
            "name": "Print Test Template",
            "template_json": {"schemas": [[]], "basePdf": {"width": 100, "height": 50}},
            "width_mm": 100,
            "height_mm": 50
        }
        create_response = await async_client.post(
            "/api/v1/label-templates/",
            json=template_data,
            follow_redirects=True
        )

        if create_response.status_code in [200, 201]:
            template_id = create_response.json()["id"]

            # Log print
            log_data = {
                "template_id": template_id,
                "printer_name": "Test Printer",
                "input_data": {"title": "Test"},
                "copies": 1,
                "status": "success"
            }

            response = await async_client.post(
                "/api/v1/label-templates/print-history",
                json=log_data,
                follow_redirects=True
            )
            assert response.status_code in [200, 201]


def test_sync_runner():
    """Synchronous test runner for pytest."""
    import asyncio

    async def run_tests():
        print("\n" + "="*60)
        print("TESTING LABEL TEMPLATES API ENDPOINTS")
        print("="*60)

        test_suite = TestLabelTemplatesAPI()

        try:
            print("\n1. Testing templates list...")
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                await test_suite.test_get_label_templates_list(client)
            print("   ✓ Templates list endpoint works")

            print("\n2. Testing PDF preview...")
            pdf_tests = TestLabelsPDFGeneration()
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                await pdf_tests.test_preview_label(client, pdf_tests.preview_request_data(pdf_tests))
            print("   ✓ PDF preview works")

            print("\n3. Testing data sources...")
            ds_tests = TestDataSources()
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                await ds_tests.test_get_tables(client)
            print("   ✓ Data sources work")

            print("\n" + "="*60)
            print("ALL TESTS PASSED ✓")
            print("="*60)

        except Exception as e:
            print(f"\n✗ TEST FAILED: {e}")
            raise

    asyncio.run(run_tests())


if __name__ == "__main__":
    test_sync_runner()

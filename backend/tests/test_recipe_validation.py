"""Tests for recipe validation service."""
import pytest
from unittest.mock import AsyncMock, Mock
from app.services.recipe_validation_service import (
    RecipeValidationService,
    RecipeValidationResult,
    ValidationWarning
)


@pytest.fixture
def mock_ai_client():
    """Create a mock AI client."""
    client = Mock()
    client.is_configured = Mock(return_value=True)
    client.chat_completion = AsyncMock()
    return client


@pytest.fixture
def validation_service(mock_ai_client):
    """Create validation service with mock AI client."""
    return RecipeValidationService(ai_client=mock_ai_client)


@pytest.mark.asyncio
async def test_validate_normal_recipe(validation_service, mock_ai_client):
    """Test validation of a normal recipe with no warnings."""
    # Setup
    mock_ai_client.chat_completion.return_value = '''
    {
        "warnings": [],
        "is_valid": true,
        "summary": "Oppskriften ser normal ut"
    }
    '''

    kalkyle_info = {
        "kalkylenavn": "Tomatsuppe",
        "antallporsjoner": 4
    }

    ingredienser = [
        {"produktnavn": "Salt", "mengde_per_porsjon": 2.0, "enhetsnavn": "g"},
        {"produktnavn": "Pepper", "mengde_per_porsjon": 1.0, "enhetsnavn": "g"},
        {"produktnavn": "Tomat", "mengde_per_porsjon": 150.0, "enhetsnavn": "g"}
    ]

    # Execute
    result = await validation_service.validate_recipe(kalkyle_info, ingredienser)

    # Assert
    assert result.is_valid is True
    assert len(result.warnings) == 0
    assert "normal" in result.summary.lower()


@pytest.mark.asyncio
async def test_validate_excessive_salt(validation_service, mock_ai_client):
    """Test validation of recipe with excessive salt."""
    # Setup
    mock_ai_client.chat_completion.return_value = '''
    {
        "warnings": [
            {
                "ingredient": "Salt",
                "amount_per_portion": 15.0,
                "unit": "g",
                "reason": "Uvanlig høy mengde salt (15g per porsjon). Normalt er 1-2g per porsjon.",
                "severity": "high"
            }
        ],
        "is_valid": false,
        "summary": "Oppskriften har uvanlig høy saltmengde"
    }
    '''

    kalkyle_info = {
        "kalkylenavn": "Overly Salty Soup",
        "antallporsjoner": 4
    }

    ingredienser = [
        {"produktnavn": "Salt", "mengde_per_porsjon": 15.0, "enhetsnavn": "g"},
        {"produktnavn": "Tomat", "mengde_per_porsjon": 150.0, "enhetsnavn": "g"}
    ]

    # Execute
    result = await validation_service.validate_recipe(kalkyle_info, ingredienser)

    # Assert
    assert result.is_valid is False
    assert len(result.warnings) == 1
    assert result.warnings[0].ingredient == "Salt"
    assert result.warnings[0].severity == "high"
    assert result.warnings[0].amount_per_portion == 15.0


@pytest.mark.asyncio
async def test_validate_multiple_warnings(validation_service, mock_ai_client):
    """Test validation with multiple warnings."""
    # Setup
    mock_ai_client.chat_completion.return_value = '''
    {
        "warnings": [
            {
                "ingredient": "Salt",
                "amount_per_portion": 8.0,
                "unit": "g",
                "reason": "Uvanlig høy mengde salt",
                "severity": "high"
            },
            {
                "ingredient": "Pepper",
                "amount_per_portion": 5.0,
                "unit": "g",
                "reason": "Uvanlig høy mengde pepper",
                "severity": "medium"
            }
        ],
        "is_valid": false,
        "summary": "Oppskriften har flere uvanlige mengder"
    }
    '''

    kalkyle_info = {
        "kalkylenavn": "Spicy Soup",
        "antallporsjoner": 4
    }

    ingredienser = [
        {"produktnavn": "Salt", "mengde_per_porsjon": 8.0, "enhetsnavn": "g"},
        {"produktnavn": "Pepper", "mengde_per_porsjon": 5.0, "enhetsnavn": "g"}
    ]

    # Execute
    result = await validation_service.validate_recipe(kalkyle_info, ingredienser)

    # Assert
    assert result.is_valid is False
    assert len(result.warnings) == 2


@pytest.mark.asyncio
async def test_ai_not_configured():
    """Test validation when AI is not configured (should fail-open)."""
    # Create service without AI client
    mock_client = Mock()
    mock_client.is_configured = Mock(return_value=False)
    service = RecipeValidationService(ai_client=mock_client)

    kalkyle_info = {"kalkylenavn": "Test", "antallporsjoner": 4}
    ingredienser = [{"produktnavn": "Salt", "mengde_per_porsjon": 15.0, "enhetsnavn": "g"}]

    # Execute
    result = await service.validate_recipe(kalkyle_info, ingredienser)

    # Assert - should fail-open and return valid
    assert result.is_valid is True
    assert len(result.warnings) == 0
    assert "unavailable" in result.summary.lower()


@pytest.mark.asyncio
async def test_ai_error_handling(validation_service, mock_ai_client):
    """Test handling of AI errors (should fail-open)."""
    # Setup - AI throws an error
    mock_ai_client.chat_completion.side_effect = Exception("AI service down")

    kalkyle_info = {"kalkylenavn": "Test", "antallporsjoner": 4}
    ingredienser = [{"produktnavn": "Salt", "mengde_per_porsjon": 15.0, "enhetsnavn": "g"}]

    # Execute
    result = await validation_service.validate_recipe(kalkyle_info, ingredienser)

    # Assert - should fail-open and return valid
    assert result.is_valid is True
    assert len(result.warnings) == 0


@pytest.mark.asyncio
async def test_parse_json_with_markdown(validation_service, mock_ai_client):
    """Test parsing JSON response wrapped in markdown code blocks."""
    # Setup - AI returns JSON wrapped in markdown
    mock_ai_client.chat_completion.return_value = '''```json
    {
        "warnings": [],
        "is_valid": true,
        "summary": "Oppskriften ser normal ut"
    }
    ```'''

    kalkyle_info = {"kalkylenavn": "Test", "antallporsjoner": 4}
    ingredienser = [{"produktnavn": "Salt", "mengde_per_porsjon": 2.0, "enhetsnavn": "g"}]

    # Execute
    result = await validation_service.validate_recipe(kalkyle_info, ingredienser)

    # Assert - should parse correctly
    assert result.is_valid is True
    assert len(result.warnings) == 0


@pytest.mark.asyncio
async def test_invalid_json_response(validation_service, mock_ai_client):
    """Test handling of invalid JSON response (should fail-open)."""
    # Setup - AI returns invalid JSON
    mock_ai_client.chat_completion.return_value = "This is not JSON"

    kalkyle_info = {"kalkylenavn": "Test", "antallporsjoner": 4}
    ingredienser = [{"produktnavn": "Salt", "mengde_per_porsjon": 2.0, "enhetsnavn": "g"}]

    # Execute
    result = await validation_service.validate_recipe(kalkyle_info, ingredienser)

    # Assert - should fail-open and return valid
    assert result.is_valid is True
    assert len(result.warnings) == 0

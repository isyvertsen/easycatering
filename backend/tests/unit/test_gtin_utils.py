"""Unit tests for GTIN normalization utilities."""
import pytest
from app.core.gtin_utils import normalize_gtin, gtins_match


class TestNormalizeGtin:
    """Tests for normalize_gtin function."""

    def test_normalize_13_digit_gtin(self):
        """Test normalizing a 13-digit GTIN."""
        result = normalize_gtin("8712566376780")
        assert result == "08712566376780"

    def test_normalize_already_padded_gtin(self):
        """Test GTIN that already has leading zero."""
        result = normalize_gtin("08712566376780")
        assert result == "08712566376780"

    def test_normalize_8_digit_gtin(self):
        """Test normalizing a GTIN-8."""
        result = normalize_gtin("12345678")
        assert result == "00000012345678"

    def test_normalize_12_digit_gtin(self):
        """Test normalizing a GTIN-12 (UPC)."""
        result = normalize_gtin("123456789012")
        assert result == "00123456789012"

    def test_normalize_14_digit_gtin(self):
        """Test normalizing a full GTIN-14."""
        result = normalize_gtin("12345678901234")
        assert result == "12345678901234"

    def test_normalize_gtin_with_hyphen_prefix(self):
        """Test GTIN with hyphen prefix (common in tblprodukter)."""
        result = normalize_gtin("-8712566376780")
        assert result == "08712566376780"

    def test_normalize_gtin_with_spaces(self):
        """Test GTIN with spaces."""
        result = normalize_gtin("871 256 637 6780")
        assert result == "08712566376780"

    def test_normalize_gtin_with_dashes(self):
        """Test GTIN with dashes."""
        result = normalize_gtin("871-256-637-6780")
        assert result == "08712566376780"

    def test_normalize_none_returns_none(self):
        """Test that None input returns None."""
        result = normalize_gtin(None)
        assert result is None

    def test_normalize_empty_string_returns_none(self):
        """Test that empty string returns None."""
        result = normalize_gtin("")
        assert result is None

    def test_normalize_whitespace_only_returns_none(self):
        """Test that whitespace only returns None."""
        result = normalize_gtin("   ")
        assert result is None

    def test_normalize_non_numeric_only_returns_none(self):
        """Test that non-numeric characters only returns None."""
        result = normalize_gtin("---")
        assert result is None

    def test_normalize_mixed_content(self):
        """Test GTIN with mixed letters and numbers."""
        result = normalize_gtin("ABC123456789012")
        assert result == "00123456789012"


class TestGtinsMatch:
    """Tests for gtins_match function."""

    def test_match_identical_gtins(self):
        """Test matching identical GTINs."""
        assert gtins_match("8712566376780", "8712566376780") is True

    def test_match_different_padding(self):
        """Test matching GTINs with different padding."""
        assert gtins_match("8712566376780", "08712566376780") is True

    def test_match_with_hyphen_prefix(self):
        """Test matching when one has hyphen prefix."""
        assert gtins_match("-8712566376780", "8712566376780") is True

    def test_no_match_different_gtins(self):
        """Test non-matching GTINs."""
        assert gtins_match("8712566376780", "8712566376781") is False

    def test_no_match_with_none_first(self):
        """Test that None first argument returns False."""
        assert gtins_match(None, "8712566376780") is False

    def test_no_match_with_none_second(self):
        """Test that None second argument returns False."""
        assert gtins_match("8712566376780", None) is False

    def test_no_match_both_none(self):
        """Test that both None returns False."""
        assert gtins_match(None, None) is False

    def test_match_with_spaces(self):
        """Test matching GTINs with spaces."""
        assert gtins_match("871 256 637 6780", "8712566376780") is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

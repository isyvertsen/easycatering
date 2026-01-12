"""
Utility functions for GTIN/EAN code handling and validation.

GTIN (Global Trade Item Number) is an umbrella term for several types of product identifiers:
- GTIN-8: 8 digits (EAN-8)
- GTIN-12: 12 digits (UPC-A)
- GTIN-13: 13 digits (EAN-13) - Most common in Europe
- GTIN-14: 14 digits (Used for trade items/logistics)

All GTIN formats include a check digit calculated using the GS1 algorithm.
"""
import re
from typing import Optional


def calculate_check_digit(gtin_without_check: str) -> int:
    """
    Calculate the check digit for a GTIN code using the GS1 algorithm.

    Algorithm:
    1. From right to left, multiply alternating digits by 3 and 1
    2. Sum all the results
    3. Find the smallest number that, when added to the sum, results in a multiple of 10

    Args:
        gtin_without_check: GTIN code without the check digit (7, 11, 12, or 13 digits)

    Returns:
        The check digit (0-9)

    Example:
        >>> calculate_check_digit("703761014163")
        5
    """
    if not gtin_without_check.isdigit():
        raise ValueError(f"GTIN must contain only digits: {gtin_without_check}")

    # Reverse the string to process from right to left
    digits = [int(d) for d in reversed(gtin_without_check)]

    # Multiply alternating digits by 3 and 1
    total = sum(d * 3 if i % 2 == 0 else d for i, d in enumerate(digits))

    # Calculate check digit
    check_digit = (10 - (total % 10)) % 10

    return check_digit


def validate_check_digit(gtin: str) -> bool:
    """
    Validate the check digit of a GTIN code.

    Args:
        gtin: Full GTIN code including check digit

    Returns:
        True if the check digit is valid, False otherwise

    Example:
        >>> validate_check_digit("7037610141635")
        True
        >>> validate_check_digit("7037610141636")
        False
    """
    if not gtin or not gtin.isdigit():
        return False

    if len(gtin) not in [8, 12, 13, 14]:
        return False

    # Last digit is the check digit
    check_digit = int(gtin[-1])
    gtin_without_check = gtin[:-1]

    # Calculate what the check digit should be
    expected_check_digit = calculate_check_digit(gtin_without_check)

    return check_digit == expected_check_digit


def normalize_gtin(gtin: Optional[str], validate: bool = True) -> Optional[str]:
    """
    Normalize a GTIN code to a standard format.

    This function:
    1. Removes all whitespace, dashes, and non-digit characters
    2. Pads with leading zeros to reach standard length
    3. Optionally validates the check digit
    4. Returns None for invalid/empty GTINs

    Args:
        gtin: The GTIN code to normalize (can be string, int, or None)
        validate: If True, validate the check digit (default: True)

    Returns:
        Normalized GTIN string, or None if invalid

    Examples:
        >>> normalize_gtin("7 038010 717710")
        "7038010717710"
        >>> normalize_gtin("       07031540006644")
        "7031540006644"
        >>> normalize_gtin("703761014163")  # Missing leading zero
        "0703761014163"
        >>> normalize_gtin("0")
        None
        >>> normalize_gtin("")
        None
    """
    if not gtin:
        return None

    # Convert to string and clean
    cleaned = str(gtin).strip()

    # Remove all non-digit characters (spaces, dashes, etc.)
    cleaned = re.sub(r'\D', '', cleaned)

    # Check if empty or invalid after cleaning
    if not cleaned or cleaned == "0":
        return None

    # Check current length
    length = len(cleaned)

    # If already a valid length, validate and return
    if length in [8, 12, 13, 14]:
        if validate and not validate_check_digit(cleaned):
            # Invalid check digit - might be missing leading zero
            # Try adding a leading zero for lengths 7, 11, 12, 13
            if length in [7, 11, 12, 13]:
                with_zero = "0" + cleaned
                if validate_check_digit(with_zero):
                    return with_zero
            return None if validate else cleaned
        return cleaned

    # Too short - try to pad to standard length
    if length < 8:
        # Pad to GTIN-8
        padded = cleaned.zfill(8)
        if not validate or validate_check_digit(padded):
            return padded
        return None

    elif length < 12:
        # Could be GTIN-12 or GTIN-13 missing leading zeros
        # Try GTIN-12 first
        padded_12 = cleaned.zfill(12)
        if not validate or validate_check_digit(padded_12):
            return padded_12

        # Try GTIN-13
        padded_13 = cleaned.zfill(13)
        if not validate or validate_check_digit(padded_13):
            return padded_13

        return None

    elif length < 14:
        # Pad to GTIN-13 or GTIN-14
        # Try GTIN-13 first (more common)
        padded_13 = cleaned.zfill(13)
        if not validate or validate_check_digit(padded_13):
            return padded_13

        # Try GTIN-14
        padded_14 = cleaned.zfill(14)
        if not validate or validate_check_digit(padded_14):
            return padded_14

        return None

    # Too long - invalid
    return None


def get_gtin_type(gtin: Optional[str]) -> Optional[str]:
    """
    Get the type of a GTIN code based on its length.

    Args:
        gtin: The GTIN code

    Returns:
        GTIN type string, or None if invalid

    Examples:
        >>> get_gtin_type("01100112")
        "GTIN-8"
        >>> get_gtin_type("7037610141635")
        "GTIN-13"
    """
    if not gtin:
        return None

    normalized = normalize_gtin(gtin)
    if not normalized:
        return None

    length = len(normalized)

    type_map = {
        8: "GTIN-8",
        12: "GTIN-12 (UPC)",
        13: "GTIN-13 (EAN-13)",
        14: "GTIN-14"
    }

    return type_map.get(length)

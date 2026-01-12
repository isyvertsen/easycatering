"""GTIN normalization utilities.

GTIN (Global Trade Item Number) codes can have different lengths:
- GTIN-8: 8 digits
- GTIN-12 (UPC): 12 digits
- GTIN-13 (EAN-13): 13 digits
- GTIN-14: 14 digits

Products in tblprodukter may have GTIN codes stored without leading zeros,
while matinfo_products may have them with leading zeros. This module provides
utilities to normalize GTIN codes for consistent matching.
"""

import re


def normalize_gtin(gtin: str | None) -> str | None:
    """Normalize GTIN code to 14 digits by padding with leading zeros.

    This ensures consistent matching between tblprodukter.ean_kode and
    matinfo_products.gtin regardless of how they are stored.

    Args:
        gtin: The GTIN code to normalize. Can be None, empty, or contain
              non-numeric characters like hyphens.

    Returns:
        Normalized 14-digit GTIN string, or None if input is None/empty

    Examples:
        >>> normalize_gtin("8712566376780")
        "00008712566376780"
        >>> normalize_gtin("08712566376780")
        "00008712566376780"
        >>> normalize_gtin("-8712566376780")
        "00008712566376780"
        >>> normalize_gtin(None)
        None
        >>> normalize_gtin("")
        None
    """
    if not gtin:
        return None

    # Remove all non-numeric characters
    clean_gtin = re.sub(r'\D', '', gtin)

    if not clean_gtin:
        return None

    # Pad with leading zeros to 14 digits
    # Valid GTIN lengths are 8, 12, 13, 14
    # We normalize all to 14 for consistent comparison
    return clean_gtin.zfill(14)


def gtins_match(gtin1: str | None, gtin2: str | None) -> bool:
    """Check if two GTIN codes match after normalization.

    Args:
        gtin1: First GTIN code
        gtin2: Second GTIN code

    Returns:
        True if both GTINs normalize to the same value, False otherwise

    Examples:
        >>> gtins_match("8712566376780", "08712566376780")
        True
        >>> gtins_match("8712566376780", "8712566376781")
        False
        >>> gtins_match(None, "8712566376780")
        False
    """
    norm1 = normalize_gtin(gtin1)
    norm2 = normalize_gtin(gtin2)

    if norm1 is None or norm2 is None:
        return False

    return norm1 == norm2

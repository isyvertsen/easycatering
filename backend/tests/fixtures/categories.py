"""Test category fixtures with fixed, predictable data.

All IDs start at 9000+ to avoid collision with production data.
"""

TEST_KATEGORI_1 = {
    "kategoriid": 9001,
    "kategori": "Test Meieriprodukter",
    "beskrivelse": "Melk, ost og andre meieriprodukter for testing",
}

TEST_KATEGORI_2 = {
    "kategoriid": 9002,
    "kategori": "Test Kjøtt",
    "beskrivelse": "Kjøttprodukter for testing",
}

TEST_KATEGORI_3 = {
    "kategoriid": 9003,
    "kategori": "Test Grønnsaker",
    "beskrivelse": "Grønnsaker og frukt for testing",
}


def get_test_categories() -> list[dict]:
    """Return list of all test categories."""
    return [TEST_KATEGORI_1, TEST_KATEGORI_2, TEST_KATEGORI_3]

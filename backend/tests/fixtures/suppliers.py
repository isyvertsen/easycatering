"""Test supplier fixtures with fixed, predictable data.

All IDs start at 9000+ to avoid collision with production data.
"""

TEST_LEVERANDOR_1 = {
    "leverandorid": 9001,
    "refkundenummer": "REF001",
    "leverandornavn": "Test Leverandør AS",
    "adresse": "Leverandørveien 1",
    "e_post": "ordre@testleverandor.no",
    "postnummer": "0150",
    "poststed": "Oslo",
    "telefonnummer": "22000001",
    "bestillingsnr": "BEST001",
    "utgatt": False,
    "webside": "https://testleverandor.no",
}

TEST_LEVERANDOR_2 = {
    "leverandorid": 9002,
    "refkundenummer": "REF002",
    "leverandornavn": "Annen Leverandør AS",
    "adresse": "Leverandørveien 2",
    "e_post": "ordre@annenleverandor.no",
    "postnummer": "5000",
    "poststed": "Bergen",
    "telefonnummer": "55000001",
    "bestillingsnr": "BEST002",
    "utgatt": False,
    "webside": None,
}

# Inactive supplier for testing
TEST_LEVERANDOR_INACTIVE = {
    "leverandorid": 9003,
    "refkundenummer": "REF003",
    "leverandornavn": "Utgått Leverandør AS",
    "adresse": None,
    "e_post": None,
    "postnummer": None,
    "poststed": None,
    "telefonnummer": None,
    "bestillingsnr": None,
    "utgatt": True,
    "webside": None,
}


def get_test_suppliers() -> list[dict]:
    """Return list of all test suppliers."""
    return [TEST_LEVERANDOR_1, TEST_LEVERANDOR_2, TEST_LEVERANDOR_INACTIVE]

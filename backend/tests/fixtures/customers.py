"""Test customer fixtures with fixed, predictable data.

All IDs start at 9000+ to avoid collision with production data.
"""

# Fixed test customer groups
TEST_KUNDEGRUPPE_1 = {
    "gruppeid": 9001,
    "gruppe": "Test Barnehager",
    "webshop": True,
    "autofaktura": False,
}

TEST_KUNDEGRUPPE_2 = {
    "gruppeid": 9002,
    "gruppe": "Test Skoler",
    "webshop": True,
    "autofaktura": True,
}

# Fixed test customers
TEST_KUNDE_1 = {
    "kundeid": 9001,
    "kundenavn": "Test Barnehage",
    "avdeling": "Avdeling A",
    "kontaktid": "101",
    "telefonnummer": "33000001",
    "bestillernr": "B001",
    "lopenr": 1.0,
    "merknad": "Test merknad",
    "adresse": "Testveien 1",
    "postboks": None,
    "postnr": "3256",
    "sted": "Larvik",
    "velgsone": 1,
    "leveringsdag": 1,
    "kundeinaktiv": False,
    "kundenragresso": None,
    "e_post": "test.barnehage@test.no",
    "webside": None,
    "kundegruppe": 9001,  # References TEST_KUNDEGRUPPE_1
    "bestillerselv": True,
    "rute": None,
    "menyinfo": None,
    "ansattid": None,
    "sjaforparute": None,
    "diett": False,
    "menygruppeid": None,
    "utdato": None,
    "inndato": None,
    "avsluttet": False,
    "eksportkatalog": None,
    "mobilnummer": "91000001",
    "formkost": False,
    "sykehjemid": None,
    "e_post2": None,
}

TEST_KUNDE_2 = {
    "kundeid": 9002,
    "kundenavn": "Test Skole",
    "avdeling": "Hovedbygg",
    "kontaktid": "102",
    "telefonnummer": "33000002",
    "bestillernr": "B002",
    "lopenr": 2.0,
    "merknad": None,
    "adresse": "Skolegata 5",
    "postboks": None,
    "postnr": "3256",
    "sted": "Larvik",
    "velgsone": 2,
    "leveringsdag": 2,
    "kundeinaktiv": False,
    "kundenragresso": None,
    "e_post": "test.skole@test.no",
    "webside": None,
    "kundegruppe": 9002,  # References TEST_KUNDEGRUPPE_2
    "bestillerselv": True,
    "rute": None,
    "menyinfo": None,
    "ansattid": None,
    "sjaforparute": None,
    "diett": False,
    "menygruppeid": None,
    "utdato": None,
    "inndato": None,
    "avsluttet": False,
    "eksportkatalog": None,
    "mobilnummer": "91000002",
    "formkost": False,
    "sykehjemid": None,
    "e_post2": None,
}

# Inactive customer for testing
TEST_KUNDE_INACTIVE = {
    "kundeid": 9003,
    "kundenavn": "Inaktiv Kunde",
    "avdeling": None,
    "kontaktid": None,
    "telefonnummer": None,
    "bestillernr": None,
    "lopenr": 3.0,
    "merknad": "Avsluttet kunde",
    "adresse": "Avsluttetveien 1",
    "postboks": None,
    "postnr": "3256",
    "sted": "Larvik",
    "velgsone": None,
    "leveringsdag": None,
    "kundeinaktiv": True,
    "kundenragresso": None,
    "e_post": None,
    "webside": None,
    "kundegruppe": None,
    "bestillerselv": False,
    "rute": None,
    "menyinfo": None,
    "ansattid": None,
    "sjaforparute": None,
    "diett": False,
    "menygruppeid": None,
    "utdato": None,
    "inndato": None,
    "avsluttet": True,
    "eksportkatalog": None,
    "mobilnummer": None,
    "formkost": False,
    "sykehjemid": None,
    "e_post2": None,
}


def get_test_customer_groups() -> list[dict]:
    """Return list of all test customer groups."""
    return [TEST_KUNDEGRUPPE_1, TEST_KUNDEGRUPPE_2]


def get_test_customers() -> list[dict]:
    """Return list of all test customers."""
    return [TEST_KUNDE_1, TEST_KUNDE_2, TEST_KUNDE_INACTIVE]

"""Test order fixtures with fixed, predictable data.

All IDs start at 9000+ to avoid collision with production data.
"""
from datetime import datetime

TEST_ORDRE_1 = {
    "ordreid": 9001,
    "kundeid": 9001,  # References TEST_KUNDE_1
    "ansattid": None,
    "kundenavn": "Test Barnehage",
    "ordredato": datetime(2024, 1, 15, 10, 0, 0),
    "leveringsdato": datetime(2024, 1, 16, 8, 0, 0),
    "fakturadato": None,
    "sendestil": "Test Barnehage, Testveien 1, 3256 Larvik",
    "betalingsmate": 1,
    "lagerok": True,
    "informasjon": "Testordre 1",
    "ordrestatusid": 1,  # Active
    "fakturaid": None,
    "kansellertdato": None,
    "sentbekreftelse": True,
    "sentregnskap": None,
    "ordrelevert": None,
    "levertagresso": None,
    "plukkstatus": "KLAR_TIL_PLUKKING",
    "plukket_dato": None,
    "plukket_av": None,
    "pakkseddel_skrevet": None,
    "bestilt_av": 9001,  # References TEST_USER
}

TEST_ORDRE_2 = {
    "ordreid": 9002,
    "kundeid": 9002,  # References TEST_KUNDE_2
    "ansattid": None,
    "kundenavn": "Test Skole",
    "ordredato": datetime(2024, 1, 15, 11, 0, 0),
    "leveringsdato": datetime(2024, 1, 17, 8, 0, 0),
    "fakturadato": None,
    "sendestil": "Test Skole, Skolegata 5, 3256 Larvik",
    "betalingsmate": 1,
    "lagerok": True,
    "informasjon": "Testordre 2",
    "ordrestatusid": 1,
    "fakturaid": None,
    "kansellertdato": None,
    "sentbekreftelse": False,
    "sentregnskap": None,
    "ordrelevert": None,
    "levertagresso": None,
    "plukkstatus": None,
    "plukket_dato": None,
    "plukket_av": None,
    "pakkseddel_skrevet": None,
    "bestilt_av": None,
}

# Completed order for testing
TEST_ORDRE_COMPLETED = {
    "ordreid": 9003,
    "kundeid": 9001,
    "ansattid": None,
    "kundenavn": "Test Barnehage",
    "ordredato": datetime(2024, 1, 10, 10, 0, 0),
    "leveringsdato": datetime(2024, 1, 11, 8, 0, 0),
    "fakturadato": datetime(2024, 1, 11, 12, 0, 0),
    "sendestil": "Test Barnehage, Testveien 1, 3256 Larvik",
    "betalingsmate": 1,
    "lagerok": True,
    "informasjon": "Ferdig ordre",
    "ordrestatusid": 3,  # Completed
    "fakturaid": 1001.0,
    "kansellertdato": None,
    "sentbekreftelse": True,
    "sentregnskap": datetime(2024, 1, 15),
    "ordrelevert": "Levert",
    "levertagresso": None,
    "plukkstatus": "LEVERT",
    "plukket_dato": datetime(2024, 1, 11, 7, 0, 0),
    "plukket_av": 9001,
    "pakkseddel_skrevet": datetime(2024, 1, 11, 7, 30, 0),
    "bestilt_av": 9001,
}

# Order details
TEST_ORDREDETALJ_1 = {
    "ordreid": 9001,
    "produktid": 9001,  # TEST_PRODUKT_1 (Melk)
    "unik": 1,
    "levdato": datetime(2024, 1, 16, 8, 0, 0),
    "pris": 25.00,
    "antall": 10.0,
    "rabatt": 0.0,
    "ident": "TEST001",
    "plukket_antall": None,
}

TEST_ORDREDETALJ_2 = {
    "ordreid": 9001,
    "produktid": 9002,  # TEST_PRODUKT_2 (Kylling)
    "unik": 2,
    "levdato": datetime(2024, 1, 16, 8, 0, 0),
    "pris": 150.00,
    "antall": 5.0,
    "rabatt": 0.0,
    "ident": "TEST002",
    "plukket_antall": None,
}

TEST_ORDREDETALJ_3 = {
    "ordreid": 9002,
    "produktid": 9003,  # TEST_PRODUKT_3 (Gulrot)
    "unik": 1,
    "levdato": datetime(2024, 1, 17, 8, 0, 0),
    "pris": 80.00,
    "antall": 2.0,
    "rabatt": 5.0,  # With discount
    "ident": "TEST003",
    "plukket_antall": None,
}

TEST_ORDREDETALJ_COMPLETED = {
    "ordreid": 9003,
    "produktid": 9001,
    "unik": 1,
    "levdato": datetime(2024, 1, 11, 8, 0, 0),
    "pris": 25.00,
    "antall": 20.0,
    "rabatt": 0.0,
    "ident": "COMP001",
    "plukket_antall": 20.0,
}


def get_test_orders() -> list[dict]:
    """Return list of all test orders."""
    return [TEST_ORDRE_1, TEST_ORDRE_2, TEST_ORDRE_COMPLETED]


def get_test_order_details() -> list[dict]:
    """Return list of all test order details."""
    return [
        TEST_ORDREDETALJ_1,
        TEST_ORDREDETALJ_2,
        TEST_ORDREDETALJ_3,
        TEST_ORDREDETALJ_COMPLETED,
    ]

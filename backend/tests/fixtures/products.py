"""Test product fixtures with fixed, predictable data.

All IDs start at 9000+ to avoid collision with production data.
"""

TEST_PRODUKT_1 = {
    "produktid": 9001,
    "produktnavn": "Test Melk 1L",
    "leverandorsproduktnr": "MILK001",
    "antalleht": 12.0,
    "pakningstype": "Kartong",
    "pakningsstorrelse": "1L",
    "pris": 25.00,
    "paknpris": "300.00",
    "levrandorid": 9001,  # References TEST_LEVERANDOR_1
    "kategoriid": 9001,  # References TEST_KATEGORI_1
    "lagermengde": 100.0,
    "bestillingsgrense": 10.0,
    "bestillingsmengde": 24.0,
    "ean_kode": "7038010000001",
    "utgatt": False,
    "oppdatert": True,
    "webshop": True,
    "mvaverdi": 15.0,
    "lagerid": None,
    "utregningsfaktor": 1.0,
    "utregnetpris": 25.00,
    "visningsnavn": "Melk hel 1L",
    "visningsnavn2": None,
    "rett_komponent": False,
}

TEST_PRODUKT_2 = {
    "produktid": 9002,
    "produktnavn": "Test Kyllingfilet 1kg",
    "leverandorsproduktnr": "CHICK001",
    "antalleht": 6.0,
    "pakningstype": "Pakke",
    "pakningsstorrelse": "1kg",
    "pris": 150.00,
    "paknpris": "900.00",
    "levrandorid": 9002,  # References TEST_LEVERANDOR_2
    "kategoriid": 9002,  # References TEST_KATEGORI_2
    "lagermengde": 50.0,
    "bestillingsgrense": 5.0,
    "bestillingsmengde": 12.0,
    "ean_kode": "7038010000002",
    "utgatt": False,
    "oppdatert": True,
    "webshop": True,
    "mvaverdi": 15.0,
    "lagerid": None,
    "utregningsfaktor": 1.0,
    "utregnetpris": 150.00,
    "visningsnavn": "Kyllingfilet fersk 1kg",
    "visningsnavn2": None,
    "rett_komponent": True,
}

TEST_PRODUKT_3 = {
    "produktid": 9003,
    "produktnavn": "Test Gulrot 10kg",
    "leverandorsproduktnr": "CARROT001",
    "antalleht": 1.0,
    "pakningstype": "Sekk",
    "pakningsstorrelse": "10kg",
    "pris": 80.00,
    "paknpris": "80.00",
    "levrandorid": 9001,  # References TEST_LEVERANDOR_1
    "kategoriid": 9003,  # References TEST_KATEGORI_3
    "lagermengde": 20.0,
    "bestillingsgrense": 2.0,
    "bestillingsmengde": 5.0,
    "ean_kode": None,  # No EAN for testing products without
    "utgatt": False,
    "oppdatert": False,
    "webshop": True,
    "mvaverdi": 15.0,
    "lagerid": None,
    "utregningsfaktor": 1.0,
    "utregnetpris": 80.00,
    "visningsnavn": "Gulrot norsk 10kg",
    "visningsnavn2": None,
    "rett_komponent": True,
}

# Inactive product for testing
TEST_PRODUKT_UTGATT = {
    "produktid": 9004,
    "produktnavn": "Test Utgått Produkt",
    "leverandorsproduktnr": "OLD001",
    "antalleht": 1.0,
    "pakningstype": None,
    "pakningsstorrelse": None,
    "pris": 0.0,
    "paknpris": None,
    "levrandorid": 9003,  # References TEST_LEVERANDOR_INACTIVE
    "kategoriid": 9001,
    "lagermengde": 0.0,
    "bestillingsgrense": None,
    "bestillingsmengde": None,
    "ean_kode": None,
    "utgatt": True,
    "oppdatert": False,
    "webshop": False,
    "mvaverdi": 15.0,
    "lagerid": None,
    "utregningsfaktor": None,
    "utregnetpris": None,
    "visningsnavn": None,
    "visningsnavn2": None,
    "rett_komponent": False,
}


def get_test_products() -> list[dict]:
    """Return list of all test products."""
    return [TEST_PRODUKT_1, TEST_PRODUKT_2, TEST_PRODUKT_3, TEST_PRODUKT_UTGATT]

"""Test order status fixtures with fixed, predictable data.

These are lookup values that orders reference.
"""

TEST_ORDRESTATUS_PENDING = {
    "statusid": 1,
    "status": "Aktiv",
}

TEST_ORDRESTATUS_PROCESSING = {
    "statusid": 2,
    "status": "Under behandling",
}

TEST_ORDRESTATUS_COMPLETED = {
    "statusid": 3,
    "status": "Fullført",
}

TEST_ORDRESTATUS_CANCELLED = {
    "statusid": 4,
    "status": "Kansellert",
}


def get_test_order_statuses() -> list[dict]:
    """Return list of all test order statuses."""
    return [
        TEST_ORDRESTATUS_PENDING,
        TEST_ORDRESTATUS_PROCESSING,
        TEST_ORDRESTATUS_COMPLETED,
        TEST_ORDRESTATUS_CANCELLED,
    ]

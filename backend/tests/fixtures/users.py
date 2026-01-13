"""Test user fixtures with fixed, predictable data.

All IDs start at 9000+ to avoid collision with production data.
"""
from datetime import datetime
from app.core.security import get_password_hash

# Fixed test users - these IDs and values never change
TEST_USER = {
    "id": 9001,
    "email": "test@lkc.no",
    "full_name": "Test Bruker",
    "hashed_password": get_password_hash("test123"),
    "rolle": "bruker",
    "is_active": True,
    "is_superuser": False,
    "google_id": None,
    "ansattid": None,
    "kundeid": None,
    "created_at": datetime(2024, 1, 1, 12, 0, 0),
    "updated_at": datetime(2024, 1, 1, 12, 0, 0),
}

TEST_ADMIN = {
    "id": 9002,
    "email": "admin@lkc.no",
    "full_name": "Admin Bruker",
    "hashed_password": get_password_hash("admin123"),
    "rolle": "admin",
    "is_active": True,
    "is_superuser": True,
    "google_id": None,
    "ansattid": None,
    "kundeid": None,
    "created_at": datetime(2024, 1, 1, 12, 0, 0),
    "updated_at": datetime(2024, 1, 1, 12, 0, 0),
}

# Inactive user for testing
TEST_INACTIVE_USER = {
    "id": 9003,
    "email": "inactive@lkc.no",
    "full_name": "Inaktiv Bruker",
    "hashed_password": get_password_hash("inactive123"),
    "rolle": "bruker",
    "is_active": False,
    "is_superuser": False,
    "google_id": None,
    "ansattid": None,
    "kundeid": None,
    "created_at": datetime(2024, 1, 1, 12, 0, 0),
    "updated_at": datetime(2024, 1, 1, 12, 0, 0),
}


def get_test_users() -> list[dict]:
    """Return list of all test users."""
    return [TEST_USER, TEST_ADMIN, TEST_INACTIVE_USER]


# Password constants for login tests
TEST_USER_PASSWORD = "test123"
TEST_ADMIN_PASSWORD = "admin123"

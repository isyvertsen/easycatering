"""Test fixtures with fixed, predictable data.

All test data uses IDs starting at 9000+ to avoid collision with production data.
This ensures tests are isolated and predictable.
"""
from .users import (
    TEST_USER,
    TEST_ADMIN,
    TEST_INACTIVE_USER,
    TEST_USER_PASSWORD,
    TEST_ADMIN_PASSWORD,
    get_test_users,
)
from .customers import (
    TEST_KUNDE_1,
    TEST_KUNDE_2,
    TEST_KUNDE_INACTIVE,
    TEST_KUNDEGRUPPE_1,
    TEST_KUNDEGRUPPE_2,
    get_test_customers,
    get_test_customer_groups,
)
from .suppliers import (
    TEST_LEVERANDOR_1,
    TEST_LEVERANDOR_2,
    TEST_LEVERANDOR_INACTIVE,
    get_test_suppliers,
)
from .categories import (
    TEST_KATEGORI_1,
    TEST_KATEGORI_2,
    TEST_KATEGORI_3,
    get_test_categories,
)
from .products import (
    TEST_PRODUKT_1,
    TEST_PRODUKT_2,
    TEST_PRODUKT_3,
    TEST_PRODUKT_UTGATT,
    get_test_products,
)
from .orders import (
    TEST_ORDRE_1,
    TEST_ORDRE_2,
    TEST_ORDRE_COMPLETED,
    TEST_ORDREDETALJ_1,
    TEST_ORDREDETALJ_2,
    TEST_ORDREDETALJ_3,
    TEST_ORDREDETALJ_COMPLETED,
    get_test_orders,
    get_test_order_details,
)

__all__ = [
    # Users
    "TEST_USER",
    "TEST_ADMIN",
    "TEST_INACTIVE_USER",
    "TEST_USER_PASSWORD",
    "TEST_ADMIN_PASSWORD",
    "get_test_users",
    # Customers
    "TEST_KUNDE_1",
    "TEST_KUNDE_2",
    "TEST_KUNDE_INACTIVE",
    "TEST_KUNDEGRUPPE_1",
    "TEST_KUNDEGRUPPE_2",
    "get_test_customers",
    "get_test_customer_groups",
    # Suppliers
    "TEST_LEVERANDOR_1",
    "TEST_LEVERANDOR_2",
    "TEST_LEVERANDOR_INACTIVE",
    "get_test_suppliers",
    # Categories
    "TEST_KATEGORI_1",
    "TEST_KATEGORI_2",
    "TEST_KATEGORI_3",
    "get_test_categories",
    # Products
    "TEST_PRODUKT_1",
    "TEST_PRODUKT_2",
    "TEST_PRODUKT_3",
    "TEST_PRODUKT_UTGATT",
    "get_test_products",
    # Orders
    "TEST_ORDRE_1",
    "TEST_ORDRE_2",
    "TEST_ORDRE_COMPLETED",
    "TEST_ORDREDETALJ_1",
    "TEST_ORDREDETALJ_2",
    "TEST_ORDREDETALJ_3",
    "TEST_ORDREDETALJ_COMPLETED",
    "get_test_orders",
    "get_test_order_details",
]

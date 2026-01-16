"""Test configuration and fixtures.

This module provides the core test infrastructure:
- Database setup with isolated test database
- Seed data with fixed, predictable values
- Authentication fixtures for testing protected endpoints
- HTTP client fixtures for API testing
"""
import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.infrastructure.database.session import Base, get_db
from app.core.config import settings
from app.core.security import create_access_token

# Import models for table creation
from app.domain.entities.user import User
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe
from app.models.leverandorer import Leverandorer
from app.models.kategorier import Kategorier
from app.models.produkter import Produkter
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.models.ordrestatus import Ordrestatus

# Import test fixtures
from tests.fixtures import (
    get_test_users,
    get_test_customer_groups,
    get_test_customers,
    get_test_suppliers,
    get_test_categories,
    get_test_products,
    get_test_orders,
    get_test_order_details,
    get_test_order_statuses,
    TEST_USER,
    TEST_ADMIN,
)

# Test database URL - uses a separate test database
TEST_DATABASE_URL = settings.DATABASE_URL.replace("/_dev", "/test_nkclarvikkommune")

# Create test engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


async def seed_test_data(session: AsyncSession) -> None:
    """Seed database with fixed test data.

    This function inserts all test fixtures in the correct order
    to respect foreign key constraints.

    Order:
    1. Users (no dependencies)
    2. Customer groups (no dependencies)
    3. Suppliers (no dependencies)
    4. Categories (no dependencies)
    5. Order statuses (no dependencies)
    6. Customers (depends on customer groups)
    7. Products (depends on suppliers, categories)
    8. Orders (depends on customers, users, order statuses)
    9. Order details (depends on orders, products)
    """
    # 1. Insert users
    for user_data in get_test_users():
        user = User(**user_data)
        session.add(user)

    # 2. Insert customer groups
    for group_data in get_test_customer_groups():
        group = Kundegruppe(**group_data)
        session.add(group)

    # 3. Insert suppliers
    for supplier_data in get_test_suppliers():
        supplier = Leverandorer(**supplier_data)
        session.add(supplier)

    # 4. Insert categories
    for category_data in get_test_categories():
        category = Kategorier(**category_data)
        session.add(category)

    # 5. Insert order statuses
    for status_data in get_test_order_statuses():
        status = Ordrestatus(**status_data)
        session.add(status)

    await session.commit()

    # 6. Insert customers (after groups)
    for customer_data in get_test_customers():
        customer = Kunder(**customer_data)
        session.add(customer)

    # 7. Insert products (after suppliers and categories)
    for product_data in get_test_products():
        product = Produkter(**product_data)
        session.add(product)

    await session.commit()

    # 8. Insert orders (after customers and users and order statuses)
    for order_data in get_test_orders():
        order = Ordrer(**order_data)
        session.add(order)

    await session.commit()

    # 8. Insert order details (after orders and products)
    for detail_data in get_test_order_details():
        detail = Ordredetaljer(**detail_data)
        session.add(detail)

    await session.commit()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test.

    This fixture:
    1. Drops all tables (with CASCADE to handle foreign keys)
    2. Creates all tables
    3. Seeds with test data
    4. Yields session for test
    """
    async with test_engine.begin() as conn:
        # Use raw SQL with CASCADE to handle foreign key dependencies
        # from tables outside our model definitions
        from sqlalchemy import text
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table.name}" CASCADE'))
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        await seed_test_data(session)
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with overridden database dependency.

    This client does NOT have authentication headers.
    Use authenticated_client for protected endpoints.
    """
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def auth_headers_user() -> dict[str, str]:
    """Return authorization headers for TEST_USER."""
    token = create_access_token(subject=TEST_USER["id"])
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def auth_headers_admin() -> dict[str, str]:
    """Return authorization headers for TEST_ADMIN."""
    token = create_access_token(subject=TEST_ADMIN["id"])
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(
    db_session: AsyncSession,
    auth_headers_user: dict[str, str],
) -> AsyncGenerator[AsyncClient, None]:
    """Create authenticated test client with TEST_USER credentials.

    This client has authentication headers set for all requests.
    """
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        app=app,
        base_url="http://test",
        headers=auth_headers_user,
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def admin_client(
    db_session: AsyncSession,
    auth_headers_admin: dict[str, str],
) -> AsyncGenerator[AsyncClient, None]:
    """Create authenticated test client with TEST_ADMIN credentials.

    This client has admin authentication headers set for all requests.
    """
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        app=app,
        base_url="http://test",
        headers=auth_headers_admin,
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# BDD shared context fixture
@pytest.fixture
def context() -> dict:
    """Shared context dictionary for BDD step definitions.

    Use this to pass data between Given/When/Then steps.
    """
    return {}

"""Shared step definitions for BDD tests.

This module contains common Given/When/Then steps that are shared
across all feature files.
"""
import json
from pytest_bdd import given, when, then, parsers
from httpx import AsyncClient

from tests.fixtures import TEST_USER, TEST_ADMIN


# === GIVEN STEPS ===

@given("databasen er seedet med testdata")
def seeded_database(db_session):
    """Database is already seeded via the db_session fixture."""
    pass


@given(parsers.parse('jeg er logget inn som "{email}"'))
def logged_in_as_user(email: str, authenticated_client: AsyncClient, admin_client: AsyncClient, context: dict):
    """Set the correct client based on email."""
    if email == TEST_ADMIN["email"]:
        context["client"] = admin_client
    else:
        context["client"] = authenticated_client


@given("jeg er logget inn som vanlig bruker")
def logged_in_as_regular_user(authenticated_client: AsyncClient, context: dict):
    """Set authenticated client for regular user."""
    context["client"] = authenticated_client


@given("jeg er logget inn som admin")
def logged_in_as_admin(admin_client: AsyncClient, context: dict):
    """Set authenticated client for admin user."""
    context["client"] = admin_client


@given("jeg er IKKE logget inn")
def not_logged_in(client: AsyncClient, context: dict):
    """Use unauthenticated client."""
    context["client"] = client


# === WHEN STEPS ===

@when(parsers.parse('jeg sender GET request til "{endpoint}"'))
async def send_get_request(endpoint: str, context: dict):
    """Send GET request to endpoint."""
    client = context.get("client")
    if not client:
        raise ValueError("No client set. Use a Given step to set authentication.")
    response = await client.get(endpoint)
    context["response"] = response


@when(parsers.parse('jeg sender POST request til "{endpoint}" med JSON:'))
async def send_post_request_with_json(endpoint: str, context: dict, datatable):
    """Send POST request with JSON body from datatable."""
    client = context.get("client")
    if not client:
        raise ValueError("No client set. Use a Given step to set authentication.")

    # Convert datatable to dict
    if hasattr(datatable, '__iter__'):
        payload = dict(datatable[0]) if datatable else {}
    else:
        payload = {}

    response = await client.post(endpoint, json=payload)
    context["response"] = response


@when(parsers.parse('jeg sender POST request til "{endpoint}" med body:'))
async def send_post_request_with_body(endpoint: str, docstring: str, context: dict):
    """Send POST request with JSON body from docstring."""
    client = context.get("client")
    if not client:
        raise ValueError("No client set. Use a Given step to set authentication.")

    payload = json.loads(docstring) if docstring else {}
    response = await client.post(endpoint, json=payload)
    context["response"] = response


@when(parsers.parse('jeg sender PUT request til "{endpoint}" med body:'))
async def send_put_request_with_body(endpoint: str, docstring: str, context: dict):
    """Send PUT request with JSON body from docstring."""
    client = context.get("client")
    if not client:
        raise ValueError("No client set. Use a Given step to set authentication.")

    payload = json.loads(docstring) if docstring else {}
    response = await client.put(endpoint, json=payload)
    context["response"] = response


@when(parsers.parse('jeg sender DELETE request til "{endpoint}"'))
async def send_delete_request(endpoint: str, context: dict):
    """Send DELETE request to endpoint."""
    client = context.get("client")
    if not client:
        raise ValueError("No client set. Use a Given step to set authentication.")
    response = await client.delete(endpoint)
    context["response"] = response


# === THEN STEPS ===

@then(parsers.parse("responsen skal ha status {status:d}"))
def check_status_code(status: int, context: dict):
    """Check response status code."""
    response = context.get("response")
    assert response is not None, "No response found in context"
    assert response.status_code == status, \
        f"Expected status {status}, got {response.status_code}. Body: {response.text}"


@then(parsers.parse('responsen skal inneholde "{field}" lik "{value}"'))
def check_field_equals_string(field: str, value: str, context: dict):
    """Check that response JSON contains field with exact string value."""
    response = context.get("response")
    data = response.json()
    assert field in data, f"Field '{field}' not found in response: {data}"
    assert str(data[field]) == value, f"Expected {field}={value}, got {data[field]}"


@then(parsers.parse('responsen skal inneholde "{field}" lik {value:d}'))
def check_field_equals_int(field: str, value: int, context: dict):
    """Check that response JSON contains field with exact integer value."""
    response = context.get("response")
    data = response.json()
    assert field in data, f"Field '{field}' not found in response: {data}"
    assert data[field] == value, f"Expected {field}={value}, got {data[field]}"


@then(parsers.parse("responsen skal inneholde minst {count:d} elementer"))
def check_min_items(count: int, context: dict):
    """Check that response contains at least N items."""
    response = context.get("response")
    data = response.json()

    # Handle paginated response
    items = data.get("items", data) if isinstance(data, dict) else data

    assert isinstance(items, list), f"Expected list, got {type(items)}"
    assert len(items) >= count, f"Expected at least {count} items, got {len(items)}"


@then(parsers.parse("responsen skal inneholde {count:d} elementer"))
def check_exact_items(count: int, context: dict):
    """Check that response contains exactly N items."""
    response = context.get("response")
    data = response.json()

    # Handle paginated response
    items = data.get("items", data) if isinstance(data, dict) else data

    assert isinstance(items, list), f"Expected list, got {type(items)}"
    assert len(items) == count, f"Expected {count} items, got {len(items)}"


@then("responsen skal være en liste")
def check_is_list(context: dict):
    """Check that response is a list."""
    response = context.get("response")
    data = response.json()

    # Handle paginated response
    items = data.get("items", data) if isinstance(data, dict) else data
    assert isinstance(items, list), f"Expected list, got {type(items)}"


@then(parsers.parse('første element skal ha "{field}" lik "{value}"'))
def check_first_item_field(field: str, value: str, context: dict):
    """Check that first item in response has field with value."""
    response = context.get("response")
    data = response.json()

    # Handle paginated response
    items = data.get("items", data) if isinstance(data, dict) else data

    assert len(items) > 0, "Response has no items"
    assert field in items[0], f"Field '{field}' not in first item: {items[0]}"
    assert str(items[0][field]) == value, \
        f"Expected first item {field}={value}, got {items[0][field]}"

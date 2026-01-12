"""Test Matinfo API connection."""
import asyncio
import httpx
from datetime import datetime, timedelta

MATINFO_API_KEY = "63585da4-bfe4-4c13-8ada-28326ce41a9d"
MATINFO_API_URL = "https://api.matinfo.no/v2"


async def test_updated_gtins():
    """Test fetching updated GTINs from Matinfo API."""
    # Get products updated in last 7 days
    since_date = datetime.now() - timedelta(days=7)
    date_str = since_date.strftime("%Y,%m,%d")

    url = f"{MATINFO_API_URL}/updatedsince/{date_str}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"Testing Matinfo API...")
            print(f"URL: {url}")
            print(f"Date: {since_date.strftime('%Y-%m-%d')}")
            print()

            response = await client.get(
                url,
                params={"api_key": MATINFO_API_KEY}
            )
            response.raise_for_status()

            data = response.json()
            products = data.get("products", [])

            print(f"✅ API Connection successful!")
            print(f"Found {len(products)} updated products since {since_date.strftime('%Y-%m-%d')}")

            if products:
                print(f"\nFirst 5 GTINs:")
                for i, p in enumerate(products[:5], 1):
                    if isinstance(p, str):
                        print(f"  {i}. {p}")
                    elif isinstance(p, dict):
                        print(f"  {i}. {p.get('gtin', 'N/A')}")

            return True

        except httpx.HTTPError as e:
            print(f"❌ API Error: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return False


async def test_single_product(gtin: str = "7038010055904"):
    """Test fetching a single product."""
    url = f"{MATINFO_API_URL}/product/gtin/{gtin}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"\nTesting single product fetch...")
            print(f"GTIN: {gtin}")
            print()

            response = await client.get(
                url,
                params={"api_key": MATINFO_API_KEY},
                headers={"Accept": "application/json; version=5;gpc=1"}
            )

            if response.status_code == 404:
                print(f"⚠️  Product not found: {gtin}")
                return False

            response.raise_for_status()
            data = response.json()

            print(f"✅ Product found!")
            print(f"Name: {data.get('name', 'N/A')}")
            print(f"Producer: {data.get('producerName', 'N/A')}")
            print(f"Brand: {data.get('brandName', 'N/A')}")
            print(f"Allergens: {len(data.get('allergens', []))}")
            print(f"Nutrients: {len(data.get('nutrients', []))}")

            return True

        except httpx.HTTPError as e:
            print(f"❌ API Error: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Response: {e.response.text}")
            return False


async def main():
    """Run all tests."""
    print("=" * 60)
    print("MATINFO API TEST")
    print("=" * 60)
    print()

    # Test 1: Fetch updated GTINs
    await test_updated_gtins()

    # Test 2: Fetch single product
    await test_single_product()

    print()
    print("=" * 60)
    print("TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

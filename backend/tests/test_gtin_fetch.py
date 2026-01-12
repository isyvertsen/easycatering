"""Test script to verify GTIN fetching from Matinfo API."""
import asyncio
import httpx
from datetime import datetime, timedelta

async def test_matinfo_api():
    """Test the Matinfo API directly to verify GTIN response."""

    # Test with the last 7 days
    since_date = datetime.now() - timedelta(days=7)
    date_str = since_date.strftime("%Y,%m,%d")

    url = f"https://api.matinfo.no/v2/updatedsince/{date_str}"
    api_key = "63585da4-bfe4-4c13-8ada-28326ce41a9d"

    print(f"Testing Matinfo API...")
    print(f"Fetching GTINs updated since: {since_date.strftime('%Y-%m-%d')}")
    print(f"URL: {url}")
    print("-" * 50)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, params={"api_key": api_key})
            response.raise_for_status()

            data = response.json()
            products = data.get("products", [])

            print(f"✓ API call successful!")
            print(f"✓ Total GTINs returned: {len(products)}")

            if products:
                # Show sample of GTINs
                print(f"\nSample of first 5 GTINs:")
                for i, product in enumerate(products[:5], 1):
                    if isinstance(product, dict):
                        gtin = product.get("gtin", "").strip()
                    else:
                        gtin = str(product).strip()
                    print(f"  {i}. {gtin}")

                # Check for problematic GTINs
                invalid_count = 0
                has_spaces = 0
                for product in products:
                    if isinstance(product, dict):
                        gtin = product.get("gtin", "")
                    else:
                        gtin = str(product)

                    if not gtin or gtin.strip() == "0" or len(gtin.strip()) < 8:
                        invalid_count += 1
                    if gtin != gtin.strip():
                        has_spaces += 1

                print(f"\nData quality:")
                print(f"  - GTINs with leading/trailing spaces: {has_spaces}")
                print(f"  - Invalid GTINs (empty, '0', or too short): {invalid_count}")
                print(f"  - Valid GTINs: {len(products) - invalid_count}")

        except httpx.HTTPStatusError as e:
            print(f"✗ HTTP Error: {e}")
            print(f"  Status code: {e.response.status_code}")
            print(f"  Response: {e.response.text[:500]}")
        except Exception as e:
            print(f"✗ Error: {e}")

if __name__ == "__main__":
    print("Starting Matinfo API test...\n")
    asyncio.run(test_matinfo_api())
    print("\n✓ Test completed!")
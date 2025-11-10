"""
Test operator app connection to portal API
"""
import requests
import os

# Same configuration as operator_ui.py
PORTAL_EXTERNAL_BASE_URL = os.getenv("PORTAL_EXTERNAL_BASE_URL", "http://localhost:8000").strip().rstrip("/")

def portal_url(path: str) -> str:
    """Build portal API URL"""
    if not path.startswith("/"):
        path = "/" + path
    return f"{PORTAL_EXTERNAL_BASE_URL}{path}"

print("Testing Operator App Portal Connection")
print("=" * 50)
print(f"Base URL: {PORTAL_EXTERNAL_BASE_URL}")
print()

# Test the exact endpoint operator_ui.py uses
api_url = portal_url("/api/owners/paid-owners")
print(f"Testing endpoint: {api_url}")
print()

try:
    response = requests.get(api_url, timeout=3)
    print(f"Response status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        num_paid = len(data.get("owners", []))
        print(f"[SUCCESS] - Found {num_paid} paid owner(s)")
        print()
        print("Owners found:")
        for owner in data.get("owners", []):
            print(f"  - {owner.get('name', 'Unknown')} ({owner.get('email', 'no-email')})")
    else:
        print(f"[WARNING] - Status code: {response.status_code}")
        print(f"Response: {response.text[:200]}")

except requests.exceptions.Timeout:
    print("[ERROR] - Request timed out (3 seconds)")
except requests.exceptions.ConnectionError as e:
    print(f"[ERROR] - Connection failed: {e}")
except requests.exceptions.RequestException as e:
    print(f"[ERROR] - Request failed: {e}")
except Exception as e:
    print(f"[ERROR] - Unexpected error: {e}")

print()
print("=" * 50)
print("If this shows SUCCESS but operator app shows red X:")
print("1. Make sure you saved and restarted operator_ui.py")
print("2. Try closing ALL operator app windows and restarting")
print("3. Check if you have multiple Python versions installed")
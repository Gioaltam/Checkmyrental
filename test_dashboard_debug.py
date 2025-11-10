"""
Debug dashboard endpoint to find the actual error
"""
import requests
import json

print("Testing dashboard endpoint with various tokens...")
print("=" * 60)

# Test with JS2024001
print("\n1. Testing with JS2024001 token:")
try:
    response = requests.get(
        "http://localhost:8000/api/owners/dashboard",
        params={"portal_token": "JS2024001"},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code != 200:
        print(f"   Response: {response.text}")
    else:
        data = response.json()
        print(f"   Owner: {data.get('owner')}")
except Exception as e:
    print(f"   Error: {e}")

# Test with portal_2
print("\n2. Testing with portal_2 token:")
try:
    response = requests.get(
        "http://localhost:8000/api/owners/dashboard",
        params={"portal_token": "portal_2"},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code != 200:
        print(f"   Response: {response.text}")
    else:
        data = response.json()
        print(f"   Owner: {data.get('owner')}")
except Exception as e:
    print(f"   Error: {e}")

# Test with JWT from login
print("\n3. Getting JWT from login and testing:")
login_data = {
    "email": "julianagomesfl@yahoo.com",
    "password": "password123"
}

try:
    # Login first
    login_response = requests.post(
        "http://localhost:8000/api/portal/login",
        json=login_data,
        timeout=5
    )

    if login_response.status_code == 200:
        jwt_token = login_response.json().get('access_token')
        print(f"   JWT obtained: {jwt_token[:50]}...")

        # Test dashboard with JWT
        dash_response = requests.get(
            "http://localhost:8000/api/owners/dashboard",
            params={"portal_token": jwt_token},
            timeout=5
        )
        print(f"   Dashboard status: {dash_response.status_code}")
        if dash_response.status_code != 200:
            print(f"   Response: {dash_response.text}")
        else:
            data = dash_response.json()
            print(f"   Owner: {data.get('owner')}")
    else:
        print(f"   Login failed: {login_response.text}")

except Exception as e:
    print(f"   Error: {e}")

# Check if the endpoint exists
print("\n4. Checking if endpoint is registered:")
try:
    response = requests.get("http://localhost:8000/openapi.json", timeout=5)
    if response.status_code == 200:
        openapi = response.json()
        if "/api/owners/dashboard" in openapi.get("paths", {}):
            print("   ✓ Dashboard endpoint is registered")
            endpoint_info = openapi["paths"]["/api/owners/dashboard"]
            print(f"   Methods: {list(endpoint_info.keys())}")
        else:
            print("   ✗ Dashboard endpoint NOT found in API routes")
except Exception as e:
    print(f"   Error checking API routes: {e}")
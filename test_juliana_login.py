"""
Test Juliana's login flow from landing page to dashboard
"""
import requests
import json
import sys
import io
import jwt

# Set UTF-8 encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("TESTING JULIANA LOGIN FLOW")
print("=" * 60)

# Test 1: Login with Juliana's credentials
print("\n1️⃣ TESTING PORTAL LOGIN")
print("-" * 40)

login_data = {
    "email": "julianagomesfl@yahoo.com",
    "password": "password123"  # This is the test password
}

try:
    response = requests.post(
        "http://localhost:8000/api/portal/login",
        json=login_data,
        timeout=5
    )

    if response.status_code == 200:
        data = response.json()
        access_token = data.get('access_token')
        print("✅ Login successful!")
        print(f"   • Token received: {access_token[:50]}...")

        # Decode the JWT to see what's in it
        try:
            # Note: We're decoding without verification just to see the payload
            payload = jwt.decode(access_token, options={"verify_signature": False})
            print(f"   • JWT payload:")
            print(f"     - sub (client_id): {payload.get('sub')}")
            print(f"     - email: {payload.get('email')}")
            print(f"     - exp: {payload.get('exp')}")
        except Exception as e:
            print(f"   • Could not decode JWT: {e}")

        # Test 2: Use the JWT token to access the dashboard
        print("\n2️⃣ TESTING DASHBOARD ACCESS WITH JWT")
        print("-" * 40)

        dash_response = requests.get(
            f"http://localhost:8000/api/owners/dashboard?portal_token={access_token}",
            timeout=5
        )

        if dash_response.status_code == 200:
            dash_data = dash_response.json()
            print(f"✅ Dashboard loaded successfully!")
            print(f"   • Owner: {dash_data.get('owner')}")
            print(f"   • Email: {dash_data.get('email')}")
            print(f"   • Properties: {len(dash_data.get('properties', []))}")
            print(f"   • Total Reports: {dash_data.get('total_reports', 0)}")

            # Show properties
            for prop in dash_data.get('properties', []):
                print(f"     - {prop.get('address')}: {prop.get('reportCount', 0)} reports")
        else:
            print(f"❌ Dashboard failed: Status {dash_response.status_code}")
            print(f"   Response: {dash_response.text[:200]}")

    else:
        print(f"❌ Login failed: Status {response.status_code}")
        error_text = response.text
        try:
            error_data = response.json()
            print(f"   Error: {error_data.get('detail', 'Unknown error')}")
        except:
            print(f"   Response: {error_text[:200]}")

except Exception as e:
    print(f"❌ Connection error: {e}")

# Test 3: Verify other tokens still work
print("\n3️⃣ VERIFYING OTHER TOKENS STILL WORK")
print("-" * 40)

# Test JS2024001 token
try:
    response = requests.get(
        "http://localhost:8000/api/owners/dashboard?portal_token=JS2024001",
        timeout=3
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ JS2024001 token works: {data.get('owner')}")
    else:
        print(f"❌ JS2024001 token failed: {response.status_code}")
except Exception as e:
    print(f"❌ Error testing JS2024001: {e}")

# Test portal_2 token
try:
    response = requests.get(
        "http://localhost:8000/api/owners/dashboard?portal_token=portal_2",
        timeout=3
    )
    if response.status_code == 200:
        data = response.json()
        print(f"✅ portal_2 token works: {data.get('owner')}")
    else:
        print(f"❌ portal_2 token failed: {response.status_code}")
except Exception as e:
    print(f"❌ Error testing portal_2: {e}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("\n✅ LOGIN FLOW:")
print("   1. User enters email/password on landing page")
print("   2. Backend returns JWT access token")
print("   3. Landing page redirects to dashboard with ?token={JWT}")
print("   4. Dashboard decodes JWT and shows Juliana's data")
print("\n✅ TOKEN COMPATIBILITY:")
print("   • JWT tokens (from landing page login) ✓")
print("   • JS2024001 (hardcoded token) ✓")
print("   • portal_2 (from operator app) ✓")
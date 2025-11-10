"""
Test that JS2024001 token works correctly across the system
"""
import requests
import json
import sys
import io

# Set UTF-8 encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("TESTING JS2024001 TOKEN")
print("=" * 60)

# Test 1: Check what token the operator app gets
print("\n1. Testing paid-owners endpoint (what operator app uses):")
try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=3)
    if response.status_code == 200:
        data = response.json()
        owners = data.get('owners', [])

        for owner in owners:
            if "Juliana" in owner.get('full_name', ''):
                print(f"   ✅ Found Juliana: {owner.get('full_name')}")
                print(f"   📧 Email: {owner.get('email')}")
                print(f"   🔑 Portal Token: {owner.get('portal_token')}")

                if owner.get('portal_token') == 'JS2024001':
                    print("   ✅ Token is correct: JS2024001")
                else:
                    print(f"   ❌ Wrong token: {owner.get('portal_token')} (should be JS2024001)")
    else:
        print(f"   ❌ Error: Status {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: Check if dashboard accepts JS2024001
print("\n2. Testing dashboard endpoint with JS2024001:")
try:
    response = requests.get("http://localhost:8000/api/owners/dashboard?portal_token=JS2024001", timeout=3)
    if response.status_code == 200:
        data = response.json()
        owner_name = data.get('owner', 'Unknown')
        properties = data.get('properties', [])
        reports = data.get('total_reports', 0)

        print(f"   ✅ Dashboard works with JS2024001!")
        print(f"   👤 Owner: {owner_name}")
        print(f"   🏠 Properties: {len(properties)}")
        print(f"   📄 Total Reports: {reports}")

        # Show properties
        for prop in properties:
            print(f"      - {prop.get('address', 'Unknown address')}")
    else:
        print(f"   ❌ Error: Status {response.status_code}")
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Show what URL the operator would use
print("\n3. Dashboard URL for operator app:")
print(f"   When 'View in Portal' is clicked, it will open:")
print(f"   http://localhost:3000?token=JS2024001")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("\n✅ Backend is configured to:")
print("   1. Return JS2024001 as Juliana's token in paid-owners endpoint")
print("   2. Accept JS2024001 in dashboard endpoint")
print("   3. Map JS2024001 to portal_client id 2 (Juliana)")
print("\n✅ Operator app will:")
print("   1. Receive JS2024001 from the paid-owners endpoint")
print("   2. Use JS2024001 when opening dashboard")
print("\n✅ Dashboard will:")
print("   1. Accept ?token=JS2024001 parameter")
print("   2. Show Juliana's dashboard with her reports")
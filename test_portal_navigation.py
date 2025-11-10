"""
Test portal navigation from operator app
"""
import requests
import webbrowser
import json

print("=" * 60)
print("TESTING PORTAL NAVIGATION")
print("=" * 60)

# 1. Test the dashboard endpoint with portal_2 token
print("\n1. Testing dashboard endpoint with portal_2 token...")

dashboard_url = "http://localhost:8000/api/owners/dashboard?portal_token=portal_2"

try:
    response = requests.get(dashboard_url, timeout=5)

    if response.status_code == 200:
        data = response.json()
        print("   ✅ Dashboard endpoint works!")
        print(f"   Owner: {data.get('owner', 'Unknown')}")
        print(f"   Email: {data.get('email', 'Unknown')}")
        properties = data.get('properties', [])
        print(f"   Properties: {len(properties)}")
        for prop in properties:
            print(f"     - {prop.get('address', 'Unknown address')}")
    else:
        print(f"   ❌ Failed: Status {response.status_code}")
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# 2. Test the Next.js dashboard URL
print("\n2. Testing Next.js dashboard URL format...")

nextjs_url = "http://localhost:3000?token=portal_2"
print(f"   URL: {nextjs_url}")
print("   This URL should:")
print("     - Load the Next.js dashboard")
print("     - Detect 'portal_2' format")
print("     - Call /api/owners/dashboard?portal_token=portal_2")
print("     - Display Juliana's dashboard")

# 3. Simulate what the operator app does
print("\n3. Simulating operator app 'View in Portal' button...")

print("   The operator app will:")
print("   1. Get selected owner (Juliana Shewmaker)")
print("   2. Get portal_token (portal_2)")
print("   3. Build URL: http://localhost:3000?token=portal_2")
print("   4. Open in browser")

print("\n" + "=" * 60)
print("NAVIGATION TEST SUMMARY")
print("=" * 60)

print("\nTo complete the test:")
print("1. Make sure all services are running:")
print("   - Backend: cd backend && python -m uvicorn app.main:app --reload")
print("   - Next.js: cd nextjs-dashboard && npm run dev")
print("   - Operator: python operator_ui.py")

print("\n2. In the operator app:")
print("   - Select 'Juliana Shewmaker' from dropdown")
print("   - Click '📊 Dashboard' button")
print("   - Should open browser to: http://localhost:3000?token=portal_2")
print("   - Dashboard should load with Juliana's data")

response = input("\nDo you want to open the dashboard URL now? (yes/no): ").strip().lower()
if response == 'yes':
    webbrowser.open(nextjs_url)
    print("\n✅ Dashboard URL opened in browser!")
    print("Check if Juliana's dashboard loads correctly.")
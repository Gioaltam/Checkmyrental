"""
Test portal navigation from operator app (simple version)
"""
import requests
import webbrowser

print("TESTING PORTAL NAVIGATION")
print("-" * 40)

# Test the dashboard endpoint with portal_2 token
print("\nTesting dashboard endpoint...")

dashboard_url = "http://localhost:8000/api/owners/dashboard?portal_token=portal_2"

try:
    response = requests.get(dashboard_url, timeout=5)

    if response.status_code == 200:
        data = response.json()
        print("SUCCESS: Dashboard endpoint works!")
        print(f"  Owner: {data.get('owner', 'Unknown')}")
        print(f"  Email: {data.get('email', 'Unknown')}")
        properties = data.get('properties', [])
        print(f"  Properties: {len(properties)}")
    else:
        print(f"FAILED: Status {response.status_code}")
        print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")

# Build the Next.js URL
nextjs_url = "http://localhost:3000?token=portal_2"
print(f"\nNext.js Dashboard URL: {nextjs_url}")

print("\n" + "=" * 60)
print("To test the View in Portal button:")
print("1. Open the operator app")
print("2. Select 'Juliana Shewmaker' from dropdown")
print("3. Click 'Dashboard' button")
print("4. Browser should open to the dashboard")

response = input("\nOpen dashboard in browser now? (y/n): ").strip().lower()
if response == 'y':
    webbrowser.open(nextjs_url)
    print("\nDashboard opened in browser!")
    print("Check if Juliana's data loads correctly.")
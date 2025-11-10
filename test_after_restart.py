"""
Test the dashboard after backend restart
Run this AFTER restarting the backend server
"""
import requests
import json

print("POST-RESTART DASHBOARD TEST")
print("=" * 60)

# Test the dashboard endpoint
dashboard_url = "http://localhost:8000/api/owners/dashboard?portal_token=portal_2"

print("\nTesting dashboard endpoint...")

try:
    response = requests.get(dashboard_url, timeout=5)

    if response.status_code == 200:
        data = response.json()
        print("\nSUCCESS! Dashboard is working!")
        print("-" * 40)

        print(f"\nOwner: {data.get('owner')}")
        print(f"Email: {data.get('email')}")
        print(f"Total reports: {data.get('total_reports', 0)}")

        properties = data.get('properties', [])
        print(f"\nProperties: {len(properties)}")

        for prop in properties:
            print(f"\nProperty: {prop.get('label')}")
            print(f"  Address: {prop.get('address')}")
            print(f"  Reports: {prop.get('reportCount', 0)}")

            reports = prop.get('reports', [])
            if reports:
                print(f"  Recent reports:")
                for r in reports[:2]:
                    print(f"    - Date: {r.get('date', 'N/A')}")
                    print(f"      Critical: {r.get('criticalIssues', 0)}")
                    print(f"      Important: {r.get('importantIssues', 0)}")

        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("=" * 60)
        print("\n1. Open the dashboard in browser:")
        print("   http://localhost:3000?token=portal_2")
        print("\n2. You should see:")
        print("   - Juliana Shewmaker as the owner")
        print("   - 904 Marshal St property")
        print("   - Any test reports")
        print("\n3. Upload a new ZIP through the operator app:")
        print("   - Select 'Juliana Shewmaker' from dropdown")
        print("   - Upload a ZIP file")
        print("   - Click 'Dashboard' button to view it")

    elif response.status_code == 500:
        print("\nERROR: Still getting 500 error!")
        print("Backend may not have restarted properly.")
        print("\nTry:")
        print("1. Kill all Python processes")
        print("2. Delete backend/__pycache__ folder")
        print("3. Restart backend with:")
        print("   cd backend && python -m uvicorn app.main:app --reload")

    else:
        print(f"\nUnexpected status: {response.status_code}")
        print(f"Response: {response.text[:200]}")

except requests.exceptions.ConnectionError:
    print("\nERROR: Cannot connect to backend!")
    print("Make sure the backend is running on http://localhost:8000")
except Exception as e:
    print(f"\nERROR: {e}")

print("\n" + "=" * 60)
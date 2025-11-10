"""
Final test of the dashboard with reports
"""
import requests
import json

print("FINAL DASHBOARD TEST")
print("=" * 60)

# Test the dashboard endpoint
dashboard_url = "http://localhost:8000/api/owners/dashboard?portal_token=portal_2"

print("\nFetching dashboard data...")
print(f"URL: {dashboard_url}")

try:
    response = requests.get(dashboard_url, timeout=5)

    if response.status_code == 200:
        data = response.json()
        print("\nSUCCESS: Dashboard endpoint works!")
        print(f"Owner: {data.get('owner')}")
        print(f"Email: {data.get('email')}")
        print(f"Total reports: {data.get('total_reports', 0)}")

        properties = data.get('properties', [])
        print(f"\nProperties: {len(properties)}")

        for prop in properties:
            print(f"\n  Property: {prop.get('label', prop.get('address'))}")
            print(f"  Address: {prop.get('address')}")
            print(f"  Report Count: {prop.get('reportCount', 0)}")
            print(f"  Critical Issues: {prop.get('criticalIssues', 0)}")
            print(f"  Important Issues: {prop.get('importantIssues', 0)}")

            reports = prop.get('reports', [])
            if reports:
                print(f"  Recent Reports ({len(reports)} total):")
                for r in reports[:3]:  # Show first 3
                    print(f"    - ID: {r.get('id')}")
                    print(f"      Date: {r.get('date')}")
                    print(f"      Critical: {r.get('criticalIssues')}")
                    print(f"      Important: {r.get('importantIssues')}")
                    print(f"      Has PDF: {r.get('hasPdf')}")
            else:
                print("  No reports yet")

    else:
        print(f"\nERROR: Status {response.status_code}")
        print(f"Response: {response.text[:500]}")
except requests.exceptions.ConnectionError:
    print("\nERROR: Cannot connect to backend")
    print("Make sure backend is running with: cd backend && python -m uvicorn app.main:app --reload")
except Exception as e:
    print(f"\nERROR: {e}")

print("\n" + "=" * 60)
print("SUMMARY:")
print("=" * 60)

print("\nIf you see reports above, the system is working!")
print("\nTo complete the test:")
print("1. Open Next.js dashboard: http://localhost:3000?token=portal_2")
print("2. You should see Juliana's property with the test reports")
print("3. Upload a new ZIP through the operator app")
print("4. The new report should appear in the dashboard")
print("\nNote: Backend must be restarted after model changes!")
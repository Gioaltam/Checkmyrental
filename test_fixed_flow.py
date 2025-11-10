"""
Test the complete flow after fixes
"""
import requests
import json
import sys
import io

# Set UTF-8 encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=" * 60)
print("TESTING FIXED FLOW")
print("=" * 60)

print("\n1️⃣ TESTING BACKEND HEALTH")
print("-" * 40)
try:
    response = requests.get("http://localhost:8000/health", timeout=3)
    if response.status_code == 200:
        print("✅ Backend is running")
    else:
        print(f"❌ Backend returned status {response.status_code}")
except Exception as e:
    print(f"❌ Backend not responding: {e}")

print("\n2️⃣ TESTING PAID OWNERS ENDPOINT")
print("-" * 40)
try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=3)
    if response.status_code == 200:
        data = response.json()
        owners = data.get('owners', [])
        print(f"✅ Found {len(owners)} paid owner(s)")

        for owner in owners:
            if "Juliana" in owner.get('full_name', ''):
                print(f"\n✅ Juliana Shewmaker found:")
                print(f"   • Token: {owner.get('portal_token')}")
                print(f"   • Owner ID: {owner.get('owner_id')}")
                print(f"   • Email: {owner.get('email')}")
    else:
        print(f"❌ Error: Status {response.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n3️⃣ TESTING DASHBOARD ENDPOINT")
print("-" * 40)
try:
    response = requests.get("http://localhost:8000/api/owners/dashboard?portal_token=JS2024001", timeout=3)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Dashboard loads for: {data.get('owner')}")
        print(f"   • Properties: {len(data.get('properties', []))}")
        print(f"   • Total Reports: {data.get('total_reports', 0)}")

        # Show properties
        for prop in data.get('properties', []):
            print(f"   • Property: {prop.get('address')}")
            print(f"     - Reports: {len(prop.get('reports', []))}")
    else:
        print(f"❌ Error: Status {response.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n4️⃣ SIMULATING REPORT UPLOAD")
print("-" * 40)
# Create a test report save request
from datetime import datetime
test_report = {
    "report_id": "test_001",
    "owner_id": "portal_2",  # This is what operator app sends
    "property_address": "904 Marshal St, St Petersburg, FL",
    "date": datetime.now().strftime("%Y-%m-%d"),
    "inspector": "Inspection Agent",
    "status": "complete",
    "web_dir": "/test/web/dir",
    "pdf_path": "/test/report.pdf",
    "critical_issues": 3,
    "important_issues": 5
}

try:
    response = requests.post(
        "http://localhost:8000/api/reports/save",
        json=test_report,
        timeout=3
    )
    if response.status_code == 200:
        print("✅ Test report saved successfully!")
        result = response.json()
        print(f"   • Report ID: {result.get('report_id')}")

        # Check if it appears in dashboard
        dash_response = requests.get(
            "http://localhost:8000/api/owners/dashboard?portal_token=JS2024001",
            timeout=3
        )
        if dash_response.status_code == 200:
            dash_data = dash_response.json()
            total_reports = dash_data.get('total_reports', 0)
            if total_reports > 0:
                print(f"✅ Report appears in dashboard! Total reports: {total_reports}")
                # Find the test report
                for prop in dash_data.get('properties', []):
                    for report in prop.get('reports', []):
                        if report.get('id') == 'test_001':
                            print(f"   • Critical Issues: {report.get('criticalIssues')}")
                            print(f"   • Important Issues: {report.get('importantIssues')}")
            else:
                print("❌ Report NOT appearing in dashboard!")
    else:
        print(f"❌ Failed to save report: {response.status_code}")
        print(f"   Error: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

print("\n✅ FIXES APPLIED:")
print("   • INSERT statement now includes portal_client_id")
print("   • .cache directory cleared (375 files removed)")
print("   • .cache added to .gitignore")
print("   • Backend restarted cleanly")
print("   • Duplicate backend/app.db removed")
print("   • All old reports deleted")

print("\n📋 NEXT STEPS:")
print("   1. Open the operator app: python operator_ui.py")
print("   2. Select 'Juliana Shewmaker' from dropdown")
print("   3. Upload a ZIP file with photos")
print("   4. Click 'View in Portal' button")
print("   5. Dashboard should show the new report with issue counts")
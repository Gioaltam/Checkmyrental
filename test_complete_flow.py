"""
Test the complete upload and display flow
"""
import sqlite3
import requests
import json
from pathlib import Path
from datetime import datetime
import uuid

print("TESTING COMPLETE UPLOAD AND DISPLAY FLOW")
print("=" * 60)

# 1. Insert a test report directly to verify dashboard works
print("\n1. Inserting test report for Juliana...")

db_path = Path("backend/app.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create a test report linked to Juliana (portal_client_id = 2)
test_report_id = str(uuid.uuid4())[:8]
test_data = (
    test_report_id,                        # id
    "test_property_1",                     # property_id
    "904 Marshal St, St Petersburg, FL",   # address
    datetime.now().isoformat(),            # inspection_date
    "test/report.pdf",                     # pdf_path
    "test/report.json",                    # json_path
    None,                                   # photos
    None,                                   # pdf_standard_url
    None,                                   # pdf_hq_url
    None,                                   # pdf_hq_expires_at
    None,                                   # json_url
    "Test report for Juliana",             # summary
    2,                                      # critical_count
    5,                                      # important_count
    datetime.now().isoformat(),            # created_at
    2,                                      # portal_client_id
    "904 Marshal St"                       # property_name
)

try:
    cursor.execute("""
        INSERT INTO reports (
            id, property_id, address, inspection_date,
            pdf_path, json_path, photos,
            pdf_standard_url, pdf_hq_url, pdf_hq_expires_at,
            json_url, summary, critical_count, important_count,
            created_at, portal_client_id, property_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, test_data)
    conn.commit()
    print(f"   SUCCESS: Test report inserted with ID: {test_report_id}")
except sqlite3.IntegrityError:
    print(f"   Report with ID {test_report_id} already exists")
except Exception as e:
    print(f"   ERROR: {e}")

# 2. Check if report is in database
print("\n2. Verifying report in database...")
cursor.execute("""
    SELECT id, address, portal_client_id, created_at
    FROM reports
    WHERE portal_client_id = 2
    ORDER BY created_at DESC
    LIMIT 1
""")
report = cursor.fetchone()

if report:
    print(f"   Found report: {report[0]}")
    print(f"   Address: {report[1]}")
    print(f"   Portal Client ID: {report[2]}")
    print(f"   Created: {report[3]}")
else:
    print("   ERROR: No reports found for portal_client_id = 2")

conn.close()

# 3. Test the dashboard endpoint
print("\n3. Testing dashboard endpoint...")

dashboard_url = "http://localhost:8000/api/owners/dashboard?portal_token=portal_2"

try:
    response = requests.get(dashboard_url, timeout=5)

    if response.status_code == 200:
        data = response.json()
        print("   SUCCESS: Dashboard endpoint works")
        print(f"   Owner: {data.get('owner')}")
        print(f"   Total reports in response: {data.get('total_reports', 0)}")

        properties = data.get('properties', [])
        for prop in properties:
            reports = prop.get('reports', [])
            if reports:
                print(f"\n   Property: {prop.get('label')}")
                print(f"   Reports: {len(reports)}")
                for r in reports[:2]:  # Show first 2 reports
                    print(f"     - ID: {r.get('id')}")
                    print(f"       Date: {r.get('date')}")
                    print(f"       Critical: {r.get('criticalIssues')}")
                    print(f"       Important: {r.get('importantIssues')}")
    else:
        print(f"   ERROR: Status {response.status_code}")
        print(f"   Response: {response.text[:300]}")
except Exception as e:
    print(f"   ERROR: {e}")

# 4. Test report save endpoint with proper portal_client_id
print("\n4. Testing report save endpoint...")

save_url = "http://localhost:8000/api/reports/save"
save_data = {
    "report_id": f"test_{str(uuid.uuid4())[:8]}",
    "owner_id": "portal_2",
    "property_address": "904 Marshal St, St Petersburg, FL",
    "date": datetime.now().isoformat(),
    "inspector": "Test Inspector",
    "status": "completed",
    "web_dir": "test/web",
    "pdf_path": "test/report2.pdf",
    "critical_issues": 3,
    "important_issues": 7
}

try:
    response = requests.post(save_url, json=save_data, timeout=5)

    if response.status_code == 200:
        result = response.json()
        print(f"   SUCCESS: Report saved via API")
        print(f"   Report ID: {result.get('report_id')}")
    else:
        print(f"   ERROR: Status {response.status_code}")
        print(f"   Response: {response.text[:300]}")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 60)
print("FLOW TEST COMPLETE")
print("=" * 60)
print("\nTo verify the complete flow:")
print("1. Refresh the Next.js dashboard (http://localhost:3000?token=portal_2)")
print("2. You should see the test reports under Juliana's property")
print("3. Upload a new ZIP through the operator app")
print("4. It should appear in the dashboard immediately")
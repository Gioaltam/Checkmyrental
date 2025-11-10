"""
Debug the upload issue step by step
"""
import os
import sqlite3
from pathlib import Path
import json

print("=== DEBUGGING UPLOAD ISSUE ===\n")

# 1. Check environment
print("1. Environment Check:")
api_key = os.getenv("OPENAI_API_KEY", "")
print(f"   OPENAI_API_KEY exists: {bool(api_key)}")
if api_key:
    print(f"   Key length: {len(api_key)} characters")

print()

# 2. Check backend database
print("2. Backend Database Check:")
backend_db = Path("backend/app.db")
if backend_db.exists():
    print(f"   ✅ Backend database exists: {backend_db}")

    conn = sqlite3.connect(backend_db)
    cursor = conn.cursor()

    # Check portal_clients table
    cursor.execute("SELECT COUNT(*) FROM portal_clients WHERE is_paid = 1")
    paid_count = cursor.fetchone()[0]
    print(f"   Paid portal clients: {paid_count}")

    # Check Juliana specifically
    cursor.execute("SELECT * FROM portal_clients WHERE email = 'julianagomesfl@yahoo.com'")
    juliana = cursor.fetchone()
    if juliana:
        print(f"   ✅ Juliana found in portal_clients")
        print(f"      ID: {juliana[0]}")
        print(f"      Is Paid: {juliana[7]}")
    else:
        print(f"   ❌ Juliana NOT found in portal_clients")

    conn.close()
else:
    print(f"   ❌ Backend database NOT found at {backend_db}")

print()

# 3. Check workspace database
print("3. Workspace Database Check:")
workspace_db = Path("../workspace/inspection_portal.db")
if workspace_db.exists():
    print(f"   ✅ Workspace database exists: {workspace_db}")
else:
    workspace_db = Path("workspace/inspection_portal.db")
    if workspace_db.exists():
        print(f"   ✅ Workspace database exists: {workspace_db}")
    else:
        print(f"   ❌ Workspace database NOT found")

print()

# 4. Check if backend is running
print("4. Backend Server Check:")
import requests
try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=2)
    if response.status_code == 200:
        data = response.json()
        owners = data.get('owners', [])
        print(f"   ✅ Backend is running")
        print(f"   Found {len(owners)} paid owners")
        for owner in owners:
            print(f"      - {owner.get('full_name')} (ID: {owner.get('owner_id')})")
    else:
        print(f"   ⚠️ Backend returned status {response.status_code}")
except requests.exceptions.ConnectionError:
    print(f"   ❌ Backend is NOT running on http://localhost:8000")
except Exception as e:
    print(f"   ❌ Error checking backend: {e}")

print()

# 5. Check for test ZIP files
print("5. Test ZIP Files:")
zip_files = list(Path(".").glob("*.zip"))
if zip_files:
    print(f"   Found {len(zip_files)} ZIP files:")
    for zf in zip_files[:3]:  # Show first 3
        print(f"      - {zf.name}")
else:
    print(f"   ❌ No ZIP files found in current directory")

print()

# 6. Test report save endpoint
print("6. Test Report Save Endpoint:")
test_data = {
    "report_id": "test_123",
    "owner_id": "portal_2",
    "property_address": "123 Test St",
    "date": "2025-01-01T00:00:00",
    "inspector": "Test Inspector",
    "status": "completed",
    "web_dir": "test/web",
    "pdf_path": "test/report.pdf",
    "critical_issues": 0,
    "important_issues": 0
}

try:
    response = requests.post(
        "http://localhost:8000/api/reports/save",
        json=test_data,
        timeout=5
    )
    if response.status_code == 200:
        print(f"   ✅ Report save endpoint works")
        result = response.json()
        print(f"      Response: {result.get('message', 'Success')}")
    else:
        print(f"   ❌ Save endpoint failed with status {response.status_code}")
        print(f"      Response: {response.text[:200]}")
except requests.exceptions.ConnectionError:
    print(f"   ❌ Cannot connect to backend server")
except Exception as e:
    print(f"   ❌ Error testing save endpoint: {e}")

print("\n" + "="*60)
print("DIAGNOSIS SUMMARY:")
print("Check the ❌ marks above to identify the issue")
print("\nCommon fixes:")
print("1. Make sure backend is running: cd backend && python -m uvicorn app.main:app --reload")
print("2. Make sure OPENAI_API_KEY is set in .env file")
print("3. Make sure you have a valid ZIP file to upload")
print("4. Check that the owner_id format (portal_2) is handled correctly")
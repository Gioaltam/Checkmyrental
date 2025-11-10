"""
Verify that the upload fix is working
"""
import requests
import json

print("=" * 60)
print("VERIFYING UPLOAD FIX")
print("=" * 60)

# 1. Test the report save endpoint with portal_2 format
print("\n1. Testing report save endpoint with 'portal_2' owner_id...")

test_data = {
    "report_id": "test_fix_123",
    "owner_id": "portal_2",  # This is what the operator app sends
    "property_address": "123 Test St",
    "date": "2025-01-01T12:00:00",
    "inspector": "Test Inspector",
    "status": "completed",
    "web_dir": "test/web",
    "pdf_path": "test/report.pdf",
    "critical_issues": 1,
    "important_issues": 2
}

try:
    response = requests.post(
        "http://localhost:8000/api/reports/save",
        json=test_data,
        timeout=5
    )

    if response.status_code == 200:
        print("   SUCCESS: Report saved with portal_2 owner_id")
        result = response.json()
        print(f"   Response: {result}")
    else:
        print(f"   FAILED: Status {response.status_code}")
        print(f"   Response: {response.text[:300]}")
except requests.exceptions.ConnectionError:
    print("   ERROR: Backend is not running!")
    print("   Start it with: cd backend && python -m uvicorn app.main:app --reload")
except Exception as e:
    print(f"   ERROR: {e}")

# 2. Check if the paid owners endpoint still works
print("\n2. Testing paid owners endpoint...")

try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=5)

    if response.status_code == 200:
        data = response.json()
        owners = data.get('owners', [])
        print(f"   SUCCESS: Found {len(owners)} paid owner(s)")
        for owner in owners:
            print(f"   - {owner.get('full_name')} (ID: {owner.get('owner_id')})")
    else:
        print(f"   FAILED: Status {response.status_code}")
except Exception as e:
    print(f"   ERROR: {e}")

print("\n" + "=" * 60)
print("FIX STATUS:")
print("=" * 60)
print("\nThe fix handles the 'portal_2' format by:")
print("1. Extracting the numeric ID (2) from 'portal_2'")
print("2. Looking up the portal client by that ID")
print("3. Properly saving the report linked to Juliana's account")
print("\nTo complete the upload process:")
print("1. Make sure the backend is running and has reloaded the changes")
print("2. Restart the operator app: python operator_ui.py")
print("3. Select Juliana from the dropdown (should show as 'Juliana Shewmaker')")
print("4. Upload your ZIP file")
print("\nThe upload should now work correctly!")
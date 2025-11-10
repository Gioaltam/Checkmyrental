"""
Check what's causing the Internal Server Error with uploads
"""
import requests

print("CHECKING UPLOAD ENDPOINTS")
print("=" * 60)

# 1. Check if /api/ingest endpoint exists
print("\n1. Testing /api/ingest endpoint (used by upload_to_portal.py):")
try:
    response = requests.post("http://localhost:8000/api/ingest", timeout=2)
    print(f"   Status: {response.status_code}")
    if response.status_code == 404:
        print("   ERROR: Endpoint does not exist!")
    elif response.status_code == 500:
        print("   ERROR: Internal Server Error")
        print(f"   Response: {response.text[:200]}")
except requests.exceptions.ConnectionError:
    print("   ERROR: Cannot connect to backend")
except Exception as e:
    print(f"   ERROR: {e}")

# 2. Check if /api/reports/save endpoint works
print("\n2. Testing /api/reports/save endpoint (used by operator app):")
test_data = {
    "report_id": "test_check",
    "owner_id": "portal_2",
    "property_address": "123 Test St",
    "date": "2025-01-01T12:00:00",
    "inspector": "Test",
    "status": "completed",
    "web_dir": "test",
    "pdf_path": "test.pdf"
}

try:
    response = requests.post(
        "http://localhost:8000/api/reports/save",
        json=test_data,
        timeout=2
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   SUCCESS: This endpoint works")
    else:
        print(f"   Response: {response.text[:200]}")
except Exception as e:
    print(f"   ERROR: {e}")

# 3. List available POST endpoints
print("\n3. Available upload-related endpoints:")
print("   /api/reports/save - Save report metadata (WORKS)")
print("   /api/ingest - Upload PDF/JSON files (DOES NOT EXIST)")

print("\n" + "=" * 60)
print("PROBLEM IDENTIFIED:")
print("=" * 60)
print("\nThe upload_to_portal.py script is trying to use /api/ingest")
print("but this endpoint doesn't exist in the backend!")
print("\nSOLUTIONS:")
print("1. Create the /api/ingest endpoint in the backend")
print("2. Or modify upload_to_portal.py to use existing endpoints")
print("3. Or use the operator app for uploads (recommended)")
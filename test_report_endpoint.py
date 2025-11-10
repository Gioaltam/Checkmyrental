#!/usr/bin/env python3
"""Test if the report save endpoint is accessible"""

import requests
import json

# Test the endpoint
api_url = "http://localhost:8000/api/reports/save"

print("Testing Report Save Endpoint")
print("=" * 50)
print(f"URL: {api_url}")

# Test if the endpoint exists
try:
    # Send a GET request first to check if endpoint responds
    response = requests.get("http://localhost:8000/api/reports/list")
    print(f"[OK] Backend is running on port 8000")
    print(f"   /api/reports/list returned status: {response.status_code}")

    # Test if save endpoint exists by sending minimal data
    test_data = {
        "report_id": "test",
        "owner_id": "test",
        "property_address": "test",
        "date": "2024-01-01",
        "inspector": "test",
        "status": "test",
        "web_dir": "test",
        "pdf_path": "test"
    }

    print(f"\n[TEST] Testing POST to /api/reports/save...")
    response = requests.post(api_url, json=test_data, timeout=5)
    print(f"   Status Code: {response.status_code}")

    if response.status_code == 200:
        print("[SUCCESS] Report save endpoint is working!")
    else:
        print(f"[WARNING] Endpoint returned status {response.status_code}")
        print(f"   Response: {response.text}")

except requests.exceptions.ConnectionError:
    print("[ERROR] Cannot connect to backend on port 8000")
    print("   Make sure backend is running: cd backend && python -m uvicorn app.main:app --reload")
except Exception as e:
    print(f"[ERROR] Error: {e}")

print("=" * 50)
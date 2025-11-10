#!/usr/bin/env python3
"""Test saving a report specifically for Juliana's dashboard"""

import requests
import json
from datetime import datetime

# Test the endpoint
api_url = "http://localhost:8000/api/reports/save"

print("Testing Report Save for Juliana's Dashboard")
print("=" * 50)

# Simulate report data from run_report.py for Juliana
report_data = {
    "report_id": f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
    "owner_id": "DEMO1234",  # Juliana's owner_id
    "property_address": "2460 Melrose Ave S",
    "date": datetime.now().isoformat(),
    "inspector": "CheckMyRental Inspector",
    "status": "completed",
    "web_dir": "outputs/2460_Melrose_Ave_S/web",
    "pdf_path": "outputs/2460_Melrose_Ave_S/report.pdf",
    "critical_issues": 2,
    "important_issues": 5
}

print(f"Sending report with owner_id: {report_data['owner_id']}")
print(f"Property: {report_data['property_address']}")
print(f"Report ID: {report_data['report_id']}")

try:
    response = requests.post(api_url, json=report_data, timeout=5)
    print(f"\nResponse Status: {response.status_code}")

    if response.status_code == 200:
        print("[SUCCESS] Report saved to Juliana's dashboard!")
        print(f"Response: {response.json()}")
    else:
        print(f"[ERROR] Failed to save report")
        print(f"Response: {response.text}")

except Exception as e:
    print(f"[ERROR] Error: {e}")

print("=" * 50)
print("\nNow check Juliana's dashboard to see if the report appears.")
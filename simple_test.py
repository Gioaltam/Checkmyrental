"""
Simple test to check if backend is working
"""
import requests

print("Testing backend...")

url = "http://localhost:8000/api/owners/dashboard?portal_token=portal_2"

try:
    r = requests.get(url, timeout=3)
    if r.status_code == 200:
        print("SUCCESS! Backend is working correctly!")
        data = r.json()
        print(f"Owner: {data.get('owner')}")
        print(f"Reports: {data.get('total_reports', 0)}")
    else:
        print(f"ERROR: Status {r.status_code}")
        if r.status_code == 500:
            print("Backend still has old schema cached")
            print("Try: RESTART_BACKEND.bat")
except:
    print("ERROR: Backend not running")
    print("Start with: RESTART_BACKEND.bat")
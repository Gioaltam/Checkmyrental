"""
Diagnose the exact backend issue
"""
import requests
import subprocess
import time

print("DIAGNOSING BACKEND ISSUE")
print("=" * 60)

# 1. Check if backend is running
print("\n1. Checking if backend is responding...")
try:
    r = requests.get("http://localhost:8000/docs", timeout=2)
    if r.status_code == 200:
        print("   Backend IS running (docs page works)")
    else:
        print(f"   Backend returned status: {r.status_code}")
except requests.exceptions.ConnectionError:
    print("   Backend is NOT running!")
    print("   Please start it first")
    exit(1)

# 2. Test a simple endpoint
print("\n2. Testing simple endpoint...")
try:
    r = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=2)
    if r.status_code == 200:
        print("   Simple endpoints work")
    else:
        print(f"   Error: Status {r.status_code}")
except Exception as e:
    print(f"   Error: {e}")

# 3. Test the problematic endpoint
print("\n3. Testing dashboard endpoint...")
try:
    r = requests.get("http://localhost:8000/api/owners/dashboard?portal_token=portal_2", timeout=2)
    if r.status_code == 200:
        print("   SUCCESS: Dashboard works!")
    elif r.status_code == 500:
        print("   ERROR 500: Internal Server Error")
        print("\n   Checking error details...")

        # Try to get more error info
        try:
            error_text = r.text
            if "portal_client_id" in error_text:
                print("   PROBLEM: Still using old schema without portal_client_id")
                print("\n   SOLUTION:")
                print("   1. The models.py file needs to be re-imported")
                print("   2. Try deleting backend/app/models.pyc if it exists")
                print("   3. Make sure models.py was saved with the new columns")
            else:
                print(f"   Error: {error_text[:200]}")
        except:
            pass
except Exception as e:
    print(f"   Error: {e}")

# 4. Check Python version
print("\n4. Python version check:")
import sys
print(f"   Python: {sys.version}")
print(f"   Executable: {sys.executable}")

print("\n" + "=" * 60)
print("RECOMMENDATIONS:")
print("=" * 60)
print("\n1. Try running backend directly (not via uvicorn):")
print("   cd backend")
print("   python -c \"from app.models import Report; print(hasattr(Report, 'portal_client_id'))\"")
print("\n2. If that shows 'False', the models.py isn't being read correctly")
print("\n3. Try running backend with explicit module reload:")
print("   python -c \"import importlib; import app.models; importlib.reload(app.models)\"")
print("   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
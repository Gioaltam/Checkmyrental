#!/usr/bin/env python3
"""
Final Production Test - Verify JS2024001 is working
"""

import requests
import json
import sqlite3

print("="*60)
print("FINAL PRODUCTION VERIFICATION")
print("="*60)

# Step 1: Check database directly
print("\n1. Checking database directly...")
try:
    conn = sqlite3.connect('backend/app.db')
    cur = conn.cursor()

    cur.execute("SELECT portal_token, is_paid FROM clients WHERE email = 'julianagomesfl@yahoo.com'")
    result = cur.fetchone()

    if result:
        print(f"   Database: portal_token={result[0]}, is_paid={result[1]}")
        if result[0] == 'JS2024001':
            print("   [OK] Database has correct JS2024001")
        else:
            print(f"   [ERROR] Database has {result[0]} instead of JS2024001")
    else:
        print("   [ERROR] Juliana not found in database")

    conn.close()
except Exception as e:
    print(f"   Database error: {e}")

# Step 2: Test API endpoint
print("\n2. Testing API endpoint...")
try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners", timeout=3)

    if response.status_code == 200:
        data = response.json()
        owners = data.get("owners", [])

        print(f"   Found {len(owners)} paid owners")

        juliana_found = False
        for owner in owners:
            if owner.get('email') == 'julianagomesfl@yahoo.com':
                juliana_found = True
                print(f"\n   Juliana Shewmaker:")
                print(f"   - Owner ID: {owner.get('owner_id')}")
                print(f"   - Portal Token: {owner.get('portal_token')}")
                print(f"   - Is Paid: {owner.get('is_paid')}")

                if owner.get('owner_id') == 'JS2024001':
                    print("   [OK] API returns correct JS2024001")
                else:
                    print(f"   [ERROR] API returns {owner.get('owner_id')} instead of JS2024001")
                break

        if not juliana_found:
            print("   [ERROR] Juliana not found in API response")
    else:
        print(f"   [ERROR] API returned status {response.status_code}")

except requests.exceptions.ConnectionError:
    print("   [ERROR] Cannot connect to backend at http://localhost:8000")
    print("   Make sure to start the backend first:")
    print("   cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
except Exception as e:
    print(f"   API error: {e}")

# Step 3: Check source code
print("\n3. Checking source code...")
try:
    with open('backend/app/api/client.py', 'r') as f:
        content = f.read()

    if 'DEMO1234' in content:
        print("   [ERROR] Source code still contains DEMO1234")
        # Count occurrences
        count = content.count('DEMO1234')
        print(f"   Found {count} occurrences of DEMO1234")
    else:
        print("   [OK] Source code has no DEMO1234")

    if 'JS2024001' in content:
        print("   [OK] Source code contains JS2024001")
    else:
        print("   [WARNING] Source code doesn't contain JS2024001")

except Exception as e:
    print(f"   Source code error: {e}")

print("\n" + "="*60)
print("VERIFICATION COMPLETE")
print("="*60)

print("\nNEXT STEPS:")
print("1. If backend is not running, start it:")
print("   cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000")
print("\n2. Once API shows JS2024001, start the operator app:")
print("   python operator_ui.py")
print("\n3. In the operator app:")
print("   - Click Refresh")
print("   - Select 'Juliana Shewmaker (JS2024001)'")
print("   - Process your inspection files")
print("="*60)
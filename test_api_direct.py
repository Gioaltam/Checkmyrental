#!/usr/bin/env python3
"""
Test API directly to see what it returns
"""

import requests
import json

print("Testing API directly...")
print("="*40)

try:
    response = requests.get("http://localhost:8000/api/owners/paid-owners")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('owners', []))} owners:")
        for owner in data.get('owners', []):
            print(f"\n  Name: {owner.get('full_name')}")
            print(f"  Owner ID: {owner.get('owner_id')}")
            print(f"  Token: {owner.get('portal_token')}")

        if any(o.get('owner_id') == 'JS2024001' for o in data.get('owners', [])):
            print("\nSUCCESS! API returns JS2024001")
        else:
            print("\nPROBLEM! API still returning old data")
            print("Backend needs complete restart!")
    else:
        print(f"API error: {response.status_code}")
except Exception as e:
    print(f"Cannot connect: {e}")
    print("Is backend running?")
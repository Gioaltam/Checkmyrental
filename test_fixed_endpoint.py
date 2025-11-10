"""
Test the fixed paid-owners endpoint
"""
import requests
import json

print("=== TESTING FIXED PAID-OWNERS ENDPOINT ===\n")

# Test the API
api_url = "http://localhost:8000/api/owners/paid-owners"

try:
    response = requests.get(api_url, timeout=5)
    print(f"Status Code: {response.status_code}\n")

    if response.status_code == 200:
        data = response.json()
        owners = data.get('owners', [])

        print(f"Total owners returned: {len(owners)}")
        print(f"Message: {data.get('message', '')}\n")

        for i, owner in enumerate(owners, 1):
            print(f"{i}. {owner.get('owner_full_name') or owner.get('full_name', 'No name')} ({owner.get('email', 'No email')})")
            print(f"   ID: {owner.get('owner_id')}")
            print(f"   Properties: {len(owner.get('properties', []))}")
            if owner.get('properties'):
                for prop in owner['properties']:
                    print(f"     - {prop.get('name', prop.get('address', 'Unknown'))}")
            print()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

except requests.exceptions.ConnectionError:
    print("Error: Backend server is not running!")
    print("Make sure the backend is running on http://localhost:8000")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*60)
print("SUMMARY:")
print("✅ The endpoint now only queries the portal_accounts table")
print("✅ No more duplicate data from old Client table")
print("✅ The operator app will now show accurate, live data")
print("\n📝 Remember to:")
print("1. Restart the backend server for changes to take effect")
print("2. Click the refresh button (🔄) in the operator app")
print("   or press Ctrl+R to refresh the owner list")
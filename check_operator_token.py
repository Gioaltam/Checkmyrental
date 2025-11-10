"""
Check what token the operator app is getting from the backend
"""
import requests
import json

print("CHECKING OPERATOR APP TOKEN FLOW")
print("=" * 60)

# This is what the operator app calls to get owner list
url = "http://localhost:8000/api/owners/paid-owners"

try:
    response = requests.get(url, timeout=3)

    if response.status_code == 200:
        data = response.json()
        owners = data.get('owners', [])

        print(f"\nFound {len(owners)} paid owners:")

        for owner in owners:
            print(f"\n  Owner: {owner.get('full_name')}")
            print(f"  Email: {owner.get('email')}")
            print(f"  Owner ID: {owner.get('owner_id')}")
            print(f"  Portal Token: {owner.get('portal_token')}")
            print(f"  ID: {owner.get('id')}")

            if "Juliana" in owner.get('full_name', ''):
                print("\n  >>> This is Juliana!")
                print(f"  >>> Operator app will use token: {owner.get('portal_token')}")
                print(f"  >>> Dashboard URL will be: http://localhost:3000?token={owner.get('portal_token')}")

                # Check if this needs to be updated
                if owner.get('portal_token') != 'JS2024001':
                    print("\n  ⚠️ TOKEN MISMATCH!")
                    print(f"     Current: {owner.get('portal_token')}")
                    print(f"     Should be: JS2024001")
    else:
        print(f"Error: Status {response.status_code}")

except Exception as e:
    print(f"Error: {e}")

print("\n" + "=" * 60)
print("The operator app uses the 'portal_token' field from this API response.")
print("If it's not JS2024001, we need to update the /api/owners/paid-owners endpoint.")
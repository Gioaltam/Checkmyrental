import requests
import json

# Test what the backend API is actually returning
api_url = "http://localhost:8000/api/owners/paid-owners"

print("=== Testing Paid Owners API ===\n")
print(f"URL: {api_url}\n")

try:
    response = requests.get(api_url, timeout=5)
    print(f"Status Code: {response.status_code}\n")

    if response.status_code == 200:
        data = response.json()
        print(f"Total owners returned: {len(data)}\n")

        for i, owner in enumerate(data, 1):
            print(f"{i}. {owner.get('owner_full_name', 'No name')} ({owner.get('email', 'No email')})")
            print(f"   ID: {owner.get('id')}")
            print(f"   Properties: {owner.get('property_count', 0)}")
            print()

        print("\nRaw JSON response:")
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

except requests.exceptions.ConnectionError:
    print("Error: Backend server is not running!")
    print("Make sure the backend is running on http://localhost:8000")
except Exception as e:
    print(f"Error: {e}")

print("\n" + "="*50)
print("If this shows 3 accounts but the database only has 1,")
print("the issue is in the backend API logic.")
print("Check: backend/app/api/portal_accounts.py")
"""
Test which token works for Juliana's dashboard
"""
import requests

print("TESTING JULIANA'S TOKENS")
print("=" * 60)

tokens = [
    "portal_2",      # Format based on portal_clients.id
    "DEMO1234",      # From portal_client_tokens table
    "JS2024001",     # From old clients table
]

base_url = "http://localhost:8000/api/owners/dashboard"

for token in tokens:
    print(f"\nTesting token: {token}")
    url = f"{base_url}?portal_token={token}"

    try:
        response = requests.get(url, timeout=3)

        if response.status_code == 200:
            data = response.json()
            owner = data.get('owner', 'Unknown')
            email = data.get('email', 'Unknown')
            props = data.get('properties', [])

            print(f"  SUCCESS!")
            print(f"  Owner: {owner}")
            print(f"  Email: {email}")
            print(f"  Properties: {len(props)}")

            if owner == "Juliana Shewmaker":
                print(f"\n  >>> THIS IS THE CORRECT TOKEN: {token}")
                print(f"  >>> Dashboard URL: http://localhost:3000?token={token}")
        else:
            print(f"  Failed: Status {response.status_code}")

    except Exception as e:
        print(f"  Error: {e}")

print("\n" + "=" * 60)
print("DASHBOARD URLS TO TRY:")
print("=" * 60)
print("\n1. http://localhost:3000?token=portal_2")
print("2. http://localhost:3000?token=DEMO1234")
print("3. http://localhost:3000?token=JS2024001")
print("\nOne of these should show Juliana's dashboard correctly.")
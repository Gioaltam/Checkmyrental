import requests
import json

# Test the API
api_url = "http://localhost:8000/api/owners/paid-owners"

try:
    response = requests.get(api_url, timeout=5)
    print(f"Status Code: {response.status_code}\n")

    if response.status_code == 200:
        data = response.json()
        print("Raw JSON response:")
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Error: {e}")
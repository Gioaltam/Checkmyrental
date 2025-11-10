"""
Get a fresh JWT token for Juliana
"""
import requests

url = "http://127.0.0.1:8000/api/portal/login"
data = {
    "email": "julianagomesfl@yahoo.com",
    "password": "Tt8nDgtT43V05gx6gaMWEA"
}

print("Getting fresh token...")
response = requests.post(url, json=data)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"\nToken: {token}\n")
    print(f"Open this URL in your browser:")
    print(f"http://localhost:3000/?token={token}")
else:
    print(f"Error: {response.text}")

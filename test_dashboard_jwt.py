"""
Test the dashboard JWT endpoint
"""
import requests

# Use a recent JWT token (get a fresh one by logging in)
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZW1haWwiOiJqdWxpYW5hZ29tZXNmbEB5YWhvby5jb20iLCJpYXQiOjE3NjE2ODM2NzgsImV4cCI6MTc2MTk0Mjg3OH0.AtNhNP7SuJ4D72AONRAE8OdfdlqNlbasEHx5j9xnN-I"

url = "http://127.0.0.1:8000/api/portal/dashboard"
headers = {
    "Authorization": f"Bearer {jwt_token}"
}

print("Testing dashboard endpoint with JWT...")
print(f"URL: {url}")
print(f"Token: {jwt_token[:50]}...")
print()

try:
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

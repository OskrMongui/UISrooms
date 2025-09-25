import requests
import json

base_url = 'http://localhost:8000/api/'
access_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU4ODMxNDc4LCJpYXQiOjE3NTg4Mjc4NzgsImp0aSI6IjcwMmE4MmExN2E4YjQyNTE4OTkyYzEwMTRjMzRlODYyIiwidXNlcl9pZCI6IjEifQ.c1EQ8HLwkkSLibT8UkIGJTSO0PNN6gGfV2pjUBHp0s6A'
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# Test GET without token (read-only)
print("=== GET without token ===")
response = requests.get(f'{base_url}usuarios/')
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Users list:", json.dumps(response.json()[:2], indent=2))  # First 2 users

# Test GET with token
print("\n=== GET with token ===")
response = requests.get(f'{base_url}usuarios/', headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("Users list with token:", json.dumps(response.json()[:2], indent=2))

# Test POST with token (create a test user, but don't save if not needed)
print("\n=== POST with token ===")
data = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User"
}
response = requests.post(f'{base_url}usuarios/', data=json.dumps(data), headers=headers)
print(f"Status: {response.status_code}")
print("Response:", response.json())

# Test other endpoints GET with token
endpoints = ['espacios/', 'reservas/', 'llaves/', 'incidencias/', 'objetos-perdidos/', 'notificaciones/']
for endpoint in endpoints:
    print(f"\n=== GET {endpoint} with token ===")
    response = requests.get(f'{base_url}{endpoint}', headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {len(data['results']) if 'results' in data else 'N/A'}")

# Test token refresh
print("\n=== Token Refresh ===")
refresh_token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1OTQzMjY3OCwiaWF0IjoxNzU4ODI3ODc4LCJqdGkiOiI3ZDczZWY0NmJhZWI0MWMzYWFlZDcwNmQ5NGNjZmY2MCIsInVzZXJfaWQiOiIxIn0.F6KuC5r6MYnBCv4SWPMtWMAFyYi9cr5y32ResNhsVxRk'
response = requests.post(f'{base_url}token/refresh/', json={'refresh': refresh_token})
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print("New access:", response.json()['access'][:50] + "...")

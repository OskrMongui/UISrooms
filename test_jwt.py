import requests
import json

url = 'http://localhost:8000/api/token/'
data = {
    'username': 'admin',
    'password': 'admin123'
}
response = requests.post(url, json=data)
print(json.dumps(response.json(), indent=2))

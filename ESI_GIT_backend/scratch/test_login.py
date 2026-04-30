import requests

url = "http://localhost:8000/api/login/"
data = {
    "email": "test@esi.dz", # Assuming this email exists
    "password": "password123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")

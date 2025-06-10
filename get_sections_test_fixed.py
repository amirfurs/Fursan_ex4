import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from frontend .env file
frontend_env_path = Path('/app/frontend/.env')
load_dotenv(frontend_env_path)

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BACKEND_URL:
    print("Error: REACT_APP_BACKEND_URL not found in environment variables")
    exit(1)

# Ensure the URL ends with /api
API_URL = f"{BACKEND_URL}/api"
print(f"Using API URL: {API_URL}")

# Test getting all sections
print("Getting all sections...")
try:
    response = requests.get(f"{API_URL}/sections", timeout=10)
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        sections = response.json()
        print(f"Found {len(sections)} sections")
        for section in sections:
            print(f"Section: {section['name']} (ID: {section['id']})")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Try with local backend
print("\nTrying with local backend...")
try:
    response = requests.get("http://localhost:8001/api/sections", timeout=5)
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        sections = response.json()
        print(f"Found {len(sections)} sections")
        for section in sections:
            print(f"Section: {section['name']} (ID: {section['id']})")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
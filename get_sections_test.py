import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from frontend .env file
frontend_env_path = Path('/app/frontend/.env')
load_dotenv(frontend_env_path)

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BACKEND_URL:
    print("Error: REACT_APP_BACKEND_URL not found in environment variables")
    exit(1)

# Ensure the URL ends with /api
API_URL = f"{BACKEND_URL}/api"
print(f"Using API URL: {API_URL}")

# Test getting all sections
print("Getting all sections...")
response = requests.get(f"{API_URL}/sections")
print(f"Status code: {response.status_code}")
if response.status_code == 200:
    sections = response.json()
    print(f"Found {len(sections)} sections")
    for section in sections:
        print(f"Section: {section['name']} (ID: {section['id']})")
else:
    print(f"Response: {response.text}")
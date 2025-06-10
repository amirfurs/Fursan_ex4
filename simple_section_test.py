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

# Test creating a section with Arabic name
section_data = {
    "name": "العقيدة الإسلامية",
    "description": "قسم مخصص للعقيدة الإسلامية وأصولها"
}

print("Creating Arabic section...")
response = requests.post(f"{API_URL}/sections", json=section_data)
print(f"Status code: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    section = response.json()
    section_id = section["id"]
    print(f"Section created with ID: {section_id}")
    
    # Get all sections to verify
    print("\nGetting all sections...")
    response = requests.get(f"{API_URL}/sections")
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        sections = response.json()
        print(f"Found {len(sections)} sections")
        
        # Find our section
        matching_sections = [s for s in sections if s["id"] == section_id]
        if matching_sections:
            print(f"Found our section: {matching_sections[0]['name']}")
        else:
            print("Our section was not found in the list")
    
    # Delete the section
    print("\nDeleting section...")
    response = requests.delete(f"{API_URL}/sections/{section_id}")
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")
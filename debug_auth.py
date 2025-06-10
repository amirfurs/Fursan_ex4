import requests
import json
import os
from dotenv import load_dotenv
from pathlib import Path
import sys

# Load environment variables from frontend .env file
frontend_env_path = Path('/app/frontend/.env')
load_dotenv(frontend_env_path)

# Get the backend URL from environment variables
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BACKEND_URL:
    print("Error: REACT_APP_BACKEND_URL not found in environment variables")
    sys.exit(1)

# Ensure the URL ends with /api
API_URL = f"{BACKEND_URL}/api"
print(f"Using API URL: {API_URL}")

def debug_login_issue():
    """Debug the user authentication login issue"""
    print("\n=== Debugging User Authentication Login Issue ===")
    
    # Create test user credentials
    username = "debug_user_test"
    password = "DebugPassword123!"
    email = "debug_user_test@example.com"
    
    # 1. Register a new user
    user_data = {
        "username": username,
        "email": email,
        "full_name": "Debug Test User",
        "password": password
    }
    
    print(f"Step 1: Registering new user: {username}")
    response = requests.post(f"{API_URL}/register", json=user_data)
    
    if response.status_code != 200:
        print(f"Registration failed with status code {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    register_data = response.json()
    user_id = register_data["user"]["id"]
    print(f"Registration successful. User ID: {user_id}")
    print(f"Registration response: {json.dumps(register_data, indent=2)}")
    
    # 2. Examine the stored user in the database (we can't directly access the DB, but we can check the profile)
    auth_headers = {"Authorization": f"Bearer {register_data['access_token']}"}
    
    print("\nStep 2: Checking user profile after registration")
    response = requests.get(f"{API_URL}/profile", headers=auth_headers)
    
    if response.status_code != 200:
        print(f"Profile check failed with status code {response.status_code}")
        print(f"Response: {response.text}")
    else:
        profile_data = response.json()
        print(f"Profile data: {json.dumps(profile_data, indent=2)}")
    
    # 3. Attempt to login with the same credentials
    login_data = {
        "username": username,
        "password": password
    }
    
    print("\nStep 3: Attempting to login with same credentials")
    print(f"Login request data: {json.dumps(login_data, indent=2)}")
    response = requests.post(f"{API_URL}/login", json=login_data)
    
    if response.status_code != 200:
        print(f"Login failed with status code {response.status_code}")
        print(f"Response: {response.text}")
    else:
        login_result = response.json()
        print(f"Login successful. Response: {json.dumps(login_result, indent=2)}")
        
        # 4. Verify token works
        auth_headers = {"Authorization": f"Bearer {login_result['access_token']}"}
        
        print("\nStep 4: Verifying token by accessing profile endpoint")
        response = requests.get(f"{API_URL}/profile", headers=auth_headers)
        
        if response.status_code != 200:
            print(f"Profile verification failed with status code {response.status_code}")
            print(f"Response: {response.text}")
        else:
            profile_data = response.json()
            print(f"Profile verification successful. Data: {json.dumps(profile_data, indent=2)}")
    
    # 5. Try with explicit JSON content type header
    print("\nStep 5: Attempting login with explicit content-type header")
    headers = {"Content-Type": "application/json"}
    response = requests.post(f"{API_URL}/login", json=login_data, headers=headers)
    
    if response.status_code != 200:
        print(f"Login with content-type header failed with status code {response.status_code}")
        print(f"Response: {response.text}")
    else:
        login_result = response.json()
        print(f"Login with content-type header successful. Response: {json.dumps(login_result, indent=2)}")
    
    # 6. Try with different case for username
    login_data_case = {
        "username": username.upper(),  # Try uppercase username
        "password": password
    }
    
    print("\nStep 6: Attempting login with uppercase username")
    print(f"Login request data: {json.dumps(login_data_case, indent=2)}")
    response = requests.post(f"{API_URL}/login", json=login_data_case)
    
    if response.status_code != 200:
        print(f"Login with uppercase username failed with status code {response.status_code}")
        print(f"Response: {response.text}")
    else:
        login_result = response.json()
        print(f"Login with uppercase username successful. Response: {json.dumps(login_result, indent=2)}")

if __name__ == "__main__":
    debug_login_issue()
import requests
import base64
import json
import unittest
import uuid
import os
from dotenv import load_dotenv
import sys
from pathlib import Path

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

class TestBackendAuthentication(unittest.TestCase):
    def setUp(self):
        # Sample image as base64 for testing
        self.sample_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        
        # Create unique test user credentials
        self.username = f"testuser_{uuid.uuid4().hex[:8]}"
        self.password = "TestPassword123!"
        self.email = f"{self.username}@example.com"
        self.full_name = "Test User"
        
        # Store created users for reference
        self.created_users = []
        
    def tearDown(self):
        # Note: We can't clean up users as there's no delete user endpoint
        pass
        
    def test_register_and_login(self):
        """Test user registration and immediate login with same credentials"""
        print("\n=== Testing User Registration and Login ===")
        
        # 1. Register a new user
        user_data = {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "password": self.password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering new user: {self.username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register user: {response.text}")
        
        register_data = response.json()
        self.assertIn("access_token", register_data)
        self.assertIn("user", register_data)
        self.assertEqual(register_data["user"]["username"], self.username)
        self.assertEqual(register_data["user"]["email"], self.email)
        self.assertEqual(register_data["user"]["full_name"], self.full_name)
        
        user_id = register_data["user"]["id"]
        self.created_users.append(user_id)
        print(f"Successfully registered user with ID: {user_id}")
        
        # 2. Attempt to login with the same credentials
        login_data = {
            "username": self.username,
            "password": self.password
        }
        
        print(f"Attempting to login with username: {self.username}")
        response = requests.post(f"{API_URL}/login", json=login_data)
        self.assertEqual(response.status_code, 200, f"Failed to login: {response.text}")
        
        login_result = response.json()
        self.assertIn("access_token", login_result)
        self.assertIn("user", login_result)
        self.assertEqual(login_result["user"]["id"], user_id)
        self.assertEqual(login_result["user"]["username"], self.username)
        print("Successfully logged in with registered credentials")
        
        # 3. Verify token works by accessing profile endpoint
        auth_headers = {"Authorization": f"Bearer {login_result['access_token']}"}
        
        print("Verifying token by accessing profile endpoint")
        response = requests.get(f"{API_URL}/profile", headers=auth_headers)
        self.assertEqual(response.status_code, 200, f"Failed to access profile with token: {response.text}")
        
        profile_data = response.json()
        self.assertEqual(profile_data["id"], user_id)
        self.assertEqual(profile_data["username"], self.username)
        print("Successfully accessed profile with token")
        
    def test_login_with_incorrect_credentials(self):
        """Test login failures with incorrect credentials"""
        print("\n=== Testing Login Failures ===")
        
        # 1. Register a new user first
        user_data = {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "password": self.password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering new user: {self.username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register user: {response.text}")
        
        register_data = response.json()
        user_id = register_data["user"]["id"]
        self.created_users.append(user_id)
        print(f"Successfully registered user with ID: {user_id}")
        
        # 2. Try login with incorrect password
        wrong_password_data = {
            "username": self.username,
            "password": "WrongPassword123!"
        }
        
        print("Attempting login with incorrect password")
        response = requests.post(f"{API_URL}/login", json=wrong_password_data)
        self.assertEqual(response.status_code, 401, "Expected 401 for incorrect password")
        print("Successfully received 401 for incorrect password")
        
        # 3. Try login with non-existent username
        wrong_username_data = {
            "username": f"nonexistent_{uuid.uuid4().hex[:8]}",
            "password": self.password
        }
        
        print("Attempting login with non-existent username")
        response = requests.post(f"{API_URL}/login", json=wrong_username_data)
        self.assertEqual(response.status_code, 401, "Expected 401 for non-existent username")
        print("Successfully received 401 for non-existent username")
        
    def test_password_case_sensitivity(self):
        """Test password case sensitivity during login"""
        print("\n=== Testing Password Case Sensitivity ===")
        
        # 1. Register a new user with mixed-case password
        mixed_case_password = "TestPassword123!"
        user_data = {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "password": mixed_case_password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering new user with mixed-case password: {self.username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register user: {response.text}")
        
        register_data = response.json()
        user_id = register_data["user"]["id"]
        self.created_users.append(user_id)
        print(f"Successfully registered user with ID: {user_id}")
        
        # 2. Try login with different case password
        different_case_data = {
            "username": self.username,
            "password": mixed_case_password.swapcase()
        }
        
        print(f"Attempting login with different case password: {different_case_data['password']}")
        response = requests.post(f"{API_URL}/login", json=different_case_data)
        self.assertEqual(response.status_code, 401, "Expected 401 for case-modified password")
        print("Successfully received 401 for case-modified password")
        
        # 3. Verify original password still works
        original_data = {
            "username": self.username,
            "password": mixed_case_password
        }
        
        print("Attempting login with original password")
        response = requests.post(f"{API_URL}/login", json=original_data)
        self.assertEqual(response.status_code, 200, f"Failed to login with original password: {response.text}")
        print("Successfully logged in with original password")
        
    def test_username_case_sensitivity(self):
        """Test username case sensitivity during login"""
        print("\n=== Testing Username Case Sensitivity ===")
        
        # 1. Register a new user with mixed-case username
        mixed_case_username = f"TestUser_{uuid.uuid4().hex[:8]}"
        user_data = {
            "username": mixed_case_username,
            "email": f"{mixed_case_username.lower()}@example.com",
            "full_name": self.full_name,
            "password": self.password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering new user with mixed-case username: {mixed_case_username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register user: {response.text}")
        
        register_data = response.json()
        user_id = register_data["user"]["id"]
        self.created_users.append(user_id)
        print(f"Successfully registered user with ID: {user_id}")
        
        # 2. Try login with different case username
        different_case_data = {
            "username": mixed_case_username.swapcase(),
            "password": self.password
        }
        
        print(f"Attempting login with different case username: {different_case_data['username']}")
        response = requests.post(f"{API_URL}/login", json=different_case_data)
        print(f"Response status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # 3. Verify original username still works
        original_data = {
            "username": mixed_case_username,
            "password": self.password
        }
        
        print("Attempting login with original username")
        response = requests.post(f"{API_URL}/login", json=original_data)
        self.assertEqual(response.status_code, 200, f"Failed to login with original username: {response.text}")
        print("Successfully logged in with original username")
        
    def test_whitespace_in_credentials(self):
        """Test handling of whitespace in credentials"""
        print("\n=== Testing Whitespace in Credentials ===")
        
        # 1. Register a new user
        user_data = {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "password": self.password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering new user: {self.username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register user: {response.text}")
        
        register_data = response.json()
        user_id = register_data["user"]["id"]
        self.created_users.append(user_id)
        print(f"Successfully registered user with ID: {user_id}")
        
        # 2. Try login with leading/trailing whitespace in username
        whitespace_username_data = {
            "username": f" {self.username} ",
            "password": self.password
        }
        
        print(f"Attempting login with whitespace in username: '{whitespace_username_data['username']}'")
        response = requests.post(f"{API_URL}/login", json=whitespace_username_data)
        print(f"Response status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # 3. Try login with leading/trailing whitespace in password
        whitespace_password_data = {
            "username": self.username,
            "password": f" {self.password} "
        }
        
        print(f"Attempting login with whitespace in password")
        response = requests.post(f"{API_URL}/login", json=whitespace_password_data)
        print(f"Response status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # 4. Verify original credentials still work
        original_data = {
            "username": self.username,
            "password": self.password
        }
        
        print("Attempting login with original credentials")
        response = requests.post(f"{API_URL}/login", json=original_data)
        self.assertEqual(response.status_code, 200, f"Failed to login with original credentials: {response.text}")
        print("Successfully logged in with original credentials")
        
    def test_special_characters_in_password(self):
        """Test special characters in password"""
        print("\n=== Testing Special Characters in Password ===")
        
        # 1. Register a new user with special characters in password
        special_password = "Test@#$%^&*()_+{}|:<>?~"
        user_data = {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "password": special_password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering new user with special characters in password: {self.username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register user: {response.text}")
        
        register_data = response.json()
        user_id = register_data["user"]["id"]
        self.created_users.append(user_id)
        print(f"Successfully registered user with ID: {user_id}")
        
        # 2. Try login with the special character password
        login_data = {
            "username": self.username,
            "password": special_password
        }
        
        print("Attempting login with special character password")
        response = requests.post(f"{API_URL}/login", json=login_data)
        self.assertEqual(response.status_code, 200, f"Failed to login with special character password: {response.text}")
        print("Successfully logged in with special character password")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
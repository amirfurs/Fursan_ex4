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

class TestBackendAPI(unittest.TestCase):
    def setUp(self):
        # Create a test section to use in article tests
        self.test_section_data = {
            "name": f"Test Section {uuid.uuid4()}",
            "description": "This is a test section for API testing"
        }
        
        # Create a test section
        response = requests.post(f"{API_URL}/sections", json=self.test_section_data)
        self.assertEqual(response.status_code, 200, f"Failed to create test section: {response.text}")
        self.test_section = response.json()
        
        # Sample image as base64 for testing
        # This is a small 1x1 pixel transparent PNG
        self.sample_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        
        # Create test user for authentication tests
        self.test_user_data = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
            "full_name": "Test User",
            "password": "TestPassword123!",
            "profile_picture": self.sample_image_base64
        }
        
        # Register the test user
        response = requests.post(f"{API_URL}/register", json=self.test_user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register test user: {response.text}")
        self.test_user = response.json()
        self.auth_token = self.test_user["access_token"]
        self.auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create a test article for comment tests
        article_data = {
            "title": f"Test Article for Comments {uuid.uuid4()}",
            "content": "This is a test article for comment API testing",
            "author": "Test Author",
            "section_id": self.test_section["id"]
        }
        
        response = requests.post(f"{API_URL}/articles", json=article_data)
        self.assertEqual(response.status_code, 200, f"Failed to create test article: {response.text}")
        self.test_article = response.json()
        
        # Track created resources for cleanup
        self.created_sections = [self.test_section["id"]]
        self.created_articles = [self.test_article["id"]]
        self.created_comments = []

    def tearDown(self):
        # Clean up created comments
        for comment_id in self.created_comments:
            try:
                requests.delete(f"{API_URL}/comments/{comment_id}", headers=self.auth_headers)
            except Exception as e:
                print(f"Error cleaning up comment {comment_id}: {e}")
                
        # Clean up created articles
        for article_id in self.created_articles:
            try:
                requests.delete(f"{API_URL}/articles/{article_id}")
            except Exception as e:
                print(f"Error cleaning up article {article_id}: {e}")
        
        # Clean up created sections
        for section_id in self.created_sections:
            try:
                requests.delete(f"{API_URL}/sections/{section_id}")
            except Exception as e:
                print(f"Error cleaning up section {section_id}: {e}")
                
        # Note: We don't clean up the test user as there's no delete user endpoint

    # Section Management API Tests
    def test_section_crud(self):
        """Test Section CRUD operations"""
        print("\n=== Testing Section Management API ===")
        
        # 1. Create a new section
        section_data = {
            "name": f"Test Section {uuid.uuid4()}",
            "description": "This is a test section created by the API test"
        }
        
        print("Creating a new section...")
        response = requests.post(f"{API_URL}/sections", json=section_data)
        self.assertEqual(response.status_code, 200, f"Failed to create section: {response.text}")
        
        section = response.json()
        self.assertEqual(section["name"], section_data["name"])
        self.assertEqual(section["description"], section_data["description"])
        self.assertIn("id", section)
        
        # Add to cleanup list
        self.created_sections.append(section["id"])
        section_id = section["id"]
        print(f"Successfully created section with ID: {section_id}")
        
        # 2. Get all sections
        print("Getting all sections...")
        response = requests.get(f"{API_URL}/sections")
        self.assertEqual(response.status_code, 200, f"Failed to get sections: {response.text}")
        
        sections = response.json()
        self.assertIsInstance(sections, list)
        self.assertTrue(any(s["id"] == section_id for s in sections), "Created section not found in sections list")
        print(f"Successfully retrieved {len(sections)} sections")
        
        # 3. Delete a section
        print(f"Deleting section with ID: {section_id}...")
        response = requests.delete(f"{API_URL}/sections/{section_id}")
        self.assertEqual(response.status_code, 200, f"Failed to delete section: {response.text}")
        
        # Verify section was deleted
        response = requests.get(f"{API_URL}/sections")
        sections = response.json()
        self.assertFalse(any(s["id"] == section_id for s in sections), "Deleted section still found in sections list")
        print("Successfully deleted section")
        
        # Remove from cleanup list since we already deleted it
        self.created_sections.remove(section_id)
        
        # 4. Test deleting non-existent section
        print("Testing deletion of non-existent section...")
        response = requests.delete(f"{API_URL}/sections/{uuid.uuid4()}")
        self.assertEqual(response.status_code, 404, "Expected 404 for non-existent section deletion")
        print("Successfully received 404 for non-existent section")

    # Article Management API Tests
    def test_article_crud(self):
        """Test Article CRUD operations"""
        print("\n=== Testing Article Management API ===")
        
        # 1. Create an article without image
        article_data = {
            "title": f"Test Article {uuid.uuid4()}",
            "content": "This is a test article created by the API test",
            "author": "Test Author",
            "section_id": self.test_section["id"]
        }
        
        print("Creating an article without image...")
        response = requests.post(f"{API_URL}/articles", json=article_data)
        self.assertEqual(response.status_code, 200, f"Failed to create article: {response.text}")
        
        article = response.json()
        self.assertEqual(article["title"], article_data["title"])
        self.assertEqual(article["content"], article_data["content"])
        self.assertEqual(article["author"], article_data["author"])
        self.assertEqual(article["section_id"], article_data["section_id"])
        self.assertIn("id", article)
        
        # Add to cleanup list
        self.created_articles.append(article["id"])
        article_id = article["id"]
        print(f"Successfully created article with ID: {article_id}")
        
        # 2. Create an article with image
        article_with_image_data = {
            "title": f"Test Article with Image {uuid.uuid4()}",
            "content": "This is a test article with an image",
            "author": "Test Author",
            "section_id": self.test_section["id"],
            "image_data": self.sample_image_base64,
            "image_name": "test_image.png"
        }
        
        print("Creating an article with image...")
        response = requests.post(f"{API_URL}/articles", json=article_with_image_data)
        self.assertEqual(response.status_code, 200, f"Failed to create article with image: {response.text}")
        
        article_with_image = response.json()
        self.assertEqual(article_with_image["title"], article_with_image_data["title"])
        self.assertEqual(article_with_image["image_data"], article_with_image_data["image_data"])
        self.assertEqual(article_with_image["image_name"], article_with_image_data["image_name"])
        
        # Add to cleanup list
        self.created_articles.append(article_with_image["id"])
        article_with_image_id = article_with_image["id"]
        print(f"Successfully created article with image, ID: {article_with_image_id}")
        
        # 3. Get all articles
        print("Getting all articles...")
        response = requests.get(f"{API_URL}/articles")
        self.assertEqual(response.status_code, 200, f"Failed to get articles: {response.text}")
        
        articles = response.json()
        self.assertIsInstance(articles, list)
        self.assertTrue(any(a["id"] == article_id for a in articles), "Created article not found in articles list")
        self.assertTrue(any(a["id"] == article_with_image_id for a in articles), "Created article with image not found in articles list")
        print(f"Successfully retrieved {len(articles)} articles")
        
        # 4. Get a specific article
        print(f"Getting article with ID: {article_id}...")
        response = requests.get(f"{API_URL}/articles/{article_id}")
        self.assertEqual(response.status_code, 200, f"Failed to get article: {response.text}")
        
        retrieved_article = response.json()
        self.assertEqual(retrieved_article["id"], article_id)
        self.assertEqual(retrieved_article["title"], article_data["title"])
        print("Successfully retrieved specific article")
        
        # 5. Get a specific article with image
        print(f"Getting article with image, ID: {article_with_image_id}...")
        response = requests.get(f"{API_URL}/articles/{article_with_image_id}")
        self.assertEqual(response.status_code, 200, f"Failed to get article with image: {response.text}")
        
        retrieved_article_with_image = response.json()
        self.assertEqual(retrieved_article_with_image["id"], article_with_image_id)
        self.assertEqual(retrieved_article_with_image["image_data"], article_with_image_data["image_data"])
        print("Successfully retrieved article with image")
        
        # 6. Update an article
        update_data = {
            "title": f"Updated Article {uuid.uuid4()}",
            "content": "This article has been updated"
        }
        
        print(f"Updating article with ID: {article_id}...")
        response = requests.put(f"{API_URL}/articles/{article_id}", json=update_data)
        self.assertEqual(response.status_code, 200, f"Failed to update article: {response.text}")
        
        updated_article = response.json()
        self.assertEqual(updated_article["id"], article_id)
        self.assertEqual(updated_article["title"], update_data["title"])
        self.assertEqual(updated_article["content"], update_data["content"])
        print("Successfully updated article")
        
        # 7. Get articles by section
        print(f"Getting articles by section ID: {self.test_section['id']}...")
        response = requests.get(f"{API_URL}/articles/section/{self.test_section['id']}")
        self.assertEqual(response.status_code, 200, f"Failed to get articles by section: {response.text}")
        
        section_articles = response.json()
        self.assertIsInstance(section_articles, list)
        self.assertTrue(any(a["id"] == article_id for a in section_articles), "Created article not found in section articles")
        self.assertTrue(any(a["id"] == article_with_image_id for a in section_articles), "Created article with image not found in section articles")
        print(f"Successfully retrieved {len(section_articles)} articles for the section")
        
        # 8. Delete an article
        print(f"Deleting article with ID: {article_id}...")
        response = requests.delete(f"{API_URL}/articles/{article_id}")
        self.assertEqual(response.status_code, 200, f"Failed to delete article: {response.text}")
        
        # Verify article was deleted
        response = requests.get(f"{API_URL}/articles")
        articles = response.json()
        self.assertFalse(any(a["id"] == article_id for a in articles), "Deleted article still found in articles list")
        print("Successfully deleted article")
        
        # Remove from cleanup list since we already deleted it
        self.created_articles.remove(article_id)
        
        # 9. Test deleting non-existent article
        print("Testing deletion of non-existent article...")
        response = requests.delete(f"{API_URL}/articles/{uuid.uuid4()}")
        self.assertEqual(response.status_code, 404, "Expected 404 for non-existent article deletion")
        print("Successfully received 404 for non-existent article")

    def test_section_cascade_delete(self):
        """Test that deleting a section also deletes its articles"""
        print("\n=== Testing Section Cascade Delete ===")
        
        # 1. Create a new section
        section_data = {
            "name": f"Cascade Test Section {uuid.uuid4()}",
            "description": "This section will be deleted to test cascade deletion"
        }
        
        print("Creating a new section for cascade delete test...")
        response = requests.post(f"{API_URL}/sections", json=section_data)
        self.assertEqual(response.status_code, 200, f"Failed to create section: {response.text}")
        
        section = response.json()
        section_id = section["id"]
        self.created_sections.append(section_id)
        print(f"Created section with ID: {section_id}")
        
        # 2. Create articles in this section
        article_count = 3
        article_ids = []
        
        print(f"Creating {article_count} articles in the section...")
        for i in range(article_count):
            article_data = {
                "title": f"Cascade Test Article {i} - {uuid.uuid4()}",
                "content": f"This is test article {i} for cascade deletion test",
                "author": "Test Author",
                "section_id": section_id
            }
            
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create article: {response.text}")
            
            article = response.json()
            article_ids.append(article["id"])
            self.created_articles.append(article["id"])
        
        print(f"Created {article_count} articles in the section")
        
        # 3. Verify articles exist in the section
        response = requests.get(f"{API_URL}/articles/section/{section_id}")
        self.assertEqual(response.status_code, 200, f"Failed to get articles by section: {response.text}")
        
        section_articles = response.json()
        self.assertEqual(len(section_articles), article_count, f"Expected {article_count} articles in section, got {len(section_articles)}")
        print(f"Verified {len(section_articles)} articles exist in the section")
        
        # 4. Delete the section
        print(f"Deleting section with ID: {section_id}...")
        response = requests.delete(f"{API_URL}/sections/{section_id}")
        self.assertEqual(response.status_code, 200, f"Failed to delete section: {response.text}")
        
        # Remove from cleanup list since we already deleted it
        self.created_sections.remove(section_id)
        
        # 5. Verify articles were also deleted
        print("Verifying articles were cascade deleted...")
        for article_id in article_ids:
            response = requests.get(f"{API_URL}/articles/{article_id}")
            self.assertEqual(response.status_code, 404, f"Expected article {article_id} to be deleted with section, but it still exists")
            
            # Remove from cleanup list since they should be deleted
            if article_id in self.created_articles:
                self.created_articles.remove(article_id)
        
        print("Successfully verified all articles were cascade deleted with the section")
        
    # Comment System API Tests
    def test_comment_system(self):
        """Test Comment System APIs"""
        print("\n=== Testing Comment System APIs ===")
        
        # 1. Create a comment (requires authentication)
        comment_data = {
            "content": f"This is a test comment {uuid.uuid4()}"
        }
        
        print("Creating a comment with authentication...")
        response = requests.post(
            f"{API_URL}/articles/{self.test_article['id']}/comments", 
            json=comment_data,
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to create comment: {response.text}")
        
        comment = response.json()
        self.assertEqual(comment["content"], comment_data["content"])
        self.assertEqual(comment["article_id"], self.test_article["id"])
        self.assertEqual(comment["user_full_name"], self.test_user_data["full_name"])
        self.assertIn("id", comment)
        
        # Add to cleanup list
        self.created_comments.append(comment["id"])
        comment_id = comment["id"]
        print(f"Successfully created comment with ID: {comment_id}")
        
        # 2. Get comments for an article (public access)
        print(f"Getting comments for article ID: {self.test_article['id']}...")
        response = requests.get(f"{API_URL}/articles/{self.test_article['id']}/comments")
        self.assertEqual(response.status_code, 200, f"Failed to get comments: {response.text}")
        
        comments = response.json()
        self.assertIsInstance(comments, list)
        self.assertTrue(any(c["id"] == comment_id for c in comments), "Created comment not found in comments list")
        print(f"Successfully retrieved {len(comments)} comments")
        
        # 3. Update a comment (user can edit own comments)
        update_data = {
            "content": f"This comment has been updated {uuid.uuid4()}"
        }
        
        print(f"Updating comment with ID: {comment_id}...")
        response = requests.put(
            f"{API_URL}/comments/{comment_id}", 
            json=update_data,
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to update comment: {response.text}")
        
        updated_comment = response.json()
        self.assertEqual(updated_comment["id"], comment_id)
        self.assertEqual(updated_comment["content"], update_data["content"])
        print("Successfully updated comment")
        
        # 4. Delete a comment (user can delete own comments)
        print(f"Deleting comment with ID: {comment_id}...")
        response = requests.delete(
            f"{API_URL}/comments/{comment_id}",
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to delete comment: {response.text}")
        
        # Verify comment was deleted
        response = requests.get(f"{API_URL}/articles/{self.test_article['id']}/comments")
        comments = response.json()
        self.assertFalse(any(c["id"] == comment_id for c in comments), "Deleted comment still found in comments list")
        print("Successfully deleted comment")
        
        # Remove from cleanup list since we already deleted it
        self.created_comments.remove(comment_id)
        
        # 5. Test creating a comment without authentication
        print("Testing comment creation without authentication...")
        response = requests.post(
            f"{API_URL}/articles/{self.test_article['id']}/comments", 
            json={"content": "This should fail"}
        )
        self.assertEqual(response.status_code, 401, "Expected 401 for unauthenticated comment creation")
        print("Successfully received 401 for unauthenticated comment creation")
        
    # Logo Management API Tests
    def test_logo_management(self):
        """Test Logo Management APIs"""
        print("\n=== Testing Logo Management APIs ===")
        
        # 1. Get current logo settings (public access)
        print("Getting current logo settings...")
        response = requests.get(f"{API_URL}/settings/logo")
        self.assertEqual(response.status_code, 200, f"Failed to get logo settings: {response.text}")
        
        logo_settings = response.json()
        self.assertIn("logo_data", logo_settings)
        self.assertIn("logo_name", logo_settings)
        self.assertIn("site_name", logo_settings)
        print("Successfully retrieved logo settings")
        
        # Save initial logo data for comparison
        initial_logo_data = logo_settings.get("logo_data")
        initial_logo_name = logo_settings.get("logo_name")
        
        # 2. Update logo settings
        logo_update = {
            "logo_data": self.sample_image_base64,
            "logo_name": f"test_logo_{uuid.uuid4()}.png"
        }
        
        print("Updating logo settings...")
        response = requests.put(f"{API_URL}/settings/logo", json=logo_update)
        self.assertEqual(response.status_code, 200, f"Failed to update logo settings: {response.text}")
        
        updated_logo = response.json()
        self.assertEqual(updated_logo["logo_data"], logo_update["logo_data"])
        self.assertEqual(updated_logo["logo_name"], logo_update["logo_name"])
        print("Successfully updated logo settings")
        
        # 3. Verify logo was updated by getting it again
        print("Verifying logo update...")
        response = requests.get(f"{API_URL}/settings/logo")
        self.assertEqual(response.status_code, 200, f"Failed to get updated logo settings: {response.text}")
        
        verified_logo = response.json()
        self.assertEqual(verified_logo["logo_data"], logo_update["logo_data"])
        self.assertEqual(verified_logo["logo_name"], logo_update["logo_name"])
        print("Successfully verified logo update")
        
        # 4. Restore original logo if there was one
        if initial_logo_data or initial_logo_name:
            restore_data = {
                "logo_data": initial_logo_data,
                "logo_name": initial_logo_name
            }
            
            print("Restoring original logo settings...")
            response = requests.put(f"{API_URL}/settings/logo", json=restore_data)
            self.assertEqual(response.status_code, 200, f"Failed to restore logo settings: {response.text}")
            print("Successfully restored original logo settings")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
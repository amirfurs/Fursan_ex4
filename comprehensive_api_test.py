import requests
import base64
import json
import unittest
import uuid
import os
import time
from dotenv import load_dotenv
import sys
from pathlib import Path
from datetime import datetime, timedelta

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

class TestArabicPublishingSystemAPI(unittest.TestCase):
    def setUp(self):
        # Sample image as base64 for testing
        self.sample_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        
        # Create unique test user credentials with Arabic name
        self.username = f"testuser_{uuid.uuid4().hex[:8]}"
        self.password = "TestPassword123!"
        self.email = f"{self.username}@example.com"
        self.full_name = "محمد عبد الله"
        
        # Register the test user
        user_data = {
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "password": self.password,
            "profile_picture": self.sample_image_base64
        }
        
        print(f"Registering test user: {self.username}")
        response = requests.post(f"{API_URL}/register", json=user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register test user: {response.text}")
        
        self.test_user = response.json()
        self.auth_token = self.test_user["access_token"]
        self.auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create a test section with Arabic name
        self.test_section_data = {
            "name": "قسم الاختبار",
            "description": "هذا القسم مخصص لاختبار واجهة برمجة التطبيقات"
        }
        
        print("Creating test section")
        response = requests.post(f"{API_URL}/sections", json=self.test_section_data)
        self.assertEqual(response.status_code, 200, f"Failed to create test section: {response.text}")
        self.test_section = response.json()
        
        # Create a test article with Arabic content
        self.test_article_data = {
            "title": "مقال اختباري",
            "content": "هذا محتوى المقال الاختباري لاختبار واجهة برمجة التطبيقات",
            "author": "كاتب الاختبار",
            "section_id": self.test_section["id"],
            "image_data": self.sample_image_base64,
            "image_name": "test_image.png"
        }
        
        print("Creating test article")
        response = requests.post(f"{API_URL}/articles", json=self.test_article_data)
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

    def test_1_authentication_endpoints(self):
        """Test authentication endpoints: /api/register, /api/login, /api/profile"""
        print("\n=== Testing Authentication Endpoints ===")
        
        # 1. Test login with existing user
        login_data = {
            "username": self.username,
            "password": self.password
        }
        
        print("Testing login with existing user")
        response = requests.post(f"{API_URL}/login", json=login_data)
        self.assertEqual(response.status_code, 200, f"Failed to login: {response.text}")
        
        login_result = response.json()
        self.assertIn("access_token", login_result)
        self.assertIn("user", login_result)
        self.assertEqual(login_result["user"]["username"], self.username)
        print("Login successful")
        
        # 2. Test profile endpoint
        print("Testing profile endpoint")
        response = requests.get(f"{API_URL}/profile", headers=self.auth_headers)
        self.assertEqual(response.status_code, 200, f"Failed to get profile: {response.text}")
        
        profile = response.json()
        self.assertEqual(profile["username"], self.username)
        self.assertEqual(profile["email"], self.email)
        self.assertEqual(profile["full_name"], self.full_name)
        print("Profile retrieval successful")
        
        # 3. Test profile update
        new_full_name = "عبد الله محمد"
        update_data = {
            "full_name": new_full_name
        }
        
        print("Testing profile update")
        response = requests.put(f"{API_URL}/profile", headers=self.auth_headers, data=update_data)
        self.assertEqual(response.status_code, 200, f"Failed to update profile: {response.text}")
        
        updated_profile = response.json()
        self.assertEqual(updated_profile["full_name"], new_full_name)
        print("Profile update successful")

    def test_2_section_management(self):
        """Test section management endpoints: /api/sections (GET, POST, DELETE)"""
        print("\n=== Testing Section Management Endpoints ===")
        
        # 1. Create a new section with Arabic name
        section_data = {
            "name": "قسم جديد للاختبار",
            "description": "وصف القسم الجديد للاختبار"
        }
        
        print("Creating a new section")
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
        print("Getting all sections")
        response = requests.get(f"{API_URL}/sections")
        self.assertEqual(response.status_code, 200, f"Failed to get sections: {response.text}")
        
        sections = response.json()
        self.assertIsInstance(sections, list)
        self.assertTrue(any(s["id"] == section_id for s in sections), "Created section not found in sections list")
        print(f"Successfully retrieved {len(sections)} sections")
        
        # 3. Delete a section
        print(f"Deleting section with ID: {section_id}")
        response = requests.delete(f"{API_URL}/sections/{section_id}")
        self.assertEqual(response.status_code, 200, f"Failed to delete section: {response.text}")
        
        # Verify section was deleted
        response = requests.get(f"{API_URL}/sections")
        sections = response.json()
        self.assertFalse(any(s["id"] == section_id for s in sections), "Deleted section still found in sections list")
        print("Successfully deleted section")
        
        # Remove from cleanup list since we already deleted it
        self.created_sections.remove(section_id)

    def test_3_article_management(self):
        """Test article management endpoints: /api/articles (all CRUD operations)"""
        print("\n=== Testing Article Management Endpoints ===")
        
        # 1. Create an article with Arabic content
        article_data = {
            "title": "مقال اختباري جديد",
            "content": "محتوى المقال الاختباري الجديد مع نص عربي",
            "author": "كاتب عربي",
            "section_id": self.test_section["id"],
            "image_data": self.sample_image_base64,
            "image_name": "test_arabic_image.png"
        }
        
        print("Creating a new article with Arabic content")
        response = requests.post(f"{API_URL}/articles", json=article_data)
        self.assertEqual(response.status_code, 200, f"Failed to create article: {response.text}")
        
        article = response.json()
        self.assertEqual(article["title"], article_data["title"])
        self.assertEqual(article["content"], article_data["content"])
        self.assertEqual(article["author"], article_data["author"])
        self.assertEqual(article["section_id"], article_data["section_id"])
        self.assertEqual(article["image_data"], article_data["image_data"])
        self.assertEqual(article["image_name"], article_data["image_name"])
        self.assertIn("id", article)
        
        # Add to cleanup list
        self.created_articles.append(article["id"])
        article_id = article["id"]
        print(f"Successfully created article with ID: {article_id}")
        
        # 2. Get all articles
        print("Getting all articles")
        response = requests.get(f"{API_URL}/articles")
        self.assertEqual(response.status_code, 200, f"Failed to get articles: {response.text}")
        
        articles = response.json()
        self.assertIsInstance(articles, list)
        self.assertTrue(any(a["id"] == article_id for a in articles), "Created article not found in articles list")
        print(f"Successfully retrieved {len(articles)} articles")
        
        # 3. Get a specific article
        print(f"Getting article with ID: {article_id}")
        response = requests.get(f"{API_URL}/articles/{article_id}")
        self.assertEqual(response.status_code, 200, f"Failed to get article: {response.text}")
        
        retrieved_article = response.json()
        self.assertEqual(retrieved_article["id"], article_id)
        self.assertEqual(retrieved_article["title"], article_data["title"])
        self.assertEqual(retrieved_article["content"], article_data["content"])
        print("Successfully retrieved specific article")
        
        # 4. Update an article
        update_data = {
            "title": "عنوان المقال المحدث",
            "content": "محتوى المقال بعد التحديث"
        }
        
        print(f"Updating article with ID: {article_id}")
        response = requests.put(f"{API_URL}/articles/{article_id}", json=update_data)
        self.assertEqual(response.status_code, 200, f"Failed to update article: {response.text}")
        
        updated_article = response.json()
        self.assertEqual(updated_article["id"], article_id)
        self.assertEqual(updated_article["title"], update_data["title"])
        self.assertEqual(updated_article["content"], update_data["content"])
        print("Successfully updated article")
        
        # 5. Get articles by section
        print(f"Getting articles by section ID: {self.test_section['id']}")
        response = requests.get(f"{API_URL}/articles/section/{self.test_section['id']}")
        self.assertEqual(response.status_code, 200, f"Failed to get articles by section: {response.text}")
        
        section_articles = response.json()
        self.assertIsInstance(section_articles, list)
        self.assertTrue(any(a["id"] == article_id for a in section_articles), "Created article not found in section articles")
        print(f"Successfully retrieved {len(section_articles)} articles for the section")
        
        # 6. Delete an article
        print(f"Deleting article with ID: {article_id}")
        response = requests.delete(f"{API_URL}/articles/{article_id}")
        self.assertEqual(response.status_code, 200, f"Failed to delete article: {response.text}")
        
        # Verify article was deleted
        response = requests.get(f"{API_URL}/articles")
        articles = response.json()
        self.assertFalse(any(a["id"] == article_id for a in articles), "Deleted article still found in articles list")
        print("Successfully deleted article")
        
        # Remove from cleanup list since we already deleted it
        self.created_articles.remove(article_id)

    def test_4_search_functionality(self):
        """Test search functionality: /api/search and /api/search/suggestions"""
        print("\n=== Testing Search Functionality ===")
        
        # Create multiple articles with Arabic content for search testing
        search_articles_data = [
            {
                "title": "الصلاة في الإسلام",
                "content": "الصلاة هي الركن الثاني من أركان الإسلام",
                "author": "الشيخ محمد",
                "section_id": self.test_section["id"]
            },
            {
                "title": "الزكاة وأحكامها",
                "content": "الزكاة هي الركن الثالث من أركان الإسلام",
                "author": "الشيخ أحمد",
                "section_id": self.test_section["id"]
            },
            {
                "title": "الصيام في شهر رمضان",
                "content": "الصيام هو الركن الرابع من أركان الإسلام",
                "author": "الشيخ محمد",
                "section_id": self.test_section["id"]
            }
        ]
        
        # Create search test articles
        search_article_ids = []
        print("Creating articles for search testing")
        for article_data in search_articles_data:
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create search test article: {response.text}")
            article = response.json()
            search_article_ids.append(article["id"])
            self.created_articles.append(article["id"])
        
        print(f"Created {len(search_article_ids)} articles for search testing")
        
        # 1. Basic search with Arabic term
        search_term = "الصلاة"
        print(f"Testing basic search with term: '{search_term}'")
        response = requests.get(f"{API_URL}/search?q={search_term}")
        self.assertEqual(response.status_code, 200, f"Failed to search: {response.text}")
        
        results = response.json()
        self.assertIn("articles", results)
        self.assertIn("sections", results)
        self.assertIn("total_results", results)
        
        # Should find articles containing "الصلاة"
        self.assertTrue(any(search_term in article["title"] or search_term in article["content"] 
                           for article in results["articles"]), 
                       "Search term not found in results")
        
        print(f"Found {results['total_results']} results for term '{search_term}'")
        
        # 2. Search with filters
        author = "الشيخ محمد"
        print(f"Testing search with author filter: '{author}'")
        response = requests.get(f"{API_URL}/search?author={author}")
        self.assertEqual(response.status_code, 200, f"Failed to search with author filter: {response.text}")
        
        results = response.json()
        # All articles should be by the specified author
        self.assertTrue(all(article["author"] == author for article in results["articles"]), 
                       "Author filter not working correctly")
        
        print(f"Found {len(results['articles'])} articles by author '{author}'")
        
        # 3. Search with section filter
        print(f"Testing search with section filter")
        response = requests.get(f"{API_URL}/search?section_id={self.test_section['id']}")
        self.assertEqual(response.status_code, 200, f"Failed to search with section filter: {response.text}")
        
        results = response.json()
        # All articles should be from the specified section
        self.assertTrue(all(article["section_id"] == self.test_section["id"] for article in results["articles"]), 
                       "Section filter not working correctly")
        
        print(f"Found {len(results['articles'])} articles in section '{self.test_section['name']}'")
        
        # 4. Search suggestions
        partial_term = "الص"  # Should match "الصلاة" and "الصيام"
        print(f"Testing search suggestions with partial term: '{partial_term}'")
        response = requests.get(f"{API_URL}/search/suggestions?q={partial_term}")
        self.assertEqual(response.status_code, 200, f"Failed to get search suggestions: {response.text}")
        
        suggestions = response.json()["suggestions"]
        self.assertGreaterEqual(len(suggestions), 1, "Expected at least one suggestion")
        print(f"Found {len(suggestions)} suggestions for partial term '{partial_term}'")

    def test_5_comment_system(self):
        """Test comment system: /api/articles/{id}/comments"""
        print("\n=== Testing Comment System ===")
        
        # 1. Create a comment with Arabic content
        comment_data = {
            "content": "هذا تعليق اختباري باللغة العربية"
        }
        
        print("Creating a comment with Arabic content")
        response = requests.post(
            f"{API_URL}/articles/{self.test_article['id']}/comments", 
            json=comment_data,
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to create comment: {response.text}")
        
        comment = response.json()
        self.assertEqual(comment["content"], comment_data["content"])
        self.assertEqual(comment["article_id"], self.test_article["id"])
        self.assertEqual(comment["user_full_name"], self.full_name)
        self.assertIn("id", comment)
        
        # Add to cleanup list
        self.created_comments.append(comment["id"])
        comment_id = comment["id"]
        print(f"Successfully created comment with ID: {comment_id}")
        
        # 2. Get comments for an article
        print(f"Getting comments for article ID: {self.test_article['id']}")
        response = requests.get(f"{API_URL}/articles/{self.test_article['id']}/comments")
        self.assertEqual(response.status_code, 200, f"Failed to get comments: {response.text}")
        
        comments = response.json()
        self.assertIsInstance(comments, list)
        self.assertTrue(any(c["id"] == comment_id for c in comments), "Created comment not found in comments list")
        print(f"Successfully retrieved {len(comments)} comments")
        
        # 3. Update a comment
        update_data = {
            "content": "تم تحديث التعليق باللغة العربية"
        }
        
        print(f"Updating comment with ID: {comment_id}")
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
        
        # 4. Delete a comment
        print(f"Deleting comment with ID: {comment_id}")
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

    def test_6_like_system(self):
        """Test like system: /api/articles/{id}/like"""
        print("\n=== Testing Like System ===")
        
        # 1. Like an article
        print(f"Liking article with ID: {self.test_article['id']}")
        response = requests.post(
            f"{API_URL}/articles/{self.test_article['id']}/like",
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to like article: {response.text}")
        print("Successfully liked article")
        
        # 2. Verify article is liked by getting it with authentication
        print("Verifying article is liked")
        response = requests.get(
            f"{API_URL}/articles-auth/{self.test_article['id']}",
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to get article with auth: {response.text}")
        
        article = response.json()
        self.assertTrue(article["is_liked"], "Article should be marked as liked")
        self.assertEqual(article["likes_count"], 1, "Article should have 1 like")
        print("Successfully verified article is liked")
        
        # 3. Unlike an article
        print(f"Unliking article with ID: {self.test_article['id']}")
        response = requests.delete(
            f"{API_URL}/articles/{self.test_article['id']}/like",
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to unlike article: {response.text}")
        print("Successfully unliked article")
        
        # 4. Verify article is unliked
        print("Verifying article is unliked")
        response = requests.get(
            f"{API_URL}/articles-auth/{self.test_article['id']}",
            headers=self.auth_headers
        )
        self.assertEqual(response.status_code, 200, f"Failed to get article with auth: {response.text}")
        
        article = response.json()
        self.assertFalse(article["is_liked"], "Article should not be marked as liked")
        self.assertEqual(article["likes_count"], 0, "Article should have 0 likes")
        print("Successfully verified article is unliked")

    def test_7_logo_management(self):
        """Test logo management: /api/settings/logo"""
        print("\n=== Testing Logo Management ===")
        
        # 1. Get current logo settings
        print("Getting current logo settings")
        response = requests.get(f"{API_URL}/settings/logo")
        self.assertEqual(response.status_code, 200, f"Failed to get logo settings: {response.text}")
        
        initial_logo = response.json()
        self.assertIn("logo_data", initial_logo)
        self.assertIn("logo_name", initial_logo)
        self.assertIn("site_name", initial_logo)
        print("Successfully retrieved logo settings")
        
        # Save initial logo data for restoration
        initial_logo_data = initial_logo.get("logo_data")
        initial_logo_name = initial_logo.get("logo_name")
        
        # 2. Update logo settings
        logo_update = {
            "logo_data": self.sample_image_base64,
            "logo_name": f"arabic_logo_{uuid.uuid4()}.png"
        }
        
        print("Updating logo settings")
        response = requests.put(f"{API_URL}/settings/logo", json=logo_update)
        self.assertEqual(response.status_code, 200, f"Failed to update logo settings: {response.text}")
        
        updated_logo = response.json()
        self.assertEqual(updated_logo["logo_data"], logo_update["logo_data"])
        self.assertEqual(updated_logo["logo_name"], logo_update["logo_name"])
        print("Successfully updated logo settings")
        
        # 3. Verify logo was updated
        print("Verifying logo update")
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
            
            print("Restoring original logo settings")
            response = requests.put(f"{API_URL}/settings/logo", json=restore_data)
            self.assertEqual(response.status_code, 200, f"Failed to restore logo settings: {response.text}")
            print("Successfully restored original logo settings")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
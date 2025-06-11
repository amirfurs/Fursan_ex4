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

class TestSearchAPI(unittest.TestCase):
    def setUp(self):
        # Create test sections with Arabic and English names
        self.arabic_section_data = {
            "name": "قسم الفقه الإسلامي",
            "description": "هذا القسم مخصص للفقه الإسلامي وأحكامه"
        }
        
        self.english_section_data = {
            "name": f"Islamic History {uuid.uuid4()}",
            "description": "This section is dedicated to Islamic history"
        }
        
        # Create test sections
        response = requests.post(f"{API_URL}/sections", json=self.arabic_section_data)
        self.assertEqual(response.status_code, 200, f"Failed to create Arabic test section: {response.text}")
        self.arabic_section = response.json()
        
        response = requests.post(f"{API_URL}/sections", json=self.english_section_data)
        self.assertEqual(response.status_code, 200, f"Failed to create English test section: {response.text}")
        self.english_section = response.json()
        
        # Sample image as base64 for testing
        self.sample_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        
        # Create test user for authentication tests
        self.test_user_data = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
            "full_name": "محمد أحمد",
            "password": "TestPassword123!",
            "profile_picture": self.sample_image_base64
        }
        
        # Register the test user
        response = requests.post(f"{API_URL}/register", json=self.test_user_data)
        self.assertEqual(response.status_code, 200, f"Failed to register test user: {response.text}")
        self.test_user = response.json()
        self.auth_token = self.test_user["access_token"]
        self.auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create test articles with Arabic content
        self.arabic_articles = []
        self.english_articles = []
        
        # Create Arabic articles in Arabic section
        arabic_article_data = [
            {
                "title": "أركان الإسلام الخمسة",
                "content": "الشهادتان والصلاة والزكاة والصوم والحج",
                "author": "الشيخ محمد",
                "section_id": self.arabic_section["id"]
            },
            {
                "title": "فقه الصلاة",
                "content": "شروط الصلاة وأركانها وواجباتها وسننها",
                "author": "الشيخ أحمد",
                "section_id": self.arabic_section["id"]
            },
            {
                "title": "أحكام الزكاة",
                "content": "نصاب الزكاة ومقاديرها ومستحقيها",
                "author": "الشيخ محمد",
                "section_id": self.arabic_section["id"]
            }
        ]
        
        # Create English articles in English section
        english_article_data = [
            {
                "title": "The Five Pillars of Islam",
                "content": "Shahada, Prayer, Zakat, Fasting, and Hajj",
                "author": "Sheikh Abdullah",
                "section_id": self.english_section["id"]
            },
            {
                "title": "Islamic History Overview",
                "content": "The history of Islam from the Prophet Muhammad to modern times",
                "author": "Dr. Smith",
                "section_id": self.english_section["id"]
            }
        ]
        
        # Create articles with different dates for date filter testing
        today = datetime.now()
        self.date_articles_data = [
            {
                "title": "مقال اليوم",
                "content": "هذا مقال تم نشره اليوم",
                "author": "كاتب معاصر",
                "section_id": self.arabic_section["id"],
                "created_at": today.strftime("%Y-%m-%d")
            },
            {
                "title": "مقال الأمس",
                "content": "هذا مقال تم نشره بالأمس",
                "author": "كاتب قديم",
                "section_id": self.arabic_section["id"],
                "created_at": (today - timedelta(days=1)).strftime("%Y-%m-%d")
            },
            {
                "title": "مقال قديم",
                "content": "هذا مقال تم نشره منذ أسبوع",
                "author": "كاتب قديم جدا",
                "section_id": self.arabic_section["id"],
                "created_at": (today - timedelta(days=7)).strftime("%Y-%m-%d")
            }
        ]
        
        # Create Arabic articles
        for article_data in arabic_article_data:
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create Arabic article: {response.text}")
            self.arabic_articles.append(response.json())
        
        # Create English articles
        for article_data in english_article_data:
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create English article: {response.text}")
            self.english_articles.append(response.json())
        
        # Create date-specific articles
        self.date_articles = []
        for article_data in self.date_articles_data:
            # Remove created_at as it's handled by the server
            created_at = article_data.pop("created_at", None)
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create date article: {response.text}")
            self.date_articles.append(response.json())
        
        # Track created resources for cleanup
        self.created_sections = [self.arabic_section["id"], self.english_section["id"]]
        self.created_articles = []
        
        # Add all created articles to cleanup list
        for article in self.arabic_articles + self.english_articles + self.date_articles:
            self.created_articles.append(article["id"])

    def tearDown(self):
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

    # Basic Search Tests
    def test_basic_search(self):
        """Test basic search functionality with Arabic and English terms"""
        print("\n=== Testing Basic Search ===")
        
        # 1. Search with Arabic term
        print("Searching with Arabic term 'الصلاة'...")
        response = requests.get(f"{API_URL}/search?q=الصلاة")
        self.assertEqual(response.status_code, 200, f"Failed to search with Arabic term: {response.text}")
        
        results = response.json()
        self.assertIn("articles", results)
        self.assertIn("sections", results)
        self.assertIn("total_results", results)
        
        # Should find articles containing "الصلاة"
        self.assertTrue(any("الصلاة" in article["title"] or "الصلاة" in article["content"] 
                           for article in results["articles"]), 
                       "Arabic search term not found in results")
        
        print(f"Found {results['total_results']} results for Arabic term 'الصلاة'")
        
        # 2. Search with English term
        print("Searching with English term 'Pillars'...")
        response = requests.get(f"{API_URL}/search?q=Pillars")
        self.assertEqual(response.status_code, 200, f"Failed to search with English term: {response.text}")
        
        results = response.json()
        
        # Should find articles containing "Pillars"
        self.assertTrue(any("Pillars" in article["title"] or "Pillars" in article["content"] 
                           for article in results["articles"]), 
                       "English search term not found in results")
        
        print(f"Found {results['total_results']} results for English term 'Pillars'")
        
        # 3. Search with term that should match both Arabic and English content
        print("Searching with term 'Islam'...")
        response = requests.get(f"{API_URL}/search?q=Islam")
        self.assertEqual(response.status_code, 200, f"Failed to search with common term: {response.text}")
        
        results = response.json()
        print(f"Found {results['total_results']} results for term 'Islam'")

    # Search Filter Tests
    def test_search_filters(self):
        """Test search filters (section_id, author, date range, sorting)"""
        print("\n=== Testing Search Filters ===")
        
        # 1. Filter by section_id
        print(f"Filtering search by Arabic section ID: {self.arabic_section['id']}...")
        response = requests.get(f"{API_URL}/search?section_id={self.arabic_section['id']}")
        self.assertEqual(response.status_code, 200, f"Failed to filter by section: {response.text}")
        
        results = response.json()
        # All articles should be from the Arabic section
        self.assertTrue(all(article["section_id"] == self.arabic_section["id"] 
                           for article in results["articles"]), 
                       "Section filter not working correctly")
        
        print(f"Found {len(results['articles'])} articles in the Arabic section")
        
        # 2. Filter by author
        author = "الشيخ محمد"
        print(f"Filtering search by author: {author}...")
        response = requests.get(f"{API_URL}/search?author={author}")
        self.assertEqual(response.status_code, 200, f"Failed to filter by author: {response.text}")
        
        results = response.json()
        # All articles should be by the specified author
        self.assertTrue(all(article["author"] == author or author in article["author"]
                           for article in results["articles"]), 
                       "Author filter not working correctly")
        
        print(f"Found {len(results['articles'])} articles by author '{author}'")
        
        # 3. Filter by date range
        today = datetime.now().strftime("%Y-%m-%d")
        week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        print(f"Filtering search by date range from {week_ago} to {today}...")
        response = requests.get(f"{API_URL}/search?from_date={week_ago}&to_date={today}")
        self.assertEqual(response.status_code, 200, f"Failed to filter by date range: {response.text}")
        
        results = response.json()
        print(f"Found {len(results['articles'])} articles in date range")
        
        # 4. Test sorting
        # Test relevance sorting (default)
        print("Testing relevance sorting...")
        response = requests.get(f"{API_URL}/search?q=مقال&sort_by=relevance")
        self.assertEqual(response.status_code, 200, f"Failed to sort by relevance: {response.text}")
        
        # Test date descending sorting
        print("Testing date descending sorting...")
        response = requests.get(f"{API_URL}/search?q=مقال&sort_by=date_desc")
        self.assertEqual(response.status_code, 200, f"Failed to sort by date_desc: {response.text}")
        
        results = response.json()
        articles = results["articles"]
        
        # Verify date sorting (if multiple articles)
        if len(articles) > 1:
            for i in range(len(articles) - 1):
                date1 = datetime.fromisoformat(articles[i]["created_at"].replace("Z", "+00:00"))
                date2 = datetime.fromisoformat(articles[i+1]["created_at"].replace("Z", "+00:00"))
                self.assertTrue(date1 >= date2, "Date descending sort not working correctly")
        
        print("Date descending sort verified")
        
        # Test date ascending sorting
        print("Testing date ascending sorting...")
        response = requests.get(f"{API_URL}/search?q=مقال&sort_by=date_asc")
        self.assertEqual(response.status_code, 200, f"Failed to sort by date_asc: {response.text}")
        
        results = response.json()
        articles = results["articles"]
        
        # Verify date sorting (if multiple articles)
        if len(articles) > 1:
            for i in range(len(articles) - 1):
                date1 = datetime.fromisoformat(articles[i]["created_at"].replace("Z", "+00:00"))
                date2 = datetime.fromisoformat(articles[i+1]["created_at"].replace("Z", "+00:00"))
                self.assertTrue(date1 <= date2, "Date ascending sort not working correctly")
        
        print("Date ascending sort verified")
        
        # 5. Combine multiple filters
        print("Testing combined filters...")
        response = requests.get(f"{API_URL}/search?q=مقال&section_id={self.arabic_section['id']}&sort_by=date_desc")
        self.assertEqual(response.status_code, 200, f"Failed to apply combined filters: {response.text}")
        
        results = response.json()
        print(f"Found {len(results['articles'])} articles with combined filters")

    # Search Suggestions Tests
    def test_search_suggestions(self):
        """Test search suggestions functionality"""
        print("\n=== Testing Search Suggestions ===")
        
        # 1. Get suggestions for Arabic partial term
        partial_term = "الص"  # Should match "الصلاة"
        print(f"Getting suggestions for Arabic partial term '{partial_term}'...")
        response = requests.get(f"{API_URL}/search/suggestions?q={partial_term}")
        self.assertEqual(response.status_code, 200, f"Failed to get suggestions for Arabic term: {response.text}")
        
        results = response.json()
        self.assertIn("suggestions", results)
        
        # Should find suggestions containing "الصلاة"
        self.assertTrue(any(partial_term in suggestion for suggestion in results["suggestions"]), 
                       "Arabic partial term not found in suggestions")
        
        print(f"Found {len(results['suggestions'])} suggestions for Arabic partial term '{partial_term}'")
        
        # 2. Get suggestions for English partial term
        partial_term = "Pil"  # Should match "Pillars"
        print(f"Getting suggestions for English partial term '{partial_term}'...")
        response = requests.get(f"{API_URL}/search/suggestions?q={partial_term}")
        self.assertEqual(response.status_code, 200, f"Failed to get suggestions for English term: {response.text}")
        
        results = response.json()
        
        # Should find suggestions containing "Pillars"
        if results["suggestions"]:
            self.assertTrue(any("Pil" in suggestion for suggestion in results["suggestions"]), 
                           "English partial term not found in suggestions")
        
        print(f"Found {len(results['suggestions'])} suggestions for English partial term '{partial_term}'")
        
        # 3. Test with very short term (should return empty)
        print("Testing suggestions with very short term...")
        response = requests.get(f"{API_URL}/search/suggestions?q=a")
        self.assertEqual(response.status_code, 200, f"Failed to get suggestions for short term: {response.text}")
        
        results = response.json()
        self.assertEqual(len(results["suggestions"]), 0, "Short term should return empty suggestions")
        print("Successfully returned empty suggestions for very short term")

    # Edge Cases Tests
    def test_edge_cases(self):
        """Test search edge cases"""
        print("\n=== Testing Search Edge Cases ===")
        
        # 1. Empty search
        print("Testing empty search...")
        response = requests.get(f"{API_URL}/search?q=")
        self.assertEqual(response.status_code, 200, f"Failed to handle empty search: {response.text}")
        
        results = response.json()
        self.assertEqual(results["total_results"], 0, "Empty search should return no results")
        print("Successfully handled empty search")
        
        # 2. Search with non-existent term
        print("Testing search with non-existent term...")
        response = requests.get(f"{API_URL}/search?q=xyznonexistentterm123")
        self.assertEqual(response.status_code, 200, f"Failed to handle non-existent term: {response.text}")
        
        results = response.json()
        self.assertEqual(results["total_results"], 0, "Non-existent term should return no results")
        print("Successfully handled non-existent term")
        
        # 3. Search with special characters
        print("Testing search with special characters...")
        response = requests.get(f"{API_URL}/search?q=!@#$%^&*()")
        self.assertEqual(response.status_code, 200, f"Failed to handle special characters: {response.text}")
        
        # Should not crash with special characters
        print("Successfully handled special characters")
        
        # 4. Search with whitespace
        print("Testing search with whitespace...")
        response = requests.get(f"{API_URL}/search?q=   ")
        self.assertEqual(response.status_code, 200, f"Failed to handle whitespace: {response.text}")
        
        results = response.json()
        self.assertEqual(results["total_results"], 0, "Whitespace search should return no results")
        print("Successfully handled whitespace")

    # Performance Tests
    def test_performance(self):
        """Test search performance with multiple requests"""
        print("\n=== Testing Search Performance ===")
        
        # Perform multiple search requests and measure response time
        num_requests = 5
        total_time = 0
        
        print(f"Performing {num_requests} search requests...")
        
        for i in range(num_requests):
            term = "الإسلام" if i % 2 == 0 else "Islam"
            
            start_time = time.time()
            response = requests.get(f"{API_URL}/search?q={term}")
            end_time = time.time()
            
            self.assertEqual(response.status_code, 200, f"Search request {i+1} failed: {response.text}")
            
            request_time = end_time - start_time
            total_time += request_time
            
            print(f"Request {i+1} completed in {request_time:.4f} seconds")
        
        avg_time = total_time / num_requests
        print(f"Average response time: {avg_time:.4f} seconds")
        
        # Check if average response time is reasonable (under 2 seconds)
        self.assertLess(avg_time, 2.0, f"Average response time ({avg_time:.4f}s) exceeds 2 seconds")
        print("Performance test passed")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)

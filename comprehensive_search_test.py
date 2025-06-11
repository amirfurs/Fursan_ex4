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

class TestSearchSystem(unittest.TestCase):
    def setUp(self):
        # Create test sections with Arabic and English names
        self.sections_data = [
            {
                "name": "العقيدة الإسلامية",
                "description": "قسم مخصص للعقيدة الإسلامية وأصولها"
            },
            {
                "name": "الفقه الإسلامي",
                "description": "قسم مخصص للفقه الإسلامي وأحكامه"
            },
            {
                "name": "السيرة النبوية",
                "description": "قسم مخصص لسيرة النبي محمد صلى الله عليه وسلم"
            },
            {
                "name": "Islamic History",
                "description": "This section is dedicated to Islamic history"
            }
        ]
        
        # Create test sections
        self.created_sections = []
        for section_data in self.sections_data:
            response = requests.post(f"{API_URL}/sections", json=section_data)
            self.assertEqual(response.status_code, 200, f"Failed to create section: {response.text}")
            section = response.json()
            self.created_sections.append(section)
        
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
        self.articles_data = [
            # Arabic articles
            {
                "title": "أركان الإسلام الخمسة",
                "content": "الشهادتان والصلاة والزكاة والصوم والحج",
                "author": "الشيخ محمد",
                "section_id": self.created_sections[0]["id"]
            },
            {
                "title": "فقه الصلاة",
                "content": "شروط الصلاة وأركانها وواجباتها وسننها",
                "author": "الشيخ أحمد",
                "section_id": self.created_sections[1]["id"]
            },
            {
                "title": "أحكام الزكاة",
                "content": "نصاب الزكاة ومقاديرها ومستحقيها",
                "author": "الشيخ محمد",
                "section_id": self.created_sections[1]["id"]
            },
            {
                "title": "غزوة بدر الكبرى",
                "content": "غزوة بدر الكبرى هي أول معركة كبرى في الإسلام، وقعت في 17 من رمضان في السنة الثانية للهجرة",
                "author": "الدكتور أحمد",
                "section_id": self.created_sections[2]["id"]
            },
            # English articles
            {
                "title": "The Five Pillars of Islam",
                "content": "Shahada, Prayer, Zakat, Fasting, and Hajj",
                "author": "Sheikh Abdullah",
                "section_id": self.created_sections[3]["id"]
            },
            {
                "title": "Islamic History Overview",
                "content": "The history of Islam from the Prophet Muhammad to modern times",
                "author": "Dr. Smith",
                "section_id": self.created_sections[3]["id"]
            },
            # Articles with special characters and mixed content
            {
                "title": "الإسلام في العصر الحديث - Modern Islam",
                "content": "دراسة عن الإسلام في العصر الحديث والتحديات المعاصرة - A study of Islam in the modern era",
                "author": "د. محمد سميث - Dr. M. Smith",
                "section_id": self.created_sections[3]["id"]
            },
            {
                "title": "مقال يحتوي على رموز خاصة !@#$%^&*()",
                "content": "هذا المقال يحتوي على رموز خاصة مثل !@#$%^&*() للاختبار",
                "author": "كاتب الاختبار",
                "section_id": self.created_sections[0]["id"]
            }
        ]
        
        # Create articles
        self.created_articles = []
        for article_data in self.articles_data:
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create article: {response.text}")
            self.created_articles.append(response.json())

    def tearDown(self):
        # Clean up created articles
        for article in self.created_articles:
            try:
                requests.delete(f"{API_URL}/articles/{article['id']}")
            except Exception as e:
                print(f"Error cleaning up article {article['id']}: {e}")
        
        # Clean up created sections
        for section in self.created_sections:
            try:
                requests.delete(f"{API_URL}/sections/{section['id']}")
            except Exception as e:
                print(f"Error cleaning up section {section['id']}: {e}")

    def test_1_basic_search(self):
        """Test basic search functionality with Arabic and English terms"""
        print("\n=== Testing Basic Search ===")
        
        # Test cases with various search terms
        test_cases = [
            {"term": "الصلاة", "expected_min_count": 2, "description": "Arabic term 'الصلاة'"},
            {"term": "Pillars", "expected_min_count": 1, "description": "English term 'Pillars'"},
            {"term": "Islam", "expected_min_count": 3, "description": "Common term 'Islam'"},
            {"term": "الإسلام", "expected_min_count": 3, "description": "Arabic term 'الإسلام'"},
            {"term": "غزوة", "expected_min_count": 1, "description": "Arabic term 'غزوة'"},
            {"term": "Prayer", "expected_min_count": 1, "description": "English term 'Prayer'"}
        ]
        
        for test_case in test_cases:
            term = test_case["term"]
            description = test_case["description"]
            expected_min_count = test_case["expected_min_count"]
            
            print(f"\nTesting search with {description}")
            response = requests.get(f"{API_URL}/search?q={term}")
            self.assertEqual(response.status_code, 200, f"Failed to search with term '{term}': {response.text}")
            
            results = response.json()
            total_results = results["total_results"]
            
            self.assertGreaterEqual(total_results, expected_min_count, 
                                  f"Expected at least {expected_min_count} results for '{term}', got {total_results}")
            print(f"Found {total_results} results for '{term}' (expected at least {expected_min_count})")

    def test_2_search_filters(self):
        """Test search filters (section_id, author, date range, sorting)"""
        print("\n=== Testing Search Filters ===")
        
        # 1. Filter by section_id
        section_name = "الفقه الإسلامي"
        section_id = next(section["id"] for section in self.created_sections if section["name"] == section_name)
        
        print(f"\nTesting filter by section '{section_name}'")
        response = requests.get(f"{API_URL}/search?section_id={section_id}")
        self.assertEqual(response.status_code, 200, f"Failed to filter by section: {response.text}")
        
        results = response.json()
        articles = results["articles"]
        
        # All articles should be from this section
        self.assertTrue(all(article["section_id"] == section_id for article in articles),
                       f"Not all articles are from section '{section_name}'")
        print(f"Found {len(articles)} articles in section '{section_name}'")
        
        # 2. Filter by author
        author = "الشيخ محمد"
        print(f"\nTesting filter by author '{author}'")
        response = requests.get(f"{API_URL}/search?author={author}")
        self.assertEqual(response.status_code, 200, f"Failed to filter by author: {response.text}")
        
        results = response.json()
        articles = results["articles"]
        
        # All articles should be by this author
        self.assertTrue(all(author in article["author"] for article in articles),
                       f"Not all articles are by author '{author}'")
        print(f"Found {len(articles)} articles by author '{author}'")
        
        # 3. Test sorting
        # Test relevance sorting (default)
        print("\nTesting relevance sorting")
        response = requests.get(f"{API_URL}/search?q=الإسلام&sort_by=relevance")
        self.assertEqual(response.status_code, 200, f"Failed to sort by relevance: {response.text}")
        
        # Test date descending sorting
        print("\nTesting date descending sorting")
        response = requests.get(f"{API_URL}/search?q=الإسلام&sort_by=date_desc")
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
        print("\nTesting date ascending sorting")
        response = requests.get(f"{API_URL}/search?q=الإسلام&sort_by=date_asc")
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
        
        # 4. Combine multiple filters
        print("\nTesting combined filters")
        response = requests.get(f"{API_URL}/search?q=الإسلام&section_id={section_id}&sort_by=date_desc")
        self.assertEqual(response.status_code, 200, f"Failed to apply combined filters: {response.text}")
        
        results = response.json()
        print(f"Found {len(results['articles'])} articles with combined filters")

    def test_3_search_suggestions(self):
        """Test search suggestions functionality"""
        print("\n=== Testing Search Suggestions ===")
        
        # Test cases with partial terms
        test_cases = [
            {"term": "الص", "expected_min_count": 1, "description": "Arabic partial term 'الص'"},
            {"term": "Pil", "expected_min_count": 1, "description": "English partial term 'Pil'"},
            {"term": "الإس", "expected_min_count": 1, "description": "Arabic partial term 'الإس'"},
            {"term": "Isl", "expected_min_count": 1, "description": "English partial term 'Isl'"},
            {"term": "الشيخ", "expected_min_count": 1, "description": "Author partial term 'الشيخ'"},
            {"term": "Dr", "expected_min_count": 1, "description": "Author partial term 'Dr'"}
        ]
        
        for test_case in test_cases:
            term = test_case["term"]
            description = test_case["description"]
            expected_min_count = test_case["expected_min_count"]
            
            print(f"\nTesting suggestions for {description}")
            response = requests.get(f"{API_URL}/search/suggestions?q={term}")
            self.assertEqual(response.status_code, 200, f"Failed to get suggestions for '{term}': {response.text}")
            
            results = response.json()
            suggestions = results["suggestions"]
            
            if len(suggestions) < expected_min_count:
                print(f"WARNING: Expected at least {expected_min_count} suggestions for '{term}', got {len(suggestions)}")
            
            print(f"Found {len(suggestions)} suggestions for '{term}': {suggestions}")

    def test_4_edge_cases(self):
        """Test search edge cases"""
        print("\n=== Testing Search Edge Cases ===")
        
        # Test cases for edge scenarios
        test_cases = [
            {"term": "", "description": "Empty search"},
            {"term": "xyznonexistentterm123", "description": "Non-existent term"},
            {"term": "!@#$%^&*()", "description": "Special characters"},
            {"term": "   ", "description": "Whitespace only"}
        ]
        
        for test_case in test_cases:
            term = test_case["term"]
            description = test_case["description"]
            
            print(f"\nTesting {description}")
            response = requests.get(f"{API_URL}/search?q={term}")
            self.assertEqual(response.status_code, 200, f"Failed to handle {description}: {response.text}")
            
            # Should not crash with edge cases
            print(f"Successfully handled {description}")

    def test_5_performance(self):
        """Test search performance with multiple requests"""
        print("\n=== Testing Search Performance ===")
        
        # Perform multiple search requests and measure response time
        num_requests = 10
        total_time = 0
        
        print(f"Performing {num_requests} search requests...")
        
        search_terms = ["الإسلام", "Islam", "الصلاة", "Prayer", "غزوة", "History"]
        
        for i in range(num_requests):
            term = search_terms[i % len(search_terms)]
            
            start_time = time.time()
            response = requests.get(f"{API_URL}/search?q={term}")
            end_time = time.time()
            
            self.assertEqual(response.status_code, 200, f"Search request {i+1} failed: {response.text}")
            
            request_time = end_time - start_time
            total_time += request_time
            
            print(f"Request {i+1} with term '{term}' completed in {request_time:.4f} seconds")
        
        avg_time = total_time / num_requests
        print(f"Average response time: {avg_time:.4f} seconds")
        
        # Check if average response time is reasonable (under 2 seconds)
        self.assertLess(avg_time, 2.0, f"Average response time ({avg_time:.4f}s) exceeds 2 seconds")
        print("Performance test passed")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)

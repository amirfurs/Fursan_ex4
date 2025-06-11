import requests
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

class TestArabicSearch(unittest.TestCase):
    def setUp(self):
        # Create test sections with Arabic names
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
            }
        ]
        
        # Create test sections
        self.created_sections = []
        for section_data in self.sections_data:
            response = requests.post(f"{API_URL}/sections", json=section_data)
            self.assertEqual(response.status_code, 200, f"Failed to create section: {response.text}")
            section = response.json()
            self.created_sections.append(section)
        
        # Create test articles with Arabic content
        self.articles_data = [
            {
                "title": "توحيد الألوهية",
                "content": "توحيد الألوهية هو إفراد الله تعالى بالعبادة، وهو أساس دعوة الرسل عليهم السلام",
                "author": "الشيخ عبد الله",
                "section_id": self.created_sections[0]["id"]
            },
            {
                "title": "أحكام الصلاة",
                "content": "الصلاة عماد الدين، وهي الركن الثاني من أركان الإسلام، وتجب على كل مسلم بالغ عاقل",
                "author": "الشيخ محمد",
                "section_id": self.created_sections[1]["id"]
            },
            {
                "title": "غزوة بدر الكبرى",
                "content": "غزوة بدر الكبرى هي أول معركة كبرى في الإسلام، وقعت في 17 من رمضان في السنة الثانية للهجرة",
                "author": "الدكتور أحمد",
                "section_id": self.created_sections[2]["id"]
            },
            {
                "title": "صفات الله تعالى",
                "content": "لله تعالى أسماء وصفات حسنى، يجب الإيمان بها كما وردت في القرآن والسنة",
                "author": "الشيخ عبد الله",
                "section_id": self.created_sections[0]["id"]
            },
            {
                "title": "أحكام الزكاة",
                "content": "الزكاة هي الركن الثالث من أركان الإسلام، وتجب في المال إذا بلغ النصاب وحال عليه الحول",
                "author": "الشيخ محمد",
                "section_id": self.created_sections[1]["id"]
            }
        ]
        
        # Create test articles
        self.created_articles = []
        for article_data in self.articles_data:
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create article: {response.text}")
            article = response.json()
            self.created_articles.append(article)

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

    def test_arabic_search(self):
        """Test search with Arabic terms"""
        print("\n=== Testing Arabic Search ===")
        
        # Test cases with Arabic search terms
        test_cases = [
            {"term": "توحيد", "expected_count": 1, "description": "Search for 'توحيد'"},
            {"term": "الصلاة", "expected_min_count": 1, "description": "Search for 'الصلاة'"},
            {"term": "الإسلام", "expected_min_count": 2, "description": "Search for 'الإسلام'"},
            {"term": "الشيخ محمد", "expected_count": 2, "description": "Search for author 'الشيخ محمد'"},
            {"term": "غزوة", "expected_count": 1, "description": "Search for 'غزوة'"},
            {"term": "أركان", "expected_min_count": 2, "description": "Search for 'أركان'"}
        ]
        
        for test_case in test_cases:
            term = test_case["term"]
            description = test_case["description"]
            
            print(f"\nTesting: {description}")
            response = requests.get(f"{API_URL}/search?q={term}")
            self.assertEqual(response.status_code, 200, f"Failed to search for '{term}': {response.text}")
            
            results = response.json()
            total_results = results["total_results"]
            
            if "expected_count" in test_case:
                expected_count = test_case["expected_count"]
                self.assertEqual(total_results, expected_count, 
                               f"Expected {expected_count} results for '{term}', got {total_results}")
                print(f"Found exactly {total_results} results for '{term}' as expected")
            elif "expected_min_count" in test_case:
                expected_min_count = test_case["expected_min_count"]
                self.assertGreaterEqual(total_results, expected_min_count, 
                                      f"Expected at least {expected_min_count} results for '{term}', got {total_results}")
                print(f"Found {total_results} results for '{term}' (expected at least {expected_min_count})")

    def test_arabic_search_filters(self):
        """Test search filters with Arabic content"""
        print("\n=== Testing Arabic Search Filters ===")
        
        # 1. Filter by section
        section_name = "العقيدة الإسلامية"
        section_id = next(section["id"] for section in self.created_sections if section["name"] == section_name)
        
        print(f"\nTesting: Filter by section '{section_name}'")
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
        print(f"\nTesting: Filter by author '{author}'")
        response = requests.get(f"{API_URL}/search?author={author}")
        self.assertEqual(response.status_code, 200, f"Failed to filter by author: {response.text}")
        
        results = response.json()
        articles = results["articles"]
        
        # All articles should be by this author
        self.assertTrue(all(article["author"] == author for article in articles),
                       f"Not all articles are by author '{author}'")
        print(f"Found {len(articles)} articles by author '{author}'")
        
        # 3. Combined search term and filter
        term = "أحكام"
        print(f"\nTesting: Search for '{term}' by author '{author}'")
        response = requests.get(f"{API_URL}/search?q={term}&author={author}")
        self.assertEqual(response.status_code, 200, f"Failed to search with combined filters: {response.text}")
        
        results = response.json()
        articles = results["articles"]
        
        # Articles should contain the term and be by the author
        self.assertTrue(all(article["author"] == author for article in articles),
                       f"Not all articles are by author '{author}'")
        self.assertTrue(all(term in article["title"] or term in article["content"] for article in articles),
                       f"Not all articles contain the term '{term}'")
        print(f"Found {len(articles)} articles containing '{term}' by author '{author}'")

    def test_arabic_search_suggestions(self):
        """Test search suggestions with Arabic terms"""
        print("\n=== Testing Arabic Search Suggestions ===")
        
        # Test cases with Arabic partial terms
        test_cases = [
            {"term": "تو", "expected_min_count": 1, "description": "Suggestions for 'تو' (should match 'توحيد')"},
            {"term": "الص", "expected_min_count": 1, "description": "Suggestions for 'الص' (should match 'الصلاة')"},
            {"term": "غز", "expected_min_count": 1, "description": "Suggestions for 'غز' (should match 'غزوة')"},
            {"term": "الشيخ", "expected_min_count": 1, "description": "Suggestions for 'الشيخ' (should match authors)"}
        ]
        
        for test_case in test_cases:
            term = test_case["term"]
            description = test_case["description"]
            expected_min_count = test_case["expected_min_count"]
            
            print(f"\nTesting: {description}")
            response = requests.get(f"{API_URL}/search/suggestions?q={term}")
            self.assertEqual(response.status_code, 200, f"Failed to get suggestions for '{term}': {response.text}")
            
            results = response.json()
            suggestions = results["suggestions"]
            
            self.assertGreaterEqual(len(suggestions), expected_min_count, 
                                  f"Expected at least {expected_min_count} suggestions for '{term}', got {len(suggestions)}")
            print(f"Found {len(suggestions)} suggestions for '{term}': {suggestions}")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)

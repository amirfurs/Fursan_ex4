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

class TestArabicSectionAPI(unittest.TestCase):
    def setUp(self):
        # List to track created sections for cleanup
        self.created_sections = []

    def tearDown(self):
        # Clean up created sections
        for section_id in self.created_sections:
            try:
                requests.delete(f"{API_URL}/sections/{section_id}")
                print(f"Cleaned up section {section_id}")
            except Exception as e:
                print(f"Error cleaning up section {section_id}: {e}")

    def test_arabic_section_creation(self):
        """Test creating sections with Arabic names"""
        print("\n=== Testing Arabic Section Creation ===")
        
        # Test cases with different Arabic section names
        arabic_sections = [
            {
                "name": "العقيدة الإسلامية",
                "description": "قسم مخصص للعقيدة الإسلامية وأصولها"
            },
            {
                "name": "فقه العبادات",
                "description": "قسم يختص بفقه العبادات والمعاملات"
            },
            {
                "name": "السيرة النبوية",
                "description": "قسم يتناول سيرة النبي محمد صلى الله عليه وسلم"
            },
            {
                "name": "التفسير وعلوم القرآن",
                "description": "قسم مخصص لتفسير القرآن الكريم وعلومه"
            },
            {
                "name": "الحديث وعلومه",
                "description": "قسم يتناول الأحاديث النبوية وعلومها"
            }
        ]
        
        # Create each Arabic section and verify
        for i, section_data in enumerate(arabic_sections):
            print(f"Creating Arabic section {i+1}: {section_data['name']}...")
            
            # 1. Create the section
            response = requests.post(f"{API_URL}/sections", json=section_data)
            self.assertEqual(response.status_code, 200, f"Failed to create Arabic section: {response.text}")
            
            section = response.json()
            self.assertEqual(section["name"], section_data["name"], "Arabic section name not preserved correctly")
            self.assertEqual(section["description"], section_data["description"], "Arabic section description not preserved correctly")
            self.assertIn("id", section, "Section ID not returned")
            self.assertIn("created_at", section, "Created timestamp not returned")
            
            # Add to cleanup list
            self.created_sections.append(section["id"])
            section_id = section["id"]
            print(f"Successfully created Arabic section with ID: {section_id}")
            
            # 2. Verify section exists in the list of all sections
            response = requests.get(f"{API_URL}/sections")
            self.assertEqual(response.status_code, 200, f"Failed to get sections: {response.text}")
            
            sections = response.json()
            matching_sections = [s for s in sections if s["id"] == section_id]
            self.assertEqual(len(matching_sections), 1, f"Created section not found or duplicated in sections list")
            
            retrieved_section = matching_sections[0]
            self.assertEqual(retrieved_section["name"], section_data["name"], "Arabic section name not preserved in GET response")
            self.assertEqual(retrieved_section["description"], section_data["description"], "Arabic section description not preserved in GET response")
            print(f"Successfully verified Arabic section in sections list")
            
            # 3. Create an article in this section with Arabic content
            article_data = {
                "title": f"مقال تجريبي في {section_data['name']}",
                "content": f"هذا مقال تجريبي في قسم {section_data['name']} للتأكد من عمل النظام",
                "author": "كاتب تجريبي",
                "section_id": section_id
            }
            
            print(f"Creating Arabic article in section {section_id}...")
            response = requests.post(f"{API_URL}/articles", json=article_data)
            self.assertEqual(response.status_code, 200, f"Failed to create Arabic article: {response.text}")
            
            article = response.json()
            self.assertEqual(article["title"], article_data["title"], "Arabic article title not preserved correctly")
            self.assertEqual(article["content"], article_data["content"], "Arabic article content not preserved correctly")
            self.assertEqual(article["author"], article_data["author"], "Arabic article author not preserved correctly")
            article_id = article["id"]
            print(f"Successfully created Arabic article with ID: {article_id}")
            
            # 4. Get articles by section to verify
            print(f"Getting articles for section {section_id}...")
            response = requests.get(f"{API_URL}/articles/section/{section_id}")
            self.assertEqual(response.status_code, 200, f"Failed to get articles by section: {response.text}")
            
            section_articles = response.json()
            self.assertIsInstance(section_articles, list, "Expected list of articles")
            self.assertEqual(len(section_articles), 1, f"Expected 1 article in section, got {len(section_articles)}")
            self.assertEqual(section_articles[0]["id"], article_id, "Article ID mismatch")
            self.assertEqual(section_articles[0]["title"], article_data["title"], "Arabic article title not preserved in GET response")
            print(f"Successfully verified Arabic article in section")
            
            # 5. Delete the article
            print(f"Deleting article {article_id}...")
            response = requests.delete(f"{API_URL}/articles/{article_id}")
            self.assertEqual(response.status_code, 200, f"Failed to delete article: {response.text}")
            print(f"Successfully deleted article")
            
            # 6. Delete the section
            print(f"Deleting section {section_id}...")
            response = requests.delete(f"{API_URL}/sections/{section_id}")
            self.assertEqual(response.status_code, 200, f"Failed to delete section: {response.text}")
            print(f"Successfully deleted section")
            
            # Remove from cleanup list since we already deleted it
            self.created_sections.remove(section_id)
            
            # 7. Verify section was deleted
            response = requests.get(f"{API_URL}/sections")
            sections = response.json()
            self.assertFalse(any(s["id"] == section_id for s in sections), "Deleted section still found in sections list")
            print(f"Successfully verified section deletion")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
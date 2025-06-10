import requests
import unittest
import uuid

# Use the local backend URL
API_URL = "http://localhost:8001/api"

class TestArabicSectionAPI(unittest.TestCase):
    def setUp(self):
        # List to track created sections for cleanup
        self.created_sections = []
        self.created_articles = []

    def tearDown(self):
        # Clean up created articles
        for article_id in self.created_articles:
            try:
                requests.delete(f"{API_URL}/articles/{article_id}")
                print(f"Cleaned up article {article_id}")
            except Exception as e:
                print(f"Error cleaning up article {article_id}: {e}")
                
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
            self.created_articles.append(article_id)
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

    def test_section_deletion(self):
        """Test section deletion with cascade to articles"""
        print("\n=== Testing Section Deletion ===")
        
        # 1. Create a section
        section_data = {
            "name": "قسم للحذف",
            "description": "هذا القسم سيتم حذفه لاختبار عملية الحذف"
        }
        
        print("Creating section for deletion test...")
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
                "title": f"مقال للحذف {i+1}",
                "content": f"هذا المقال سيتم حذفه مع القسم لاختبار عملية الحذف المتتالية",
                "author": "كاتب تجريبي",
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
        
        # 5. Verify section was deleted
        response = requests.get(f"{API_URL}/sections")
        sections = response.json()
        self.assertFalse(any(s["id"] == section_id for s in sections), "Deleted section still found in sections list")
        print("Successfully verified section deletion")
        
        # 6. Verify articles were also deleted
        print("Verifying articles were cascade deleted...")
        for article_id in article_ids:
            response = requests.get(f"{API_URL}/articles/{article_id}")
            self.assertEqual(response.status_code, 404, f"Expected article {article_id} to be deleted with section, but it still exists")
            
            # Remove from cleanup list since they should be deleted
            if article_id in self.created_articles:
                self.created_articles.remove(article_id)
        
        print("Successfully verified all articles were cascade deleted with the section")

if __name__ == "__main__":
    # Run the tests
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [sections, setSections] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedSection, setSelectedSection] = useState("all");
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Form states
  const [newSection, setNewSection] = useState({ name: "", description: "" });
  const [newArticle, setNewArticle] = useState({
    title: "",
    content: "",
    author: "",
    section_id: "",
    image_data: "",
    image_name: ""
  });

  // Load data on component mount
  useEffect(() => {
    fetchSections();
    fetchArticles();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API}/sections`);
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API}/articles`);
      setArticles(response.data);
    } catch (error) {
      console.error("Error fetching articles:", error);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewArticle({
          ...newArticle,
          image_data: e.target.result,
          image_name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const createSection = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/sections`, newSection);
      setNewSection({ name: "", description: "" });
      setShowAddSection(false);
      fetchSections();
    } catch (error) {
      console.error("Error creating section:", error);
    }
  };

  const createArticle = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/articles`, newArticle);
      setNewArticle({
        title: "",
        content: "",
        author: "",
        section_id: "",
        image_data: "",
        image_name: ""
      });
      setShowAddArticle(false);
      fetchArticles();
    } catch (error) {
      console.error("Error creating article:", error);
    }
  };

  const deleteSection = async (sectionId) => {
    if (window.confirm("Are you sure? This will delete all articles in this section.")) {
      try {
        await axios.delete(`${API}/sections/${sectionId}`);
        fetchSections();
        fetchArticles();
      } catch (error) {
        console.error("Error deleting section:", error);
      }
    }
  };

  const deleteArticle = async (articleId) => {
    if (window.confirm("Are you sure you want to delete this article?")) {
      try {
        await axios.delete(`${API}/articles/${articleId}`);
        fetchArticles();
        setSelectedArticle(null);
      } catch (error) {
        console.error("Error deleting article:", error);
      }
    }
  };

  const filteredArticles = selectedSection === "all" 
    ? articles 
    : articles.filter(article => article.section_id === selectedSection);

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : "Unknown Section";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-black via-red-900 to-black py-20">
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-6xl font-bold mb-4 text-white">
            <span className="text-red-500">Article</span> Publishing
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Create, manage, and publish your content with style
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowAddSection(true)}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Add Section
            </button>
            <button
              onClick={() => setShowAddArticle(true)}
              className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Write Article
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-4 text-red-500">Sections</h2>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedSection("all")}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedSection === "all" 
                      ? "bg-red-600 text-white" 
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  All Articles ({articles.length})
                </button>
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedSection(section.id)}
                      className={`flex-1 text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedSection === section.id 
                          ? "bg-red-600 text-white" 
                          : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      }`}
                    >
                      {section.name} ({articles.filter(a => a.section_id === section.id).length})
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="ml-2 px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedArticle ? (
              /* Article Detail View */
              <div className="bg-gray-900 rounded-lg p-8">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="mb-4 text-red-500 hover:text-red-400"
                >
                  ← Back to Articles
                </button>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">{selectedArticle.title}</h1>
                    <div className="text-gray-400 text-sm">
                      By {selectedArticle.author} • {getSectionName(selectedArticle.section_id)} • 
                      {new Date(selectedArticle.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteArticle(selectedArticle.id)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                  >
                    Delete Article
                  </button>
                </div>
                
                {selectedArticle.image_data && (
                  <img
                    src={selectedArticle.image_data}
                    alt={selectedArticle.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}
                
                <div className="prose prose-invert max-w-none">
                  {selectedArticle.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 text-gray-300 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              /* Articles Grid */
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold">
                    {selectedSection === "all" ? "All Articles" : getSectionName(selectedSection)}
                  </h2>
                  <span className="text-gray-400">{filteredArticles.length} articles</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                      {article.image_data && (
                        <img
                          src={article.image_data}
                          alt={article.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-6">
                        <div className="text-red-500 text-sm mb-2">
                          {getSectionName(article.section_id)}
                        </div>
                        <h3 className="text-xl font-bold mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                          {article.content.slice(0, 150)}...
                        </p>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>By {article.author}</span>
                          <span>{new Date(article.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredArticles.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-6xl mb-4">📝</div>
                    <h3 className="text-xl font-semibold mb-2">No articles yet</h3>
                    <p className="text-gray-400 mb-4">Start by creating your first article!</p>
                    <button
                      onClick={() => setShowAddArticle(true)}
                      className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold"
                    >
                      Write Your First Article
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Add New Section</h2>
            <form onSubmit={createSection}>
              <input
                type="text"
                placeholder="Section Name"
                value={newSection.name}
                onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                className="w-full p-3 mb-4 bg-gray-800 rounded-lg text-white"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newSection.description}
                onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                className="w-full p-3 mb-4 bg-gray-800 rounded-lg text-white h-24 resize-none"
              />
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold"
                >
                  Create Section
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSection(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Article Modal */}
      {showAddArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-gray-900 rounded-lg p-8 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Write New Article</h2>
            <form onSubmit={createArticle}>
              <input
                type="text"
                placeholder="Article Title"
                value={newArticle.title}
                onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                className="w-full p-3 mb-4 bg-gray-800 rounded-lg text-white"
                required
              />
              <input
                type="text"
                placeholder="Author Name"
                value={newArticle.author}
                onChange={(e) => setNewArticle({...newArticle, author: e.target.value})}
                className="w-full p-3 mb-4 bg-gray-800 rounded-lg text-white"
                required
              />
              <select
                value={newArticle.section_id}
                onChange={(e) => setNewArticle({...newArticle, section_id: e.target.value})}
                className="w-full p-3 mb-4 bg-gray-800 rounded-lg text-white"
                required
              >
                <option value="">Select Section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Article Content"
                value={newArticle.content}
                onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                className="w-full p-3 mb-4 bg-gray-800 rounded-lg text-white h-48 resize-none"
                required
              />
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Article Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
                />
                {newArticle.image_data && (
                  <img
                    src={newArticle.image_data}
                    alt="Preview"
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold"
                >
                  Publish Article
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddArticle(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

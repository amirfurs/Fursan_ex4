import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Public Interface Components
const PublicLayout = ({ children }) => {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API}/sections`);
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Public Header */}
      <header className="bg-gradient-to-r from-black via-red-900 to-black border-b border-red-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-3xl font-bold">
              <span className="text-red-500">Red</span>
              <span className="text-white">Black</span>
              <span className="text-red-500">News</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="hover:text-red-400 transition-colors">Home</Link>
              {sections.map((section) => (
                <Link 
                  key={section.id} 
                  to={`/section/${section.id}`}
                  className="hover:text-red-400 transition-colors"
                >
                  {section.name}
                </Link>
              ))}
              <Link to="/admin" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition-colors">
                Admin Panel
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm">Home</Link>
            {sections.map((section) => (
              <Link 
                key={section.id} 
                to={`/section/${section.id}`}
                className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-sm"
              >
                {section.name}
              </Link>
            ))}
            <Link to="/admin" className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">
              Admin
            </Link>
          </div>
        </div>
      </div>

      {children}

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2025 RedBlackNews. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const HomePage = () => {
  const [articles, setArticles] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, sectionsRes] = await Promise.all([
        axios.get(`${API}/articles`),
        axios.get(`${API}/sections`)
      ]);
      setArticles(articlesRes.data);
      setSections(sectionsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : "Unknown Section";
  };

  const featuredArticles = articles.slice(0, 3);
  const recentArticles = articles.slice(3);

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">📰</div>
          <p className="text-gray-400">Loading articles...</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-900 via-black to-red-900 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Latest <span className="text-red-500">News</span> & Articles
            </h1>
            <p className="text-xl text-gray-300">Stay informed with our quality journalism</p>
          </div>

          {/* Featured Articles */}
          {featuredArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredArticles.map((article) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors group"
                >
                  {article.image_data && (
                    <img
                      src={article.image_data}
                      alt={article.title}
                      className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                    />
                  )}
                  <div className="p-6">
                    <div className="text-red-500 text-sm mb-2">{getSectionName(article.section_id)}</div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                      {article.content.slice(0, 120)}...
                    </p>
                    <div className="text-xs text-gray-500">
                      By {article.author} • {new Date(article.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Articles */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Recent Articles</h2>
        
        {recentArticles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">No articles published yet</h3>
            <p className="text-gray-400">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors group"
              >
                {article.image_data && (
                  <img
                    src={article.image_data}
                    alt={article.title}
                    className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity"
                  />
                )}
                <div className="p-4">
                  <div className="text-red-500 text-sm mb-2">{getSectionName(article.section_id)}</div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-red-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {article.content.slice(0, 100)}...
                  </p>
                  <div className="text-xs text-gray-500">
                    By {article.author} • {new Date(article.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

const ArticlePage = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
    fetchSections();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const response = await axios.get(`${API}/articles/${id}`);
      setArticle(response.data);
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API}/sections`);
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : "Unknown Section";
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">📖</div>
          <p className="text-gray-400">Loading article...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
          <Link to="/" className="text-red-500 hover:text-red-400">← Back to Home</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="text-red-500 hover:text-red-400 mb-6 inline-block">
          ← Back to Articles
        </Link>
        
        <article className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="text-red-500 text-sm mb-2">{getSectionName(article.section_id)}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{article.title}</h1>
            <div className="flex items-center text-gray-400 text-sm">
              <span>By {article.author}</span>
              <span className="mx-2">•</span>
              <span>{new Date(article.created_at).toLocaleDateString()}</span>
              <span className="mx-2">•</span>
              <span>{new Date(article.updated_at).toLocaleDateString()} (Updated)</span>
            </div>
          </header>

          {article.image_data && (
            <div className="mb-8">
              <img
                src={article.image_data}
                alt={article.title}
                className="w-full h-64 md:h-96 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="prose prose-invert prose-lg max-w-none">
            {article.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-6 text-gray-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </article>
      </div>
    </PublicLayout>
  );
};

const SectionPage = () => {
  const { id } = useParams();
  const [articles, setArticles] = useState([]);
  const [sections, setSections] = useState([]);
  const [currentSection, setCurrentSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [articlesRes, sectionsRes] = await Promise.all([
        axios.get(`${API}/articles/section/${id}`),
        axios.get(`${API}/sections`)
      ]);
      setArticles(articlesRes.data);
      setSections(sectionsRes.data);
      setCurrentSection(sectionsRes.data.find(s => s.id === id));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <p className="text-gray-400">Loading section...</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="text-red-500 hover:text-red-400 mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">{currentSection?.name || "Section"}</h1>
          {currentSection?.description && (
            <p className="text-gray-400">{currentSection.description}</p>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-xl font-semibold mb-2">No articles in this section yet</h3>
            <p className="text-gray-400">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors group"
              >
                {article.image_data && (
                  <img
                    src={article.image_data}
                    alt={article.title}
                    className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-red-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {article.content.slice(0, 100)}...
                  </p>
                  <div className="text-xs text-gray-500">
                    By {article.author} • {new Date(article.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

// Admin Panel Components
const AdminPanel = () => {
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
      {/* Admin Header */}
      <header className="bg-red-900 border-b border-red-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <Link to="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">
              View Public Site
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Controls */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAddSection(true)}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Add Section
            </button>
            <button
              onClick={() => setShowAddArticle(true)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              Write Article
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Admin Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-4 text-red-500">Content Management</h2>
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
                      className="ml-2 px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs"
                      title="Delete Section"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Main Content */}
          <div className="lg:col-span-3">
            {selectedArticle ? (
              /* Article Edit View */
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
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
                      Edit
                    </button>
                    <button
                      onClick={() => deleteArticle(selectedArticle.id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
                    >
                      Delete
                    </button>
                  </div>
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
              /* Articles Management Grid */
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold">
                    Manage {selectedSection === "all" ? "All Articles" : getSectionName(selectedSection)}
                  </h2>
                  <span className="text-gray-400">{filteredArticles.length} articles</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="bg-gray-900 rounded-lg overflow-hidden"
                    >
                      {article.image_data && (
                        <img
                          src={article.image_data}
                          alt={article.title}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="text-red-500 text-sm mb-2">
                          {getSectionName(article.section_id)}
                        </div>
                        <h3 className="text-lg font-bold mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                          {article.content.slice(0, 100)}...
                        </p>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            By {article.author}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedArticle(article)}
                              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
                            >
                              View
                            </button>
                            <button
                              onClick={() => deleteArticle(article.id)}
                              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
                            >
                              Delete
                            </button>
                          </div>
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

// Main App Component with Routing
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/section/:id" element={<SectionPage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
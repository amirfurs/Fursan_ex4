import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin passcode (in real app, this would be in environment variables)
const ADMIN_PASSCODE = "admin2025";

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Public Interface Components
const PublicLayout = ({ children }) => {
  const [sections, setSections] = useState([]);
  const { user, logout } = useAuth();

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
      <header className="bg-gradient-to-r from-black via-red-900 to-black border-b border-red-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-3">
              {/* Logo placeholder - will be replaced with actual logo */}
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <div className="text-4xl font-bold tracking-tight">
                <span className="text-red-500">Red</span>
                <span className="text-white">Black</span>
                <span className="text-red-500">News</span>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-8">
                <Link to="/" className="text-lg hover:text-red-400 transition-colors font-medium">
                  Home
                </Link>
                {sections.length > 0 && (
                  <div className="relative group">
                    <span className="text-lg hover:text-red-400 transition-colors font-medium cursor-pointer flex items-center">
                      Sections 
                      <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <div className="absolute top-full left-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-56 z-10 mt-1">
                      {sections.map((section) => (
                        <Link 
                          key={section.id} 
                          to={`/section/${section.id}`}
                          className="block px-4 py-3 hover:bg-gray-800 hover:text-red-400 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium">{section.name}</div>
                          {section.description && (
                            <div className="text-xs text-gray-500 mt-1">{section.description.slice(0, 50)}...</div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </nav>
              
              {/* User Authentication */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {user.profile_picture && (
                        <img 
                          src={user.profile_picture} 
                          alt={user.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="text-sm font-medium">Hi, {user.full_name}!</span>
                    </div>
                    <Link to="/profile" className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors">
                      Profile
                    </Link>
                    <button 
                      onClick={logout}
                      className="text-sm bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link to="/login" className="text-sm hover:text-red-400 transition-colors">
                      Login
                    </Link>
                    <Link to="/register" className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Home
            </Link>
            {sections.length > 0 && (
              <details className="relative">
                <summary className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer list-none flex items-center">
                  Sections
                  <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="absolute top-full left-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-56 z-10 mt-1">
                  {sections.map((section) => (
                    <Link 
                      key={section.id} 
                      to={`/section/${section.id}`}
                      className="block px-4 py-3 hover:bg-gray-800 hover:text-red-400 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium">{section.name}</div>
                      {section.description && (
                        <div className="text-xs text-gray-500 mt-1">{section.description.slice(0, 40)}...</div>
                      )}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>

      {children}

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <h3 className="text-2xl font-bold">
                  <span className="text-red-500">Red</span>
                  <span className="text-white">Black</span>
                  <span className="text-red-500">News</span>
                </h3>
              </div>
              <p className="text-gray-400">Quality journalism and editorial content delivered with passion and precision.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-red-500">Categories</h4>
              <div className="space-y-2">
                {sections.slice(0, 6).map((section) => (
                  <Link 
                    key={section.id} 
                    to={`/section/${section.id}`}
                    className="block text-gray-400 hover:text-red-400 transition-colors"
                  >
                    {section.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-red-500">About</h4>
              <p className="text-gray-400 text-sm">
                RedBlackNews is your trusted source for quality articles and editorial content across various topics and interests.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
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
  const [featuredArticles, setFeaturedArticles] = useState([]);
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
      const allArticles = articlesRes.data;
      setArticles(allArticles);
      setSections(sectionsRes.data);
      
      // Featured articles are the 3 most recent
      setFeaturedArticles(allArticles.slice(0, 3));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : "General";
  };

  const getArticlesBySection = (sectionId) => {
    return articles.filter(article => article.section_id === sectionId);
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">📰</div>
            <p className="text-gray-400">Loading latest articles...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="hero-gradient py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Latest <span className="text-red-500">News</span><br />
              & <span className="text-red-500">Articles</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              Stay informed with our quality journalism and editorial content
            </p>
          </div>

          {/* Featured Articles */}
          {featuredArticles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {featuredArticles.map((article, index) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className={`bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 group shadow-2xl ${
                    index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''
                  }`}
                >
                  {article.image_data && (
                    <img
                      src={article.image_data}
                      alt={article.title}
                      className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                        index === 0 ? 'h-64 lg:h-80' : 'h-48'
                      }`}
                    />
                  )}
                  <div className={`p-6 ${index === 0 ? 'lg:p-8' : ''}`}>
                    <div className="text-red-500 text-sm font-semibold mb-2 uppercase tracking-wide">
                      {getSectionName(article.section_id)}
                    </div>
                    <h3 className={`font-bold mb-3 group-hover:text-red-400 transition-colors line-clamp-2 ${
                      index === 0 ? 'text-2xl lg:text-3xl' : 'text-xl'
                    }`}>
                      {article.title}
                    </h3>
                    <p className={`text-gray-400 line-clamp-3 mb-4 ${
                      index === 0 ? 'text-base' : 'text-sm'
                    }`}>
                      {article.content.slice(0, index === 0 ? 200 : 120)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">{article.author}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="text-xs">{article.likes_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sections Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-12 text-center">Explore by <span className="text-red-500">Category</span></h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {sections.map((section) => {
            const sectionArticles = getArticlesBySection(section.id);
            if (sectionArticles.length === 0) return null;
            
            return (
              <div key={section.id} className="bg-gray-900 rounded-xl p-8 hover:bg-gray-800 transition-colors">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-red-500">{section.name}</h3>
                  <Link 
                    to={`/section/${section.id}`}
                    className="text-gray-400 hover:text-red-400 text-sm font-medium"
                  >
                    View All ({sectionArticles.length})
                  </Link>
                </div>
                
                {section.description && (
                  <p className="text-gray-400 mb-6">{section.description}</p>
                )}
                
                <div className="space-y-4">
                  {sectionArticles.slice(0, 3).map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.id}`}
                      className="flex items-start space-x-4 group"
                    >
                      {article.image_data && (
                        <img
                          src={article.image_data}
                          alt={article.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold group-hover:text-red-400 transition-colors line-clamp-2">
                          {article.title}
                        </h4>
                        <div className="text-xs text-gray-500 mt-1">
                          {article.author} • {new Date(article.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📝</div>
            <h3 className="text-3xl font-bold mb-4">No articles published yet</h3>
            <p className="text-gray-400 text-lg">Check back soon for new content!</p>
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
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [articleRes, sectionsRes, allArticlesRes] = await Promise.all([
        axios.get(`${API}/articles/${id}`),
        axios.get(`${API}/sections`),
        axios.get(`${API}/articles`)
      ]);
      
      const currentArticle = articleRes.data;
      setArticle(currentArticle);
      setSections(sectionsRes.data);
      
      // Get related articles from same section, excluding current article
      const related = allArticlesRes.data
        .filter(a => a.section_id === currentArticle.section_id && a.id !== currentArticle.id)
        .slice(0, 3);
      setRelatedArticles(related);
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : "General";
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-gray-400">Loading article...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">❌</div>
          <h2 className="text-3xl font-bold mb-4">Article Not Found</h2>
          <p className="text-gray-400 mb-6">The article you're looking for doesn't exist.</p>
          <Link to="/" className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
            Back to Home
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <nav className="mb-8">
            <Link to="/" className="text-red-500 hover:text-red-400 font-medium">
              ← Back to Articles
            </Link>
          </nav>
          
          <article>
            <header className="mb-10">
              <div className="text-red-500 text-sm font-semibold mb-3 uppercase tracking-wide">
                {getSectionName(article.section_id)}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">{article.title}</h1>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-400 border-l-4 border-red-500 pl-4">
                  <div>
                    <div className="font-semibold text-white text-lg">By {article.author}</div>
                    <div className="text-sm">
                      Published {new Date(article.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {article.updated_at !== article.created_at && (
                        <span> • Updated {new Date(article.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <LikeButton article={article} />
              </div>
            </header>

            {article.image_data && (
              <div className="mb-10">
                <img
                  src={article.image_data}
                  alt={article.title}
                  className="w-full h-64 md:h-96 object-cover rounded-xl shadow-2xl"
                />
              </div>
            )}

            <div className="prose prose-invert prose-xl max-w-none">
              {article.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-8 text-gray-300 leading-relaxed text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-16 pt-8 border-t border-gray-800">
              <h3 className="text-2xl font-bold mb-6">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    to={`/article/${relatedArticle.id}`}
                    className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors group"
                  >
                    {relatedArticle.image_data && (
                      <img
                        src={relatedArticle.image_data}
                        alt={relatedArticle.title}
                        className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity"
                      />
                    )}
                    <div className="p-4">
                      <h4 className="font-bold mb-2 group-hover:text-red-400 transition-colors line-clamp-2">
                        {relatedArticle.title}
                      </h4>
                      <div className="text-xs text-gray-500">
                        {relatedArticle.author} • {new Date(relatedArticle.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

// Like Button Component
const LikeButton = ({ article }) => {
  const { user, isAuthenticated } = useAuth();
  const [isLiked, setIsLiked] = useState(article.is_liked || false);
  const [likesCount, setLikesCount] = useState(article.likes_count || 0);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert("Please login to like articles!");
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        await axios.delete(`${API}/articles/${article.id}/like`);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await axios.post(`${API}/articles/${article.id}/like`);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          isLiked 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span>{likesCount}</span>
      </button>
      {!isAuthenticated && (
        <span className="text-xs text-gray-500">Login to like</span>
      )}
    </div>
  );
};

// Authentication Components
const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    profile_picture: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({
          ...formData,
          profile_picture: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        profile_picture: formData.profile_picture
      };

      const response = await axios.post(`${API}/register`, registerData);
      login(response.data.access_token, response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-gray-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center text-red-500">Create Account</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Profile Picture (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
              />
              {formData.profile_picture && (
                <img
                  src={formData.profile_picture}
                  alt="Profile preview"
                  className="mt-2 w-20 h-20 rounded-full object-cover"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-gray-400">Already have an account? </span>
            <Link to="/login" className="text-red-500 hover:text-red-400">Login here</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/login`, formData);
      login(response.data.access_token, response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-gray-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center text-red-500">Login</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-gray-400">Don't have an account? </span>
            <Link to="/register" className="text-red-500 hover:text-red-400">Register here</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

const ProfilePage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-gray-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center text-red-500">My Profile</h1>
          
          <div className="text-center mb-8">
            {user.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.full_name}
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">👤</span>
              </div>
            )}
            <h2 className="text-2xl font-bold">{user.full_name}</h2>
            <p className="text-gray-400">@{user.username}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <p className="text-white">{user.email}</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Member Since</label>
              <p className="text-white">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/" className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
              Back to Articles
            </Link>
          </div>
        </div>
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
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-gray-400">Loading section...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-8">
          <Link to="/" className="text-red-500 hover:text-red-400 font-medium">
            ← Back to Home
          </Link>
        </nav>

        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4">{currentSection?.name || "Section"}</h1>
          {currentSection?.description && (
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">{currentSection.description}</p>
          )}
          <div className="text-red-500 font-semibold mt-4">{articles.length} Articles</div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📰</div>
            <h3 className="text-3xl font-bold mb-4">No articles in this section yet</h3>
            <p className="text-gray-400 text-lg">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 group shadow-lg"
              >
                {article.image_data && (
                  <img
                    src={article.image_data}
                    alt={article.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-red-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 line-clamp-3 mb-4">
                    {article.content.slice(0, 120)}...
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium">{article.author}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(article.created_at).toLocaleDateString()}</span>
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

// Admin Authentication Component
const AdminLogin = ({ onLogin }) => {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      onLogin();
      setError("");
    } else {
      setError("Invalid passcode. Access denied.");
      setPasscode("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-red-500">Admin Access</h1>
          <p className="text-gray-400">Enter passcode to continue</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter Admin Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            required
          />
          
          {error && (
            <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
          )}
          
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-lg font-semibold transition-colors"
          >
            Access Admin Panel
          </button>
        </form>
        
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-red-400 text-sm">
            ← Back to Website
          </Link>
        </div>
      </div>
    </div>
  );
};

// Admin Panel Components
const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    if (isAuthenticated) {
      fetchSections();
      fetchArticles();
    }
  }, [isAuthenticated]);

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
      alert("Error creating section. Please try again.");
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
      alert("Error creating article. Please try again.");
    }
  };

  const deleteSection = async (sectionId) => {
    if (window.confirm("Are you sure? This will delete all articles in this section.")) {
      try {
        await axios.delete(`${API}/sections/${sectionId}`);
        fetchSections();
        fetchArticles();
        if (selectedSection === sectionId) {
          setSelectedSection("all");
        }
      } catch (error) {
        console.error("Error deleting section:", error);
        alert("Error deleting section. Please try again.");
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
        alert("Error deleting article. Please try again.");
      }
    }
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />;
  }

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
      <header className="bg-red-900 border-b border-red-700 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Content Management System</h1>
            <div className="flex items-center space-x-4">
              <span className="text-red-300 text-sm">Admin Panel</span>
              <Link to="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">
                View Public Site
              </Link>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Stats */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{articles.length}</div>
              <div className="text-gray-400 text-sm">Total Articles</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{sections.length}</div>
              <div className="text-gray-400 text-sm">Sections</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500">
                {articles.filter(a => a.image_data).length}
              </div>
              <div className="text-gray-400 text-sm">Articles with Images</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-gray-400 text-sm">Today</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddSection(true)}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
            >
              <span className="mr-2">+</span> Add Section
            </button>
            <button
              onClick={() => setShowAddArticle(true)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
            >
              <span className="mr-2">✏️</span> Write Article
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Admin Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-6 text-red-500">Filter Content</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedSection("all")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors font-medium ${
                    selectedSection === "all" 
                      ? "bg-red-600 text-white" 
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                  }`}
                >
                  All Articles ({articles.length})
                </button>
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSection(section.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-lg transition-colors font-medium ${
                        selectedSection === section.id 
                          ? "bg-red-600 text-white" 
                          : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                      }`}
                    >
                      {section.name} ({articles.filter(a => a.section_id === section.id).length})
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="px-3 py-3 bg-red-800 hover:bg-red-700 rounded-lg text-sm transition-colors"
                      title="Delete Section"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Main Content */}
          <div className="lg:col-span-3">
            {selectedArticle ? (
              /* Article Detail View */
              <div className="bg-gray-900 rounded-lg p-8">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="mb-6 text-red-500 hover:text-red-400 flex items-center"
                >
                  ← Back to Articles
                </button>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-4xl font-bold mb-3">{selectedArticle.title}</h1>
                    <div className="text-gray-400">
                      <div>By {selectedArticle.author}</div>
                      <div>Section: {getSectionName(selectedArticle.section_id)}</div>
                      <div>Created: {new Date(selectedArticle.created_at).toLocaleDateString()}</div>
                      {selectedArticle.updated_at !== selectedArticle.created_at && (
                        <div>Updated: {new Date(selectedArticle.updated_at).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => deleteArticle(selectedArticle.id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Delete Article
                    </button>
                  </div>
                </div>
                
                {selectedArticle.image_data && (
                  <img
                    src={selectedArticle.image_data}
                    alt={selectedArticle.title}
                    className="w-full h-64 object-cover rounded-lg mb-8"
                  />
                )}
                
                <div className="prose prose-invert max-w-none">
                  {selectedArticle.content.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-6 text-gray-300 leading-relaxed text-lg">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              /* Articles Management Grid */
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold">
                    {selectedSection === "all" ? "All Articles" : `${getSectionName(selectedSection)} Articles`}
                  </h2>
                  <span className="text-gray-400 bg-gray-800 px-3 py-1 rounded-full text-sm">
                    {filteredArticles.length} articles
                  </span>
                </div>

                {filteredArticles.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">📝</div>
                    <h3 className="text-2xl font-bold mb-4">No articles yet</h3>
                    <p className="text-gray-400 mb-6">Start by creating your first article!</p>
                    <button
                      onClick={() => setShowAddArticle(true)}
                      className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
                    >
                      Write Your First Article
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        className="bg-gray-900 rounded-lg overflow-hidden shadow-lg"
                      >
                        {article.image_data && (
                          <img
                            src={article.image_data}
                            alt={article.title}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <div className="p-6">
                          <div className="text-red-500 text-sm mb-2 font-semibold">
                            {getSectionName(article.section_id)}
                          </div>
                          <h3 className="text-xl font-bold mb-3 line-clamp-2">{article.title}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                            {article.content.slice(0, 100)}...
                          </p>
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                              <span>By {article.author}</span>
                              <span className="mx-2">•</span>
                              <span>{new Date(article.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span className="text-xs">{article.likes_count || 0}</span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedArticle(article)}
                                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => deleteArticle(article.id)}
                                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
            <h2 className="text-2xl font-bold mb-6 text-red-500">Create New Section</h2>
            <form onSubmit={createSection}>
              <input
                type="text"
                placeholder="Section Name"
                value={newSection.name}
                onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newSection.description}
                onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                className="w-full p-4 mb-6 bg-gray-800 rounded-lg text-white h-24 resize-none border border-gray-700 focus:border-red-500"
              />
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition-colors"
                >
                  Create Section
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSection(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-semibold transition-colors"
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
            <h2 className="text-2xl font-bold mb-6 text-red-500">Create New Article</h2>
            <form onSubmit={createArticle}>
              <input
                type="text"
                placeholder="Article Title"
                value={newArticle.title}
                onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
              <input
                type="text"
                placeholder="Author Name"
                value={newArticle.author}
                onChange={(e) => setNewArticle({...newArticle, author: e.target.value})}
                className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                required
              />
              <select
                value={newArticle.section_id}
                onChange={(e) => setNewArticle({...newArticle, section_id: e.target.value})}
                className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
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
                placeholder="Article Content (Use line breaks to separate paragraphs)"
                value={newArticle.content}
                onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white h-48 resize-none border border-gray-700 focus:border-red-500"
                required
              />
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Article Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
                />
                {newArticle.image_data && (
                  <img
                    src={newArticle.image_data}
                    alt="Preview"
                    className="mt-4 w-full h-40 object-cover rounded-lg"
                  />
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-lg font-semibold transition-colors"
                >
                  Publish Article
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddArticle(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-lg font-semibold transition-colors"
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/section/:id" element={<SectionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
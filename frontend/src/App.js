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
  const [siteLogo, setSiteLogo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSections();
    fetchSiteLogo();
  }, []);

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API}/sections`);
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchSiteLogo = async () => {
    try {
      const response = await axios.get(`${API}/settings/logo`);
      setSiteLogo(response.data);
    } catch (error) {
      console.error("Error fetching logo:", error);
    }
  };

  const fetchSearchSuggestions = async (query) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(query)}`);
      setSearchSuggestions(response.data.suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    fetchSearchSuggestions(value);
    setShowSuggestions(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    setShowSuggestions(false);
  };

  return (
    <div className="min-h-screen bg-black text-white arabic-content">
      {/* Public Header */}
      <header className="bg-gradient-to-r from-black via-red-900 to-black border-b border-red-800 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-4 space-x-reverse">
              {/* Dynamic Logo */}
              <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center overflow-hidden border border-gray-600">
                {siteLogo?.logo_data ? (
                  <img
                    src={siteLogo.logo_data}
                    alt="شعار الموقع"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-gray-300 text-xs font-arabic">فرسان</div>
                    <div className="text-gray-300 text-xs">العقيدة</div>
                  </div>
                )}
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight arabic-title">
                <span className="text-red-500">فرسان</span>
                <span className="text-white"> </span>
                <span className="text-red-500">العقيدة</span>
              </div>
            </Link>
            <div className="flex items-center space-x-6 space-x-reverse">
              {/* Search Bar */}
              <div className="relative hidden md:block">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="ابحث في المقالات..."
                    className="w-48 lg:w-64 pl-4 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 arabic-content"
                  />
                  <button
                    type="submit"
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
                
                {/* Search Suggestions */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl mt-1 z-50 max-h-64 overflow-y-auto">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => selectSuggestion(suggestion)}
                        className="block w-full text-left px-4 py-3 hover:bg-gray-800 hover:text-red-400 transition-colors border-b border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="arabic-content">{suggestion}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <nav className="hidden md:flex space-x-8 space-x-reverse">
                <Link to="/" className="text-lg hover:text-red-400 transition-colors font-medium">
                  الرئيسية
                </Link>
                {sections.length > 0 && (
                  <div className="relative group">
                    <span className="text-lg hover:text-red-400 transition-colors font-medium cursor-pointer flex items-center">
                      الأقسام
                      <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <div className="absolute top-full right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-56 z-10 mt-1">
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
                <Link to="/tags" className="text-lg hover:text-red-400 transition-colors font-medium">
                  الوسوم
                </Link>
              </nav>
              
              {/* User Authentication */}
              <div className="flex items-center space-x-4 space-x-reverse">
                {user ? (
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {user.profile_picture && (
                        <img 
                          src={user.profile_picture} 
                          alt={user.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="text-sm font-medium">مرحباً، {user.full_name}!</span>
                    </div>
                    <Link to="/profile" className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors">
                      الملف الشخصي
                    </Link>
                    <button 
                      onClick={logout}
                      className="text-sm bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition-colors"
                    >
                      تسجيل الخروج
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Link to="/login" className="text-sm hover:text-red-400 transition-colors">
                      تسجيل الدخول
                    </Link>
                    <Link to="/register" className="text-sm bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors">
                      إنشاء حساب
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
          {/* Mobile Search */}
          <div className="mb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder="ابحث في المقالات..."
                className="w-full pl-4 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 arabic-content"
              />
              <button
                type="submit"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              الرئيسية
            </Link>
            {sections.length > 0 && (
              <details className="relative">
                <summary className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer list-none flex items-center">
                  الأقسام
                  <svg className="mr-1 w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="absolute top-full right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-56 z-10 mt-1">
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
            <Link to="/tags" className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              الوسوم
            </Link>
          </div>
        </div>
      </div>

      {children}

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 space-x-reverse mb-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center overflow-hidden border border-gray-600">
                  {siteLogo?.logo_data ? (
                    <img
                      src={siteLogo.logo_data}
                      alt="شعار الموقع"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-gray-300 text-xs">فرسان</div>
                      <div className="text-gray-300 text-xs">العقيدة</div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold arabic-title">
                  <span className="text-red-500">فرسان</span>
                  <span className="text-white"> </span>
                  <span className="text-red-500">العقيدة</span>
                </h3>
              </div>
              <p className="text-gray-400">منصة إسلامية لنشر المقالات العقدية والردود على المخالفين ومناقشة القضايا المعاصرة</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-red-500">الأقسام</h4>
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
              <h4 className="text-lg font-semibold mb-4 text-red-500">عن الموقع</h4>
              <p className="text-gray-400 text-sm">
                فرسان العقيدة منصة إسلامية متخصصة في نشر المقالات العقدية والفقهية والردود العلمية على الشبهات والمخالفات، 
                مع التركيز على القضايا المعاصرة من منظور إسلامي أصيل.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; ٢٠٢٥ فرسان العقيدة. جميع الحقوق محفوظة.</p>
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
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [articlesRes, sectionsRes, tagsRes] = await Promise.all([
        axios.get(`${API}/articles`),
        axios.get(`${API}/sections`),
        axios.get(`${API}/tags`)
      ]);
      const allArticles = articlesRes.data;
      setArticles(allArticles);
      setSections(sectionsRes.data);
      setPopularTags(tagsRes.data.tags.slice(0, 10)); // Top 10 tags
      
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
    return section ? section.name : "عام";
  };

  const getArticlesBySection = (sectionId) => {
    return articles.filter(article => article.section_id === sectionId);
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-gray-400">جارٍ تحميل أحدث المقالات...</p>
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
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight arabic-title">
              أحدث <span className="text-red-500">المقالات</span><br />
              <span className="text-red-500">الإسلامية</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
              منصة علمية لنشر المقالات العقدية والردود على الشبهات ومناقشة القضايا المعاصرة
            </p>
          </div>

          {/* Featured Articles */}
          {featuredArticles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {featuredArticles.map((article, index) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className={`bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 group shadow-lg article-card ${
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
                    <div className="flex items-center text-sm text-red-500 mb-3">
                      <span className="font-medium">{getSectionName(article.section_id)}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <h3 className={`font-bold mb-3 group-hover:text-red-400 transition-colors arabic-title ${
                      index === 0 ? 'text-2xl lg:text-3xl mb-4' : 'text-xl'
                    }`}>
                      {article.title}
                    </h3>
                    <p className={`text-gray-400 mb-4 ${
                      index === 0 ? 'text-lg lg:text-xl mb-6' : 'line-clamp-3'
                    }`}>
                      {index === 0 
                        ? article.content.slice(0, 200) + '...'
                        : article.content.slice(0, 100) + '...'
                      }
                    </p>
                    {/* Article Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {article.tags.slice(0, 3).map((tag, tagIndex) => (
                          <Link
                            key={tagIndex}
                            to={`/tag/${encodeURIComponent(tag)}`}
                            className="bg-red-600/20 text-red-400 px-2 py-1 rounded-full text-xs hover:bg-red-600/30 transition-colors"
                          >
                            #{tag}
                          </Link>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-gray-500 text-xs px-2 py-1">
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="font-medium">{article.author}</span>
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                        </svg>
                        <span>{article.likes_count}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section Categories */}
      {sections.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12 arabic-title">
            تصفح حسب <span className="text-red-500">الأقسام</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sections.map((section) => {
              const sectionArticles = getArticlesBySection(section.id);
              return (
                <Link
                  key={section.id}
                  to={`/section/${section.id}`}
                  className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-all duration-300 group border border-gray-800 hover:border-red-500"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold group-hover:text-red-400 transition-colors">
                      {section.name}
                    </h3>
                    <span className="bg-red-600 text-white text-sm px-3 py-1 rounded-full">
                      {sectionArticles.length}
                    </span>
                  </div>
                  {section.description && (
                    <p className="text-gray-400 mb-4 line-clamp-3">
                      {section.description}
                    </p>
                  )}
                  <div className="flex items-center text-red-400 font-medium">
                    <span>تصفح المقالات</span>
                    <svg className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Articles */}
      {articles.length > 3 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12 arabic-title">
            أحدث <span className="text-red-500">المقالات</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.slice(3, 12).map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 group shadow-lg article-card"
              >
                {article.image_data && (
                  <img
                    src={article.image_data}
                    alt={article.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center text-sm text-red-500 mb-3">
                    <span className="font-medium">{getSectionName(article.section_id)}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-red-400 transition-colors line-clamp-2 arabic-title">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 line-clamp-3 mb-4">
                    {article.content.slice(0, 120)}...
                  </p>
                  {/* Article Tags */}
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {article.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Link
                          key={tagIndex}
                          to={`/tag/${encodeURIComponent(tag)}`}
                          className="bg-red-600/20 text-red-400 px-2 py-1 rounded-full text-xs hover:bg-red-600/30 transition-colors"
                        >
                          #{tag}
                        </Link>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-gray-500 text-xs px-2 py-1">
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="font-medium">{article.author}</span>
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      <span>{article.likes_count}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Popular Tags Section */}
      {popularTags.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold text-center mb-12 arabic-title">
            الوسوم <span className="text-red-500">الشائعة</span>
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-xl p-8">
              <div className="flex flex-wrap gap-4 justify-center">
                {popularTags.map((tag, index) => {
                  // Calculate relative size based on count
                  const maxCount = Math.max(...popularTags.map(t => t.count));
                  const relativeSize = (tag.count / maxCount) * 100;
                  let sizeClass = 'text-sm px-3 py-2';
                  let bgIntensity = 'from-red-600/20 to-red-700/20 hover:from-red-600/40 hover:to-red-700/40';
                  
                  if (relativeSize > 80) {
                    sizeClass = 'text-xl px-6 py-3';
                    bgIntensity = 'from-red-600/40 to-red-700/40 hover:from-red-600/60 hover:to-red-700/60';
                  } else if (relativeSize > 60) {
                    sizeClass = 'text-lg px-5 py-3';
                    bgIntensity = 'from-red-600/35 to-red-700/35 hover:from-red-600/55 hover:to-red-700/55';
                  } else if (relativeSize > 40) {
                    sizeClass = 'text-base px-4 py-2';
                    bgIntensity = 'from-red-600/30 to-red-700/30 hover:from-red-600/50 hover:to-red-700/50';
                  } else if (relativeSize > 20) {
                    sizeClass = 'text-sm px-3 py-2';
                    bgIntensity = 'from-red-600/25 to-red-700/25 hover:from-red-600/45 hover:to-red-700/45';
                  }

                  return (
                    <Link
                      key={tag.name}
                      to={`/tag/${encodeURIComponent(tag.name)}`}
                      className={`${sizeClass} bg-gradient-to-r ${bgIntensity} text-red-400 hover:text-red-300 rounded-full transition-all duration-300 hover:scale-110 border border-red-600/30 hover:border-red-500/50 font-medium`}
                    >
                      #{tag.name}
                      <span className="text-xs opacity-75 mr-1">({tag.count})</span>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-8">
                <Link 
                  to="/tags" 
                  className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  عرض جميع الوسوم
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {articles.length === 0 && (
        <div className="container mx-auto px-4 py-32 text-center">
          <div className="text-8xl mb-8">📚</div>
          <h2 className="text-4xl font-bold mb-4 arabic-title">لا توجد مقالات بعد</h2>
          <p className="text-xl text-gray-400 mb-8">تابعونا قريباً لنشر أولى المقالات والدراسات الإسلامية</p>
        </div>
      )}
    </PublicLayout>
  );
};

const ArticlePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState(null);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const response = await axios.get(`${API}/articles/${id}`);
      setArticle(response.data);
      
      // Get section info
      const sectionsResponse = await axios.get(`${API}/sections`);
      const sectionInfo = sectionsResponse.data.find(s => s.id === response.data.section_id);
      setSection(sectionInfo);
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-gray-400">جارٍ تحميل المقال...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">🔍</div>
          <h2 className="text-4xl font-bold mb-4">المقال غير موجود</h2>
          <p className="text-gray-400 mb-8">المقال الذي تبحث عنه غير متوفر أو تم حذفه</p>
          <Link to="/" className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
            العودة للرئيسية
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <div className="flex items-center space-x-2 space-x-reverse text-gray-400">
            <Link to="/" className="hover:text-red-400 transition-colors">الرئيسية</Link>
            <span>«</span>
            {section && (
              <>
                <Link to={`/section/${section.id}`} className="hover:text-red-400 transition-colors">
                  {section.name}
                </Link>
                <span>«</span>
              </>
            )}
            <span className="text-white">{article.title}</span>
          </div>
        </nav>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto">
          {/* Article Header */}
          <header className="mb-8">
            <div className="flex items-center text-sm text-red-500 mb-4">
              {section && (
                <>
                  <Link to={`/section/${section.id}`} className="font-medium hover:text-red-400 transition-colors">
                    {section.name}
                  </Link>
                  <span className="mx-2">•</span>
                </>
              )}
              <span>{new Date(article.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight arabic-title">
              {article.title}
            </h1>
            
            <div className="flex items-center justify-between mb-6">
              <div className="text-gray-400">
                <span className="font-medium">الكاتب: {article.author}</span>
              </div>
              <LikeButton article={article} />
            </div>
          </header>

          {/* Article Image */}
          {article.image_data && (
            <div className="mb-8">
              <img
                src={article.image_data}
                alt={article.title}
                className="w-full max-h-96 object-cover rounded-xl shadow-lg"
              />
            </div>
          )}

          {/* Article Content */}
          <div className="prose prose-lg prose-invert max-w-none mb-12 arabic-content">
            <div 
              className="text-lg leading-relaxed whitespace-pre-wrap"
              style={{ textAlign: 'justify', lineHeight: '1.8' }}
            >
              {article.content}
            </div>
          </div>

          {/* Article Meta */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                <span>تاريخ النشر: {new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
                {article.updated_at !== article.created_at && (
                  <span className="mr-4">آخر تحديث: {new Date(article.updated_at).toLocaleDateString('ar-SA')}</span>
                )}
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <LikeButton article={article} />
              </div>
            </div>
          </div>
        </article>

        {/* Comments Section */}
        <CommentsSection articleId={id} />
      </div>
    </PublicLayout>
  );
};

// Comments Component
const CommentsSection = ({ articleId }) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/articles/${articleId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/articles/${articleId}/comments`, {
        content: newComment.trim()
      });
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('حدث خطأ في إرسال التعليق. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      const response = await axios.put(`${API}/comments/${commentId}`, {
        content: editContent.trim()
      });
      setComments(comments.map(comment => 
        comment.id === commentId ? response.data : comment
      ));
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Error editing comment:', error);
      alert('حدث خطأ في تعديل التعليق. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    try {
      await axios.delete(`${API}/comments/${commentId}`);
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('حدث خطأ في حذف التعليق. يرجى المحاولة مرة أخرى.');
    }
  };

  const startEditing = (comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent('');
  };

  return (
    <div className="max-w-4xl mx-auto mt-16">
      <h3 className="text-2xl font-bold mb-8 arabic-title">التعليقات ({comments.length})</h3>
      
      {/* Comment Form */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="شاركنا رأيك حول هذا المقال..."
              rows={4}
              className="w-full p-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 resize-none arabic-content"
              required
            />
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-400">
                {newComment.length}/500 حرف
              </span>
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'جارٍ الإرسال...' : 'نشر التعليق'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-gray-800 rounded-lg text-center">
          <p className="text-gray-400 mb-3">يرجى تسجيل الدخول للمشاركة في النقاش</p>
          <Link to="/login" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors">
            تسجيل الدخول للتعليق
          </Link>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">جارٍ تحميل التعليقات...</div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-lg font-medium">لا توجد تعليقات بعد</p>
          <p className="text-sm">كن أول من يشارك برأيه!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-start space-x-4 space-x-reverse">
                {comment.user_profile_picture ? (
                  <img
                    src={comment.user_profile_picture}
                    alt={comment.user_full_name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-sm">👤</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white">{comment.user_full_name}</h4>
                      <time className="text-sm text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {comment.updated_at !== comment.created_at && (
                          <span className="mr-2">(تم التعديل)</span>
                        )}
                      </time>
                    </div>
                    {user && user.id === comment.user_id && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => startEditing(comment)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingComment === comment.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 resize-none arabic-content"
                        rows={3}
                      />
                      <div className="flex space-x-2 space-x-reverse">
                        <button
                          onClick={() => handleEditComment(comment.id)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap arabic-content">{comment.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
      alert("يرجى تسجيل الدخول للإعجاب بالمقالات!");
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
    <div className="flex items-center space-x-2 space-x-reverse">
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center space-x-2 space-x-reverse px-4 py-2 rounded-lg transition-colors ${
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
        <span className="text-xs text-gray-500">سجل دخولك للإعجاب</span>
      )}
    </div>
  );
};

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    section_id: '',
    author: '',
    tags: '',
    from_date: '',
    to_date: '',
    sort_by: 'relevance'
  });
  const [sections, setSections] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Search bar states for the results page
  const [searchQuery, setSearchQuery] = useState(query);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchSections();
    fetchAvailableTags();
    if (query) {
      performSearch();
    } else {
      setLoading(false);
    }
  }, [query]);

  const fetchAvailableTags = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      setAvailableTags(response.data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API}/sections`);
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchSearchSuggestions = async (query) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(query)}`);
      setSearchSuggestions(response.data.suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    fetchSearchSuggestions(value);
    setShowSuggestions(true);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      // Reload the page to trigger new search
      window.location.reload();
    }
  };

  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    setShowSuggestions(false);
    window.location.reload();
  };

  const performSearch = async (customFilters = {}) => {
    setLoading(true);
    try {
      const searchFilters = { ...filters, ...customFilters };
      const params = new URLSearchParams({
        q: query,
        ...Object.fromEntries(Object.entries(searchFilters).filter(([_, v]) => v))
      });
      
      const response = await axios.get(`${API}/search?${params}`);
      setResults(response.data);
    } catch (error) {
      console.error("Error performing search:", error);
      setResults({
        articles: [],
        sections: [],
        total_results: 0,
        query: query
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    performSearch(newFilters);
  };

  const getSectionName = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : "قسم غير معروف";
  };

  const highlightSearchTerm = (text, term) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 text-black">$1</mark>');
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-400">جارٍ البحث...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!query) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-8xl mb-6">🔍</div>
          <h1 className="text-4xl font-bold mb-4 arabic-title">ابحث في المقالات</h1>
          <p className="text-gray-400 text-lg mb-8">استخدم شريط البحث أعلى الصفحة للعثور على المقالات والأقسام</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Search Results Header with Search Bar */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4 arabic-title">
            نتائج البحث عن: <span className="text-red-500">"{query}"</span>
          </h1>
          
          {/* New Search Bar on Results Page */}
          <div className="mb-4">
            <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="ابحث مرة أخرى..."
                className="w-full pl-4 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 arabic-content text-lg"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-700 p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            
            {/* Search Suggestions on Results Page */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl mt-1 z-50 max-h-64 overflow-y-auto max-w-2xl">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 hover:text-red-400 transition-colors border-b border-gray-700 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="arabic-content">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <p className="text-gray-400">
            {results?.total_results || 0} نتيجة
          </p>
        </div>

        {/* Search Filters */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">خيارات البحث المتقدم</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden text-red-500 hover:text-red-400"
            >
              {showFilters ? 'إخفاء' : 'عرض'} الفلاتر
            </button>
          </div>
          
          <div className={`grid grid-cols-1 lg:grid-cols-6 gap-4 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
            <div>
              <label className="block text-sm font-medium mb-2">القسم</label>
              <select
                value={filters.section_id}
                onChange={(e) => handleFilterChange('section_id', e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">جميع الأقسام</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">الكاتب</label>
              <input
                type="text"
                value={filters.author}
                onChange={(e) => handleFilterChange('author', e.target.value)}
                placeholder="اسم الكاتب"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">الوسوم</label>
              <select
                value={filters.tags}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="">جميع الوسوم</option>
                {availableTags.map((tag) => (
                  <option key={tag.name} value={tag.name}>
                    #{tag.name} ({tag.count})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">من تاريخ</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">ترتيب النتائج</label>
              <select
                value={filters.sort_by}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <option value="relevance">الأكثر صلة</option>
                <option value="date_desc">الأحدث أولاً</option>
                <option value="date_asc">الأقدم أولاً</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {results?.total_results === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">😞</div>
            <h3 className="text-3xl font-bold mb-4">لم نجد أي نتائج</h3>
            <p className="text-gray-400 text-lg mb-8">
              جرب كلمات مختلفة أو تقليل الفلاتر للحصول على نتائج أكثر
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Sections Results */}
            {results?.sections?.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-red-500">الأقسام ({results.sections.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.sections.map((section) => (
                    <Link
                      key={section.id}
                      to={`/section/${section.id}`}
                      className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition-colors"
                    >
                      <h3 className="text-xl font-bold mb-2 text-red-400" 
                          dangerouslySetInnerHTML={{ __html: highlightSearchTerm(section.name, query) }} />
                      {section.description && (
                        <p className="text-gray-400" 
                           dangerouslySetInnerHTML={{ __html: highlightSearchTerm(section.description, query) }} />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Articles Results */}
            {results?.articles?.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 text-red-500">المقالات ({results.articles.length})</h2>
                <div className="space-y-6">
                  {results.articles.map((article) => (
                    <div key={article.id} className="bg-gray-900 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors">
                      <div className="flex flex-col md:flex-row">
                        {article.image_data && (
                          <div className="md:w-48 h-48 md:h-auto">
                            <img
                              src={article.image_data}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <Link to={`/article/${article.id}`}>
                                <h3 className="text-xl font-bold mb-2 hover:text-red-400 transition-colors arabic-title"
                                    dangerouslySetInnerHTML={{ __html: highlightSearchTerm(article.title, query) }} />
                              </Link>
                              <div className="flex items-center text-sm text-gray-500 mb-3">
                                <span className="font-medium" 
                                      dangerouslySetInnerHTML={{ __html: highlightSearchTerm(article.author, query) }} />
                                <span className="mx-2">•</span>
                                <span>{getSectionName(article.section_id)}</span>
                                <span className="mx-2">•</span>
                                <span>{new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-400 line-clamp-3 mb-4"
                             dangerouslySetInnerHTML={{ __html: highlightSearchTerm(article.content.slice(0, 200) + '...', query) }} />
                          <div className="flex items-center justify-between">
                            <Link
                              to={`/article/${article.id}`}
                              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              اقرأ المقال
                            </Link>
                            <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                              <span>❤️ {article.likes_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
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
      setError("كلمات المرور غير متطابقة");
      return;
    }

    if (formData.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const registerData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        password: formData.password,
        profile_picture: formData.profile_picture
      };

      const response = await axios.post(`${API}/register`, registerData);
      login(response.data.access_token, response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.status === 400) {
        const detail = error.response?.data?.detail;
        if (detail?.includes('Username already')) {
          setError('اسم المستخدم مُستخدم بالفعل. يرجى اختيار اسم آخر.');
        } else if (detail?.includes('Email already')) {
          setError('البريد الإلكتروني مُسجل بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.');
        } else {
          setError(detail || 'فشل في التسجيل');
        }
      } else {
        setError('فشل في التسجيل. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-gray-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center text-red-500 arabic-title">إنشاء حساب جديد</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 ltr"
                placeholder="اختر اسم مستخدم فريد"
                required
              />
              <p className="text-xs text-gray-400 mt-1">تذكر هذا الاسم بالضبط - حساس لحالة الأحرف</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 ltr"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                placeholder="اسمك الكامل"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الصورة الشخصية (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
              />
              {formData.profile_picture && (
                <img
                  src={formData.profile_picture}
                  alt="معاينة الصورة"
                  className="mt-2 w-20 h-20 rounded-full object-cover"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 ltr"
                placeholder="اختر كلمة مرور قوية"
                required
                minLength="6"
              />
              <p className="text-xs text-gray-400 mt-1">6 أحرف على الأقل - تذكرها بالضبط لتسجيل الدخول</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 ltr"
                placeholder="أعد كتابة كلمة المرور"
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
              {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب'}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-gray-400">لديك حساب بالفعل؟ </span>
            <Link to="/login" className="text-red-500 hover:text-red-400">سجل دخولك هنا</Link>
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

    const cleanedFormData = {
      username: formData.username.trim(),
      password: formData.password.trim()
    };

    try {
      const response = await axios.post(`${API}/login`, cleanedFormData);
      login(response.data.access_token, response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التحقق من البيانات والمحاولة مرة أخرى.');
      } else {
        setError(error.response?.data?.detail || 'فشل في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-gray-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center text-red-500 arabic-title">تسجيل الدخول</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">اسم المستخدم</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 ltr"
                placeholder="أدخل اسم المستخدم"
                required
              />
              <p className="text-xs text-gray-400 mt-1">اسم المستخدم حساس لحالة الأحرف</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 ltr"
                placeholder="أدخل كلمة المرور"
                required
              />
              <p className="text-xs text-gray-400 mt-1">كلمة المرور حساسة لحالة الأحرف</p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                <div className="text-red-400 text-sm text-center">{error}</div>
                <div className="text-xs text-gray-400 text-center mt-2">
                  تأكد من أن اسم المستخدم وكلمة المرور تطابق بالضبط ما استخدمته أثناء التسجيل.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-gray-400">ليس لديك حساب؟ </span>
            <Link to="/register" className="text-red-500 hover:text-red-400">أنشئ حساباً هنا</Link>
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
          <p className="text-gray-400">جارٍ تحميل الملف الشخصي...</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-gray-900 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center text-red-500 arabic-title">ملفي الشخصي</h1>
          
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
              <label className="block text-sm font-medium text-gray-400 mb-1">البريد الإلكتروني</label>
              <p className="text-white ltr">{user.email}</p>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">عضو منذ</label>
              <p className="text-white">{new Date(user.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/" className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
              العودة للمقالات
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
            <p className="text-gray-400">جارٍ تحميل القسم...</p>
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
            → العودة للرئيسية
          </Link>
        </nav>

        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 arabic-title">{currentSection?.name || "القسم"}</h1>
          {currentSection?.description && (
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">{currentSection.description}</p>
          )}
          <div className="text-red-500 font-semibold mt-4">{articles.length} مقال</div>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📰</div>
            <h3 className="text-3xl font-bold mb-4">لا توجد مقالات في هذا القسم بعد</h3>
            <p className="text-gray-400 text-lg">تابعونا قريباً لإضافة محتوى جديد!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 group shadow-lg article-card"
              >
                {article.image_data && (
                  <img
                    src={article.image_data}
                    alt={article.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-red-400 transition-colors line-clamp-2 arabic-title">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 line-clamp-3 mb-4">
                    {article.content.slice(0, 120)}...
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="font-medium">{article.author}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
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
      setError("رمز المرور غير صحيح. تم رفض الدخول.");
      setPasscode("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-red-500 arabic-title">دخول الإدارة</h1>
          <p className="text-gray-400">أدخل رمز المرور للمتابعة</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="أدخل رمز مرور الإدارة"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full p-4 mb-4 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500 ltr"
            required
          />
          
          {error && (
            <div className="text-red-400 text-sm mb-4 text-center">{error}</div>
          )}
          
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-lg font-semibold transition-colors"
          >
            دخول لوحة الإدارة
          </button>
        </form>
        
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-red-400 text-sm">
            → العودة للموقع
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
  const [showLogoManager, setShowLogoManager] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Form states
  const [newSection, setNewSection] = useState({ name: "", description: "" });
  const [newArticle, setNewArticle] = useState({
    title: "",
    content: "",
    author: "",
    section_id: "",
    image_data: "",
    image_name: "",
    tags: []
  });
  const [tagInput, setTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSections();
      fetchArticles();
      fetchCurrentLogo();
      fetchAvailableTags();
    }
  }, [isAuthenticated]);

  const fetchAvailableTags = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      setAvailableTags(response.data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchCurrentLogo = async () => {
    try {
      const response = await axios.get(`${API}/settings/logo`);
      setCurrentLogo(response.data);
    } catch (error) {
      console.error("Error fetching logo:", error);
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

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setLogoUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const logoData = {
            logo_data: e.target.result,
            logo_name: file.name
          };
          
          const response = await axios.put(`${API}/settings/logo`, logoData);
          setCurrentLogo(response.data);
          alert("تم تحديث الشعار بنجاح!");
        } catch (error) {
          console.error("Error uploading logo:", error);
          alert("خطأ في رفع الشعار. يرجى المحاولة مرة أخرى.");
        } finally {
          setLogoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Tag management functions
  const addTag = (e) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !newArticle.tags.includes(tag)) {
      setNewArticle({
        ...newArticle,
        tags: [...newArticle.tags, tag]
      });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setNewArticle({
      ...newArticle,
      tags: newArticle.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(e);
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
      alert("خطأ في إنشاء القسم. يرجى المحاولة مرة أخرى.");
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
        image_name: "",
        tags: []
      });
      setTagInput("");
      setShowAddArticle(false);
      fetchArticles();
    } catch (error) {
      console.error("Error creating article:", error);
      alert("خطأ في إنشاء المقال. يرجى المحاولة مرة أخرى.");
    }
  };

  const deleteSection = async (sectionId) => {
    if (window.confirm("هل أنت متأكد؟ سيتم حذف جميع المقالات في هذا القسم.")) {
      try {
        await axios.delete(`${API}/sections/${sectionId}`);
        fetchSections();
        fetchArticles();
        if (selectedSection === sectionId) {
          setSelectedSection("all");
        }
      } catch (error) {
        console.error("Error deleting section:", error);
        alert("خطأ في حذف القسم. يرجى المحاولة مرة أخرى.");
      }
    }
  };

  const deleteArticle = async (articleId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المقال؟")) {
      try {
        await axios.delete(`${API}/articles/${articleId}`);
        fetchArticles();
        setSelectedArticle(null);
      } catch (error) {
        console.error("Error deleting article:", error);
        alert("خطأ في حذف المقال. يرجى المحاولة مرة أخرى.");
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
    return section ? section.name : "قسم غير معروف";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Admin Header */}
      <header className="bg-red-900 border-b border-red-700 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold arabic-title">نظام إدارة المحتوى</h1>
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-red-300 text-sm">لوحة الإدارة</span>
              <Link to="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">
                عرض الموقع
              </Link>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                تسجيل الخروج
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
              <div className="text-2xl font-bold text-red-500 arabic-numbers">{articles.length}</div>
              <div className="text-gray-400 text-sm">إجمالي المقالات</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500 arabic-numbers">{sections.length}</div>
              <div className="text-gray-400 text-sm">الأقسام</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500 arabic-numbers">
                {articles.filter(a => a.image_data).length}
              </div>
              <div className="text-gray-400 text-sm">مقالات بصور</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500">
                {new Date().toLocaleDateString('ar-SA')}
              </div>
              <div className="text-gray-400 text-sm">اليوم</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setShowAddSection(true)}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
            >
              <span className="ml-2">+</span> إضافة قسم
            </button>
            <button
              onClick={() => setShowAddArticle(true)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
            >
              <span className="ml-2">✏️</span> كتابة مقال
            </button>
            <button
              onClick={() => setShowLogoManager(true)}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
            >
              <span className="ml-2">🖼️</span> إدارة الشعار
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Section Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">تصفية حسب القسم:</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-red-500"
          >
            <option value="all">جميع الأقسام</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div key={article.id} className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
              {article.image_data && (
                <img
                  src={article.image_data}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="text-sm text-red-500 mb-2">
                  {getSectionName(article.section_id)}
                </div>
                <h3 className="text-lg font-bold mb-2 line-clamp-2 arabic-title">
                  {article.title}
                </h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                  {article.content.slice(0, 100)}...
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  بواسطة: {article.author} • {new Date(article.created_at).toLocaleDateString('ar-SA')}
                </div>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
                  >
                    عرض
                  </button>
                  <button
                    onClick={() => deleteArticle(article.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-8xl mb-4">📝</div>
            <h3 className="text-2xl font-bold mb-4">لا توجد مقالات</h3>
            <p className="text-gray-400 mb-8">ابدأ بكتابة أول مقال لك!</p>
            <button
              onClick={() => setShowAddArticle(true)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              كتابة مقال جديد
            </button>
          </div>
        )}
      </div>

      {/* Sections Management */}
      <div className="container mx-auto px-4 py-8 border-t border-gray-800">
        <h2 className="text-2xl font-bold mb-6 arabic-title">إدارة الأقسام</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <div key={section.id} className="bg-gray-900 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">{section.name}</h3>
                <button
                  onClick={() => deleteSection(section.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  حذف
                </button>
              </div>
              {section.description && (
                <p className="text-gray-400 text-sm mb-2">{section.description}</p>
              )}
              <div className="text-xs text-gray-500">
                {articles.filter(a => a.section_id === section.id).length} مقال
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 arabic-title">إضافة قسم جديد</h2>
            <form onSubmit={createSection}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">اسم القسم</label>
                <input
                  type="text"
                  value={newSection.name}
                  onChange={(e) => setNewSection({...newSection, name: e.target.value})}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">وصف القسم</label>
                <textarea
                  value={newSection.description}
                  onChange={(e) => setNewSection({...newSection, description: e.target.value})}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 arabic-content"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-4 space-x-reverse">
                <button
                  type="button"
                  onClick={() => setShowAddSection(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
                >
                  إضافة القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Article Modal */}
      {showAddArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop overflow-y-auto">
          <div className="bg-gray-900 rounded-xl p-8 max-w-2xl w-full mx-4 my-8">
            <h2 className="text-2xl font-bold mb-6 arabic-title">كتابة مقال جديد</h2>
            <form onSubmit={createArticle}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">عنوان المقال</label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({...newArticle, title: e.target.value})}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 arabic-content"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">القسم</label>
                <select
                  value={newArticle.section_id}
                  onChange={(e) => setNewArticle({...newArticle, section_id: e.target.value})}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                  required
                >
                  <option value="">اختر القسم</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الكاتب</label>
                <input
                  type="text"
                  value={newArticle.author}
                  onChange={(e) => setNewArticle({...newArticle, author: e.target.value})}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">صورة المقال (اختياري)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
                />
                {newArticle.image_data && (
                  <img
                    src={newArticle.image_data}
                    alt="معاينة"
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">الوسوم</label>
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value);
                        setShowTagSuggestions(e.target.value.length > 0);
                      }}
                      onKeyPress={handleTagKeyPress}
                      onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
                      onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                      className="flex-1 p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 arabic-content"
                      placeholder="أدخل وسم جديد..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      إضافة
                    </button>
                  </div>
                  
                  {/* Tag Suggestions */}
                  {showTagSuggestions && availableTags.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-xs text-gray-400 mb-2">الوسوم المقترحة:</div>
                        {availableTags
                          .filter(tag => 
                            tag.name.toLowerCase().includes(tagInput.toLowerCase()) && 
                            !newArticle.tags.includes(tag.name)
                          )
                          .slice(0, 10)
                          .map((tag) => (
                            <button
                              key={tag.name}
                              type="button"
                              onClick={() => {
                                setNewArticle({
                                  ...newArticle,
                                  tags: [...newArticle.tags, tag.name]
                                });
                                setTagInput("");
                                setShowTagSuggestions(false);
                              }}
                              className="block w-full text-right px-3 py-2 hover:bg-gray-800 hover:text-red-400 transition-colors rounded"
                            >
                              <span className="font-medium">#{tag.name}</span>
                              <span className="text-xs text-gray-500 mr-2">({tag.count} مقالة)</span>
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Popular Tags */}
                {availableTags.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-400 mb-2">الوسوم الأكثر استخداماً:</div>
                    <div className="flex flex-wrap gap-2">
                      {availableTags
                        .filter(tag => !newArticle.tags.includes(tag.name))
                        .slice(0, 8)
                        .map((tag) => (
                          <button
                            key={tag.name}
                            type="button"
                            onClick={() => {
                              setNewArticle({
                                ...newArticle,
                                tags: [...newArticle.tags, tag.name]
                              });
                            }}
                            className="bg-gray-700 hover:bg-red-600/30 text-gray-300 hover:text-red-400 px-2 py-1 rounded-full text-xs transition-colors"
                          >
                            #{tag.name} ({tag.count})
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
                
                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {newArticle.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-red-700 rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">اضغط Enter أو الزر "إضافة" لإضافة وسم جديد، أو انقر على الوسوم المقترحة</p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">محتوى المقال</label>
                <textarea
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({...newArticle, content: e.target.value})}
                  className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500 arabic-content"
                  rows={12}
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 space-x-reverse">
                <button
                  type="button"
                  onClick={() => setShowAddArticle(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  نشر المقال
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logo Manager Modal */}
      {showLogoManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
          <div className="bg-gray-900 rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6 arabic-title">إدارة شعار الموقع</h2>
            
            <div className="mb-6 text-center">
              <div className="w-32 h-32 bg-black rounded-lg flex items-center justify-center mx-auto mb-4 border border-gray-600">
                {currentLogo?.logo_data ? (
                  <img
                    src={currentLogo.logo_data}
                    alt="الشعار الحالي"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-gray-300 text-sm">فرسان</div>
                    <div className="text-gray-300 text-sm">العقيدة</div>
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm">الشعار الحالي</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">تحديث الشعار</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={logoUploading}
                className="w-full p-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:border-red-500"
              />
              {logoUploading && (
                <p className="text-blue-400 text-sm mt-2">جارٍ رفع الشعار...</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowLogoManager(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article View Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop overflow-y-auto">
          <div className="bg-gray-900 rounded-xl p-8 max-w-4xl w-full mx-4 my-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold arabic-title">{selectedArticle.title}</h2>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 text-sm text-gray-400">
              القسم: {getSectionName(selectedArticle.section_id)} • 
              الكاتب: {selectedArticle.author} • 
              {new Date(selectedArticle.created_at).toLocaleDateString('ar-SA')}
            </div>

            {selectedArticle.image_data && (
              <img
                src={selectedArticle.image_data}
                alt={selectedArticle.title}
                className="w-full max-h-64 object-cover rounded-lg mb-6"
              />
            )}

            <div className="prose prose-invert max-w-none arabic-content">
              <div className="whitespace-pre-wrap leading-relaxed">
                {selectedArticle.content}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setSelectedArticle(null)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tag Page Component
const TagPage = () => {
  const { tagName } = useParams();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagStats, setTagStats] = useState(null);

  useEffect(() => {
    fetchTagArticles();
    fetchTagStats();
  }, [tagName]);

  const fetchTagArticles = async () => {
    try {
      const response = await axios.get(`${API}/tags/${encodeURIComponent(tagName)}/articles`);
      setArticles(response.data);
    } catch (error) {
      console.error("Error fetching tag articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTagStats = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      const tagData = response.data.tags.find(tag => tag.name === tagName);
      setTagStats(tagData);
    } catch (error) {
      console.error("Error fetching tag stats:", error);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">🏷️</div>
            <p className="text-gray-400">جارٍ تحميل مقالات الوسم...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Tag Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center bg-gradient-to-r from-red-600 to-red-700 rounded-full px-8 py-4 mb-6">
            <svg className="w-8 h-8 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span className="text-2xl font-bold">#{tagName}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 arabic-title">
            مقالات بوسم <span className="text-red-500">#{tagName}</span>
          </h1>
          
          {tagStats && (
            <p className="text-xl text-gray-400">
              {tagStats.count} {tagStats.count === 1 ? 'مقال' : 'مقالة'}
            </p>
          )}
        </div>

        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <div className="flex items-center space-x-2 space-x-reverse text-gray-400">
            <Link to="/" className="hover:text-red-400 transition-colors">الرئيسية</Link>
            <span>«</span>
            <Link to="/tags" className="hover:text-red-400 transition-colors">الوسوم</Link>
            <span>«</span>
            <span className="text-white">#{tagName}</span>
          </div>
        </nav>

        {/* Articles Grid */}
        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                to={`/article/${article.id}`}
                className="bg-gray-900 rounded-xl overflow-hidden hover:bg-gray-800 transition-all duration-300 group shadow-lg article-card"
              >
                {article.image_data && (
                  <img
                    src={article.image_data}
                    alt={article.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center text-sm text-red-500 mb-3">
                    <span>{new Date(article.created_at).toLocaleDateString('ar-SA')}</span>
                    <span className="mx-2">•</span>
                    <span className="font-medium">{article.author}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-red-400 transition-colors line-clamp-2 arabic-title">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 line-clamp-3 mb-4">
                    {article.content.slice(0, 120)}...
                  </p>
                  
                  {/* Other tags */}
                  {article.tags && article.tags.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {article.tags.filter(tag => tag !== tagName).slice(0, 3).map((tag, tagIndex) => (
                        <Link
                          key={tagIndex}
                          to={`/tag/${encodeURIComponent(tag)}`}
                          className="bg-gray-700 hover:bg-red-600/30 text-gray-300 hover:text-red-400 px-2 py-1 rounded-full text-xs transition-colors"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 text-red-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      {article.likes_count}
                    </span>
                    <span className="text-red-400 group-hover:translate-x-1 transition-transform">
                      اقرأ المزيد ←
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-32">
            <div className="text-8xl mb-8">🏷️</div>
            <h2 className="text-4xl font-bold mb-4 arabic-title">لا توجد مقالات</h2>
            <p className="text-xl text-gray-400 mb-8">لم يتم العثور على مقالات بهذا الوسم</p>
            <Link to="/tags" className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
              تصفح جميع الوسوم
            </Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

// All Tags Page Component
const AllTagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllTags();
  }, []);

  const fetchAllTags = async () => {
    try {
      const response = await axios.get(`${API}/tags`);
      setTags(response.data.tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-pulse">
            <div className="text-6xl mb-4">🏷️</div>
            <p className="text-gray-400">جارٍ تحميل الوسوم...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 arabic-title">
            جميع <span className="text-red-500">الوسوم</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            تصفح المقالات حسب الوسوم والمواضيع المختلفة
          </p>
        </div>

        {/* Breadcrumb */}
        <nav className="mb-8 text-sm">
          <div className="flex items-center space-x-2 space-x-reverse text-gray-400">
            <Link to="/" className="hover:text-red-400 transition-colors">الرئيسية</Link>
            <span>«</span>
            <span className="text-white">الوسوم</span>
          </div>
        </nav>

        {/* Tags Cloud */}
        {tags.length > 0 ? (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 arabic-title">سحابة الوسوم</h2>
            <div className="bg-gray-900 rounded-xl p-8">
              <div className="flex flex-wrap gap-3 justify-center">
                {tags.map((tag) => {
                  // Calculate relative size based on count
                  const maxCount = Math.max(...tags.map(t => t.count));
                  const relativeSize = (tag.count / maxCount) * 100;
                  let sizeClass = 'text-sm';
                  if (relativeSize > 80) sizeClass = 'text-2xl';
                  else if (relativeSize > 60) sizeClass = 'text-xl';
                  else if (relativeSize > 40) sizeClass = 'text-lg';
                  else if (relativeSize > 20) sizeClass = 'text-base';

                  return (
                    <Link
                      key={tag.name}
                      to={`/tag/${encodeURIComponent(tag.name)}`}
                      className={`${sizeClass} bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-600/40 hover:to-red-700/40 text-red-400 hover:text-red-300 px-4 py-2 rounded-full transition-all duration-300 hover:scale-110 border border-red-600/30 hover:border-red-500/50`}
                    >
                      #{tag.name} ({tag.count})
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Tags List */}
        {tags.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold mb-8 arabic-title">قائمة الوسوم</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tags.map((tag) => (
                <Link
                  key={tag.name}
                  to={`/tag/${encodeURIComponent(tag.name)}`}
                  className="bg-gray-900 rounded-xl p-6 hover:bg-gray-800 transition-all duration-300 group border border-gray-800 hover:border-red-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold group-hover:text-red-400 transition-colors mb-2">
                        #{tag.name}
                      </h3>
                      <p className="text-gray-400">
                        {tag.count} {tag.count === 1 ? 'مقال' : 'مقالة'}
                      </p>
                    </div>
                    <div className="text-red-400 group-hover:translate-x-1 transition-transform">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-32">
            <div className="text-8xl mb-8">🏷️</div>
            <h2 className="text-4xl font-bold mb-4 arabic-title">لا توجد وسوم بعد</h2>
            <p className="text-xl text-gray-400 mb-8">لم يتم إنشاء أي وسوم للمقالات حتى الآن</p>
            <Link to="/" className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
              العودة للرئيسية
            </Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/section/:id" element={<SectionPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/tag/:tagName" element={<TagPage />} />
            <Route path="/tags" element={<AllTagsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
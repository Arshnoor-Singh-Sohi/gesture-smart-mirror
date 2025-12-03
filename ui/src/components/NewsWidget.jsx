import { useState, useEffect, useRef } from 'react';
import dataService from '../services/dataService';

const NewsWidget = () => {
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState('all');
  const newsListRef = useRef(null);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 30 * 60 * 1000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 60000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchNews = async () => {
    try {
      const data = await dataService.getNewsData();
      setNewsData(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const scrollUp = () => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  };

  const scrollDown = () => {
    if (newsData && newsData.headlines) {
      const filteredHeadlines = getFilteredHeadlines();
      setSelectedIndex(prev => Math.min(filteredHeadlines.length - 1, prev + 1));
    }
  };

  const selectItem = () => {
    setShowDetailPopup(true);
    // Auto-hide popup after 3 seconds
    setTimeout(() => {
      setShowDetailPopup(false);
    }, 3000);
  };

  useEffect(() => {
    window.newsScrollUp = scrollUp;
    window.newsScrollDown = scrollDown;
    window.newsSelectItem = selectItem;
  }, [newsData, selectedIndex, showDetailPopup, activeCategory]);

  // Auto-scroll selected into view
  useEffect(() => {
    if (newsListRef.current) {
      const selectedElement = newsListRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndex]);

  const getFilteredHeadlines = () => {
    if (!newsData || !newsData.headlines) return [];
    if (activeCategory === 'all') return newsData.headlines;
    return newsData.headlines.filter(h => h.category.toLowerCase() === activeCategory);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'technology': '💻',
      'health': '🏥',
      'business': '💼',
      'general': '📰',
      'sports': '⚽',
      'entertainment': '🎬',
      'science': '🔬'
    };
    return icons[category.toLowerCase()] || '📰';
  };

  if (loading) {
    return (
      <div className="news-container">
        <div className="news-loading">
          <div className="loading-newsprint">
            <div className="newsprint-line"></div>
            <div className="newsprint-line"></div>
            <div className="newsprint-line"></div>
            <div className="newsprint-line"></div>
            <div className="newsprint-line"></div>
          </div>
          <p className="loading-text-news">Fetching latest headlines...</p>
        </div>
      </div>
    );
  }

  if (!newsData || !newsData.headlines || newsData.headlines.length === 0) {
    return (
      <div className="news-container">
        <div className="news-empty">
          <div className="empty-icon-news">📰</div>
          <div className="empty-text-news">No news available</div>
          <div className="empty-subtext-news">Check back later for updates</div>
        </div>
      </div>
    );
  }

  const filteredHeadlines = getFilteredHeadlines();
  const selectedArticle = filteredHeadlines[selectedIndex];
  const categories = ['all', ...new Set(newsData.headlines.map(h => h.category.toLowerCase()))];

  return (
    <div className="news-container">
      {/* Animated Background */}
      <div className="news-background">
        <div className="news-gradient-1"></div>
        <div className="news-gradient-2"></div>
        <div className="news-grid-overlay"></div>
      </div>

      {/* Header */}
      <div className="news-header-modern">
        <div className="news-masthead">
          <div className="masthead-icon">📰</div>
          <div className="masthead-content">
            <h1 className="news-title-main">Latest Headlines</h1>
            <div className="news-meta">
              <span className="news-date">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <span className="news-divider">•</span>
              <span className="news-count">
                {filteredHeadlines.length} {filteredHeadlines.length === 1 ? 'article' : 'articles'}
              </span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedIndex(0);
              }}
            >
              {cat === 'all' ? '🌐' : getCategoryIcon(cat)}
              <span>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* News List */}
      <div className="news-list-container" ref={newsListRef}>
        <div className="news-articles-grid">
          {filteredHeadlines.map((article, index) => {
            const isSelected = index === selectedIndex;
            const isTop = index === 0;
            
            return (
              <div
                key={article.id}
                data-index={index}
                className={`news-card ${isSelected ? 'selected' : ''} ${isTop ? 'featured' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {isSelected && (
                  <div className="selection-highlight"></div>
                )}

                {/* Category Badge */}
                <div className={`news-category-badge category-${article.category.toLowerCase()}`}>
                  <span className="category-icon">{getCategoryIcon(article.category)}</span>
                  <span className="category-name">{article.category}</span>
                </div>

                {/* Featured Image Placeholder (top story gets larger treatment) */}
                {isTop && (
                  <div className="news-image-placeholder">
                    <div className="image-gradient"></div>
                    <div className="breaking-badge">BREAKING</div>
                  </div>
                )}

                {/* Article Content */}
                <div className="news-card-content">
                  <h3 className={`news-headline ${isTop ? 'featured-headline' : ''}`}>
                    {article.title}
                  </h3>

                  <p className="news-summary">
                    {article.summary}
                  </p>

                  <div className="news-meta-bar">
                    <div className="news-source">
                      <span className="source-icon">📡</span>
                      <span className="source-name">{article.source}</span>
                    </div>
                    <div className="news-time">
                      <span className="time-icon">🕐</span>
                      <span className="time-text">{article.time}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="read-more-hint">
                      <span className="hint-icon">🤏</span>
                      <span>Pinch to view details</span>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="selection-arrow-news">→</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Popup */}
      {showDetailPopup && selectedArticle && (
        <div className="detail-popup-overlay" onClick={() => setShowDetailPopup(false)}>
          <div className="detail-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <div className={`popup-category category-${selectedArticle.category.toLowerCase()}`}>
                {getCategoryIcon(selectedArticle.category)} {selectedArticle.category}
              </div>
              <button className="popup-close" onClick={() => setShowDetailPopup(false)}>✕</button>
            </div>

            <h2 className="popup-title">{selectedArticle.title}</h2>

            <div className="popup-meta">
              <span>📡 {selectedArticle.source}</span>
              <span>•</span>
              <span>🕐 {selectedArticle.time}</span>
            </div>

            <p className="popup-summary">{selectedArticle.summary}</p>

            {selectedArticle.url && (
              <div className="popup-link">
                <span className="link-label">Full article available at:</span>
                <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" className="article-url">
                  {selectedArticle.url}
                </a>
              </div>
            )}

            <div className="popup-note">
              <span className="note-icon">ℹ️</span>
              <span>In a production app, full article content would be fetched and displayed here with images, quotes, and complete text formatting.</span>
            </div>

            <button className="popup-close-btn" onClick={() => setShowDetailPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Gesture Hints */}
      <div className="news-gesture-hints">
        <div className="hint-item-news">
          <span className="hint-emoji-news">👆</span>
          <span className="hint-text-news">Swipe Up: Previous</span>
        </div>
        <div className="hint-item-news">
          <span className="hint-emoji-news">👇</span>
          <span className="hint-text-news">Swipe Down: Next</span>
        </div>
        <div className="hint-item-news">
          <span className="hint-emoji-news">🤏</span>
          <span className="hint-text-news">Pinch: View Details</span>
        </div>
      </div>
    </div>
  );
};

export default NewsWidget;
import { useState, useEffect } from 'react';
import dataService from '../services/dataService';

const NewsWidget = () => {
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
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
      setSelectedIndex(prev => Math.min(newsData.headlines.length - 1, prev + 1));
    }
  };

  const selectItem = () => {
    setShowDetail(!showDetail);
  };

  useEffect(() => {
    window.newsScrollUp = scrollUp;
    window.newsScrollDown = scrollDown;
    window.newsSelectItem = selectItem;
  }, [newsData, selectedIndex, showDetail]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading news...</p>
        </div>
      </div>
    );
  }

  if (!newsData || !newsData.headlines || newsData.headlines.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl">
          <p className="text-white/60 text-xl">📰 No news available</p>
        </div>
      </div>
    );
  }

  const selectedArticle = newsData.headlines[selectedIndex];

  return (
    <div className="w-full h-full p-6 relative overflow-hidden">
      <div className="glass-header mb-6 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Latest News</h2>
            <p className="text-white/70 text-sm">
              {newsData.headlines.length} headlines • {selectedIndex + 1} of {newsData.headlines.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      </div>

      {!showDetail ? (
        <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 200px)' }}>
          {newsData.headlines.map((article, index) => (
            <div
              key={article.id}
              className={`glass-mini-card p-4 rounded-xl selectable-item ${
                index === selectedIndex ? 'selected' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-white font-semibold text-base flex-1">
                  {article.title}
                </h3>
                <span className={`category-badge category-${article.category.toLowerCase()}`}>
                  {article.category}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{article.source}</span>
                <span className="text-white/50">{article.time}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-6 rounded-3xl overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 200px)' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold text-white flex-1">
              {selectedArticle.title}
            </h2>
            <span className={`category-badge category-${selectedArticle.category.toLowerCase()}`}>
              {selectedArticle.category}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-6 text-white/60 text-sm">
            <span className="flex items-center gap-1">
              <span>📰</span>
              {selectedArticle.source}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span>🕒</span>
              {selectedArticle.time}
            </span>
          </div>

          <p className="text-white/80 text-lg leading-relaxed mb-6">
            {selectedArticle.summary}
          </p>

          {selectedArticle.url && (
            <div className="glass-mini-card p-4 rounded-xl">
              <p className="text-white/60 text-sm mb-2">Read full article:</p>
              <p className="text-blue-300 text-sm break-all">{selectedArticle.url}</p>
            </div>
          )}
        </div>
      )}

      <div className="glass-hint mt-6 p-3 rounded-xl">
        <div className="flex items-center justify-center gap-6 text-white/70 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-xl">👆</span>
            Swipe up: Previous
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xl">👇</span>
            Swipe down: Next
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xl">✋</span>
            {showDetail ? 'Back to list' : 'Read article'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NewsWidget;
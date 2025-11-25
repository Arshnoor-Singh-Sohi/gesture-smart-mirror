/**
 * Data service for fetching real widget data from backend API.
 * Replaces mock data with real API calls.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8765';
 const DEFAULT_CITY = import.meta.env.VITE_DEFAULT_CITY || 'San Francisco';

class DataService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = {
      weather: 10 * 60 * 1000, // 10 minutes
      news: 30 * 60 * 1000,    // 30 minutes
      calendar: 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Check if cached data is still valid
   */
  _isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < cached.ttl;
  }

  /**
   * Set cache entry
   */
  _setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cached data
   */
  _getCache(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Fetch with timeout
   */
  async _fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Get weather data
   */
  async getWeatherData(city = DEFAULT_CITY) {
    const cacheKey = `weather_${city}`;
    
    if (this._isCacheValid(cacheKey)) {
      return this._getCache(cacheKey);
    }

    try {
      const data = await this._fetchWithTimeout(
        `${API_BASE_URL}/api/weather?city=${encodeURIComponent(city)}`
      );
      
      this._setCache(cacheKey, data, this.cacheTTL.weather);
      return data;
    } catch (error) {
      console.error('Error fetching weather:', error);
      
      // Return cached data if available, even if expired
      const cached = this._getCache(cacheKey);
      if (cached) return cached;
      
      // Fallback to mock data
      return this._getMockWeather();
    }
  }

  /**
   * Get news headlines
   */
  async getNewsData(country = 'ca') {
    const cacheKey = `news_${country}`;
    
    if (this._isCacheValid(cacheKey)) {
      return this._getCache(cacheKey);
    }

    try {
      const data = await this._fetchWithTimeout(
      `${API_BASE_URL}/api/news?country=${country}&_=${Date.now()}`
      );
      
      this._setCache(cacheKey, data, this.cacheTTL.news);
      return data;
    } catch (error) {
      console.error('Error fetching news:', error);
      
      const cached = this._getCache(cacheKey);
      if (cached) return cached;
      
      return this._getMockNews();
    }
  }

  /**
   * Get calendar events
   */
  async getCalendarData() {
    const cacheKey = 'calendar';
    
    if (this._isCacheValid(cacheKey)) {
      return this._getCache(cacheKey);
    }

    try {
      const data = await this._fetchWithTimeout(`${API_BASE_URL}/api/calendar`);
      
      this._setCache(cacheKey, data, this.cacheTTL.calendar);
      return data;
    } catch (error) {
      console.error('Error fetching calendar:', error);
      
      const cached = this._getCache(cacheKey);
      if (cached) return cached;
      
      return this._getMockCalendar();
    }
  }

  /**
   * Get all data at once (optimized single call)
   */
  async getAllData() {
    try {
      const data = await this._fetchWithTimeout(`${API_BASE_URL}/api/all`);
      
      // Cache each component separately
      if (data.weather) {
        this._setCache('weather_San Francisco', data.weather, this.cacheTTL.weather);
      }
      if (data.news) {
        this._setCache('news_us', data.news, this.cacheTTL.news);
      }
      if (data.calendar) {
        this._setCache('calendar', data.calendar, this.cacheTTL.calendar);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching all data:', error);
      return {
        weather: this._getMockWeather(),
        news: this._getMockNews(),
        calendar: this._getMockCalendar()
      };
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }

  // ============ Fallback Mock Data ============
  _getMockWeather() {
    return {
      location: 'San Francisco, CA',
      current: {
        temperature: 68,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 8,
        icon: '⛅',
        tempUnit: '°F',
        windUnit: 'mph',
      },
      forecast: [
        { day: 'Monday', high: 72, low: 58, condition: 'Sunny', icon: '☀️' },
        { day: 'Tuesday', high: 70, low: 56, condition: 'Partly Cloudy', icon: '⛅' },
        { day: 'Wednesday', high: 65, low: 54, condition: 'Cloudy', icon: '☁️' },
        { day: 'Thursday', high: 63, low: 52, condition: 'Rainy', icon: '🌧️' },
        { day: 'Friday', high: 68, low: 55, condition: 'Partly Cloudy', icon: '⛅' },
      ],
    };
  }

  _getMockNews() {
    return {
      headlines: [
        {
          id: 1,
          title: 'Technology Advances Continue',
          source: 'Tech News',
          time: '2 hours ago',
          summary: 'Latest developments in technology sector.',
          category: 'Technology',
        },
        {
          id: 2,
          title: 'Global Markets Update',
          source: 'Financial Times',
          time: '4 hours ago',
          summary: 'Markets show positive trends this week.',
          category: 'Business',
        },
      ],
    };
  }

  _getMockCalendar() {
    return {
      events: [
        {
          id: 1,
          title: 'Morning Meeting',
          time: '9:00 AM',
          duration: '30 min',
          description: 'Daily sync',
          color: '#3b82f6',
        },
        {
          id: 2,
          title: 'Lunch Break',
          time: '12:00 PM',
          duration: '1 hour',
          description: 'Break time',
          color: '#10b981',
        },
      ],
    };
  }
}

// Singleton instance
const dataService = new DataService();

export default dataService;

// Export individual methods for convenience
export const getWeatherData = (city) => dataService.getWeatherData(city);
export const getNewsData = (country) => dataService.getNewsData(country);
export const getCalendarData = () => dataService.getCalendarData();
export const getAllData = () => dataService.getAllData();
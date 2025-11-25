"""
API Integrations Module
Handles external API calls for weather, news, and calendar data.
"""

import os
import json
import logging
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv  # ADD THIS

# Load .env file
load_dotenv()

logger = logging.getLogger('gesture_vision.api_integrations')


class CacheEntry:
    """Simple cache entry with TTL."""
    def __init__(self, data: Any, ttl_seconds: int):
        self.data = data
        self.expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
    
    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at


class APICache:
    """Simple in-memory cache with TTL."""
    def __init__(self):
        self.cache: Dict[str, CacheEntry] = {}
    
    def get(self, key: str) -> Optional[Any]:
        entry = self.cache.get(key)
        if entry and not entry.is_expired():
            return entry.data
        elif entry:
            del self.cache[key]
        return None
    
    def set(self, key: str, data: Any, ttl_seconds: int):
        self.cache[key] = CacheEntry(data, ttl_seconds)
    
    def clear(self):
        self.cache.clear()


class WeatherAPI:
    """OpenWeatherMap API integration."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENWEATHER_API_KEY')
        self.default_city = os.getenv('DEFAULT_CITY', 'San Francisco')
        self.base_url = 'http://api.openweathermap.org/data/2.5'
        self.cache = APICache()
        self.cache_ttl = 600
    
    async def get_weather(self, city: Optional[str] = None, units: str = 'imperial') -> Dict[str, Any]:
        """Get current weather and forecast."""
        city = city or self.default_city  # SET DEFAULT FIRST
        
        cache_key = f"weather_{city}_{units}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.info(f"Returning cached weather for {city}")
            return cached
        
        if not self.api_key:
            logger.warning("No OpenWeather API key, returning mock data")
            return self._get_mock_weather()
        
        try:
            async with aiohttp.ClientSession() as session:
                current_url = f"{self.base_url}/weather"
                params = {'q': city, 'appid': self.api_key, 'units': units}
                
                async with session.get(current_url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"Weather API error: {response.status}")
                        return self._get_mock_weather()
                    current_data = await response.json()
                
                forecast_url = f"{self.base_url}/forecast"
                async with session.get(forecast_url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"Forecast API error: {response.status}")
                        forecast_data = None
                    else:
                        forecast_data = await response.json()
                
                weather = self._parse_weather_data(current_data, forecast_data, units)
                self.cache.set(cache_key, weather, self.cache_ttl)
                logger.info(f"Fetched weather for {city}")
                return weather
        
        except Exception as e:
            logger.error(f"Error fetching weather: {e}")
            return self._get_mock_weather()
    
    def _parse_weather_data(self, current: Dict, forecast: Optional[Dict], units: str) -> Dict[str, Any]:
        """Parse OpenWeather API response."""
        temp_unit = '°F' if units == 'imperial' else '°C'
        wind_unit = 'mph' if units == 'imperial' else 'm/s'
        
        weather_icons = {
            'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️',
            'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️',
        }
        
        current_condition = current['weather'][0]['main']
        
        data = {
            'location': current['name'],
            'current': {
                'temperature': round(current['main']['temp']),
                'condition': current['weather'][0]['description'].title(),
                'humidity': current['main']['humidity'],
                'windSpeed': round(current['wind']['speed']),
                'icon': weather_icons.get(current_condition, '⛅'),
                'tempUnit': temp_unit,
                'windUnit': wind_unit,
            },
            'forecast': []
        }
        
        if forecast:
            daily_forecast = {}
            for item in forecast['list'][:40]:
                date = datetime.fromtimestamp(item['dt']).date()
                if date not in daily_forecast:
                    daily_forecast[date] = {
                        'temps': [],
                        'condition': item['weather'][0]['main'],
                        'icon': weather_icons.get(item['weather'][0]['main'], '⛅')
                    }
                daily_forecast[date]['temps'].append(item['main']['temp'])
            
            for i, (date, info) in enumerate(list(daily_forecast.items())[:5]):
                data['forecast'].append({
                    'day': date.strftime('%A'),
                    'high': round(max(info['temps'])),
                    'low': round(min(info['temps'])),
                    'condition': info['condition'],
                    'icon': info['icon']
                })
        
        return data
    
    def _get_mock_weather(self) -> Dict[str, Any]:
        """Return mock weather data when API unavailable."""
        return {
            'location': 'San Francisco, CA',
            'current': {
                'temperature': 68,
                'condition': 'Partly Cloudy',
                'humidity': 65,
                'windSpeed': 8,
                'icon': '⛅',
                'tempUnit': '°F',
                'windUnit': 'mph',
            },
            'forecast': [
                {'day': 'Monday', 'high': 72, 'low': 58, 'condition': 'Sunny', 'icon': '☀️'},
                {'day': 'Tuesday', 'high': 70, 'low': 56, 'condition': 'Partly Cloudy', 'icon': '⛅'},
                {'day': 'Wednesday', 'high': 65, 'low': 54, 'condition': 'Cloudy', 'icon': '☁️'},
                {'day': 'Thursday', 'high': 63, 'low': 52, 'condition': 'Rainy', 'icon': '🌧️'},
                {'day': 'Friday', 'high': 68, 'low': 55, 'condition': 'Partly Cloudy', 'icon': '⛅'},
            ],
        }


class NewsAPI:
    """NewsAPI integration."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('NEWS_API_KEY')
        self.base_url = 'https://newsapi.org/v2'
        self.cache = APICache()
        self.cache_ttl = 1800
    
    async def get_headlines(self, country: str = 'us', category: Optional[str] = None) -> Dict[str, Any]:
        """Get top headlines."""
        cache_key = f"news_{country}_{category}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.info("Returning cached news headlines")
            return cached
        
        if not self.api_key:
            logger.warning("No NewsAPI key, returning mock data")
            return self._get_mock_news()
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/top-headlines"
                params = {'country': country, 'apiKey': self.api_key, 'pageSize': 20}
                if category:
                    params['category'] = category
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        logger.error(f"NewsAPI error: {response.status}")
                        return self._get_mock_news()
                    data = await response.json()
                    
                    if data.get('status') != 'ok':
                        logger.error(f"NewsAPI error: {data.get('message', 'Unknown error')}")
                    return self._get_mock_news()
                
                news = self._parse_news_data(data)
                self.cache.set(cache_key, news, self.cache_ttl)
                logger.info("Fetched news headlines")
                return news
        
        except Exception as e:
            logger.error(f"Error fetching news: {e}")
            return self._get_mock_news()
    
    def _parse_news_data(self, data: Dict) -> Dict[str, Any]:
        """Parse NewsAPI response."""
        headlines = []
        
        for i, article in enumerate(data.get('articles', [])[:15], 1):
            published = article.get('publishedAt', '')
            time_ago = self._time_ago(published) if published else 'Recently'
            source_name = article.get('source', {}).get('name', '')
            category = self._infer_category(source_name, article.get('title', ''))
            
            headlines.append({
                'id': i,
                'title': article.get('title', 'No title'),
                'source': source_name,
                'time': time_ago,
                'summary': article.get('description', 'No description available.')[:200],
                'category': category,
                'url': article.get('url', '')
            })
        
        return {'headlines': headlines}
    
    def _time_ago(self, timestamp: str) -> str:
        """Convert ISO timestamp to 'X hours ago' format."""
        try:
            pub_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            diff = datetime.now(pub_time.tzinfo) - pub_time
            hours = int(diff.total_seconds() / 3600)
            
            if hours < 1:
                minutes = int(diff.total_seconds() / 60)
                return f"{minutes} min ago" if minutes > 0 else "Just now"
            elif hours < 24:
                return f"{hours} hour{'s' if hours != 1 else ''} ago"
            else:
                days = hours // 24
                return f"{days} day{'s' if days != 1 else ''} ago"
        except:
            return "Recently"
    
    def _infer_category(self, source: str, title: str) -> str:
        """Infer article category from source/title."""
        tech_keywords = ['tech', 'technology', 'ai', 'computer', 'software', 'app']
        health_keywords = ['health', 'medical', 'medicine', 'disease', 'hospital']
        business_keywords = ['business', 'market', 'stock', 'economy', 'finance']
        
        text = (source + ' ' + title).lower()
        
        if any(k in text for k in tech_keywords):
            return 'Technology'
        elif any(k in text for k in health_keywords):
            return 'Health'
        elif any(k in text for k in business_keywords):
            return 'Business'
        else:
            return 'General'
    
    def _get_mock_news(self) -> Dict[str, Any]:
        """Return mock news data when API unavailable."""
        return {
            'headlines': [
                {
                    'id': 1,
                    'title': 'Major Breakthrough in Quantum Computing',
                    'source': 'Tech Today',
                    'time': '2 hours ago',
                    'summary': 'Researchers achieve significant milestone in quantum error correction.',
                    'category': 'Technology',
                },
                {
                    'id': 2,
                    'title': 'AI-Powered Healthcare Shows Promising Results',
                    'source': 'Medical News',
                    'time': '4 hours ago',
                    'summary': 'New study demonstrates 95% accuracy in early disease detection.',
                    'category': 'Health',
                },
                {
                    'id': 3,
                    'title': 'Electric Vehicle Sales Surge Globally',
                    'source': 'Auto World',
                    'time': '6 hours ago',
                    'summary': 'EV market share reaches 15% of total vehicle sales worldwide.',
                    'category': 'Business',
                },
            ]
        }


class CalendarAPI:
    """Simple calendar integration using local events."""
    
    def __init__(self):
        self.cache = APICache()
        self.cache_ttl = 300
    
    async def get_events(self) -> Dict[str, Any]:
        """Get today's events."""
        cache_key = "calendar_events"
        cached = self.cache.get(cache_key)
        if cached:
            logger.info("Returning cached calendar events")
            return cached
        
        events = self._get_sample_events()
        self.cache.set(cache_key, events, self.cache_ttl)
        logger.info("Fetched calendar events")
        return events
    
    def _get_sample_events(self) -> Dict[str, Any]:
        """Get sample calendar events for today."""
        return {
            'events': [
                {
                    'id': 1,
                    'title': 'Team Standup',
                    'time': '9:00 AM',
                    'duration': '15 min',
                    'description': 'Daily team sync and status updates',
                    'color': '#3b82f6',
                },
                {
                    'id': 2,
                    'title': 'Product Review Meeting',
                    'time': '11:00 AM',
                    'duration': '1 hour',
                    'description': 'Review Q4 product roadmap with stakeholders',
                    'color': '#10b981',
                },
                {
                    'id': 3,
                    'title': 'Code Review Session',
                    'time': '3:00 PM',
                    'duration': '45 min',
                    'description': 'Review pull requests for gesture recognition system',
                    'color': '#8b5cf6',
                },
            ]
        }


class APIManager:
    """Central manager for all API integrations."""
    
    def __init__(self):
        self.weather = WeatherAPI()
        self.news = NewsAPI()
        self.calendar = CalendarAPI()
        logger.info("API Manager initialized")
    
    async def get_all_data(self) -> Dict[str, Any]:
        """Fetch all data concurrently."""
        try:
            weather_task = self.weather.get_weather()
            news_task = self.news.get_headlines()
            calendar_task = self.calendar.get_events()
            
            weather, news, calendar = await asyncio.gather(
                weather_task, news_task, calendar_task,
                return_exceptions=True
            )
            
            return {
                'weather': weather if not isinstance(weather, Exception) else self.weather._get_mock_weather(),
                'news': news if not isinstance(news, Exception) else self.news._get_mock_news(),
                'calendar': calendar if not isinstance(calendar, Exception) else self.calendar._get_sample_events()
            }
        except Exception as e:
            logger.error(f"Error fetching all data: {e}")
            return {
                'weather': self.weather._get_mock_weather(),
                'news': self.news._get_mock_news(),
                'calendar': self.calendar._get_sample_events()
            }
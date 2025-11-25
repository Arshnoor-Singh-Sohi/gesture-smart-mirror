/**
 * Mock data service for widget content.
 * Provides realistic fake data for weather, calendar, and news.
 */

export const weatherData = {
  location: 'San Francisco, CA',
  current: {
    temperature: 68,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 8,
    icon: '⛅',
  },
  forecast: [
    {
      day: 'Monday',
      high: 72,
      low: 58,
      condition: 'Sunny',
      icon: '☀️',
    },
    {
      day: 'Tuesday',
      high: 70,
      low: 56,
      condition: 'Partly Cloudy',
      icon: '⛅',
    },
    {
      day: 'Wednesday',
      high: 65,
      low: 54,
      condition: 'Cloudy',
      icon: '☁️',
    },
    {
      day: 'Thursday',
      high: 63,
      low: 52,
      condition: 'Rainy',
      icon: '🌧️',
    },
    {
      day: 'Friday',
      high: 68,
      low: 55,
      condition: 'Partly Cloudy',
      icon: '⛅',
    },
  ],
};

export const calendarData = {
  events: [
    {
      id: 1,
      title: 'Team Standup',
      time: '9:00 AM',
      duration: '15 min',
      description: 'Daily team sync and status updates',
      color: '#3b82f6',
    },
    {
      id: 2,
      title: 'Product Review Meeting',
      time: '11:00 AM',
      duration: '1 hour',
      description: 'Review Q4 product roadmap with stakeholders',
      color: '#10b981',
    },
    {
      id: 3,
      title: 'Lunch with Client',
      time: '12:30 PM',
      duration: '1.5 hours',
      description: 'Discussion about new project requirements',
      color: '#f59e0b',
    },
    {
      id: 4,
      title: 'Code Review Session',
      time: '3:00 PM',
      duration: '45 min',
      description: 'Review pull requests for gesture recognition system',
      color: '#8b5cf6',
    },
    {
      id: 5,
      title: 'Gym Workout',
      time: '6:00 PM',
      duration: '1 hour',
      description: 'Leg day',
      color: '#ef4444',
    },
  ],
};

export const newsData = {
  headlines: [
    {
      id: 1,
      title: 'Major Breakthrough in Quantum Computing',
      source: 'Tech Today',
      time: '2 hours ago',
      summary: 'Researchers achieve significant milestone in quantum error correction, bringing practical quantum computers closer to reality.',
      category: 'Technology',
    },
    {
      id: 2,
      title: 'AI-Powered Healthcare Shows Promising Results',
      source: 'Medical News',
      time: '4 hours ago',
      summary: 'New study demonstrates 95% accuracy in early disease detection using machine learning algorithms.',
      category: 'Health',
    },
    {
      id: 3,
      title: 'Electric Vehicle Sales Surge Globally',
      source: 'Auto World',
      time: '6 hours ago',
      summary: 'EV market share reaches 15% of total vehicle sales, marking historic milestone in automotive industry.',
      category: 'Business',
    },
    {
      id: 4,
      title: 'Space Tourism Company Announces New Missions',
      source: 'Space News',
      time: '8 hours ago',
      summary: 'Private space company reveals plans for lunar orbit missions starting next year.',
      category: 'Space',
    },
    {
      id: 5,
      title: 'Renewable Energy Costs Hit Record Low',
      source: 'Energy Report',
      time: '10 hours ago',
      summary: 'Solar and wind power now cheaper than fossil fuels in most markets worldwide.',
      category: 'Environment',
    },
    {
      id: 6,
      title: 'New Programming Language Gains Popularity',
      source: 'Dev Weekly',
      time: '12 hours ago',
      summary: 'Modern language designed for AI applications sees rapid adoption among developers.',
      category: 'Technology',
    },
    {
      id: 7,
      title: 'Climate Summit Reaches Landmark Agreement',
      source: 'World News',
      time: '14 hours ago',
      summary: 'Nations commit to aggressive carbon reduction targets in historic climate accord.',
      category: 'Environment',
    },
    {
      id: 8,
      title: 'Breakthrough in Battery Technology',
      source: 'Science Daily',
      time: '16 hours ago',
      summary: 'New solid-state battery design promises 500-mile range for electric vehicles.',
      category: 'Technology',
    },
  ],
};

/**
 * Get weather data
 * @returns {Object} Weather data
 */
export const getWeatherData = () => {
  return weatherData;
};

/**
 * Get calendar events
 * @returns {Object} Calendar data
 */
export const getCalendarData = () => {
  return calendarData;
};

/**
 * Get news headlines
 * @returns {Object} News data
 */
export const getNewsData = () => {
  return newsData;
};
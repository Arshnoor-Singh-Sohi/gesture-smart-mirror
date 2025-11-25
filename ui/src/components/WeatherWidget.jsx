import { useState, useEffect } from 'react';
import dataService from '../services/dataService';

const WeatherWidget = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState('current'); // 'current', 'forecast', 'detail'
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchWeather = async () => {
        try {
            const data = await dataService.getWeatherData();
            setWeatherData(data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    // Gesture handlers
    useEffect(() => {
        window.weatherPinch = () => {
            if (screen === 'current') {
                setSelectedDayIndex(0);  // Reset selection
                setScreen('forecast');
            } else if (screen === 'forecast') {
                setScreen('detail');
            }
        };

        window.weatherSwipeUp = () => {
            if (screen === 'forecast') {
                setSelectedDayIndex(prev => Math.max(0, prev - 1));
            }
        };

        window.weatherSwipeDown = () => {
            console.log('weatherSwipeDown called, current index:', selectedDayIndex);
            if (screen === 'forecast' && weatherData) {
                setSelectedDayIndex(prev => {
                console.log('Updating from', prev, 'to', prev + 1);
                return Math.min(weatherData.forecast.length - 1, prev + 1);
                });
            }
        };

        window.weatherClosedFist = () => {
            setScreen('current');
            setSelectedDayIndex(0);
        };

        return () => {
            delete window.weatherPinch;
            delete window.weatherSwipeUp;
            delete window.weatherSwipeDown;
            delete window.weatherClosedFist;
        };
    }, [screen, selectedDayIndex, weatherData]);

    if (loading) {
        return (
            <div className="weather-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading weather data...</p>
                </div>
            </div>
        );
    }

    if (!weatherData) {
        return (
            <div className="weather-container">
                <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p>Weather data unavailable</p>
                </div>
            </div>
        );
    }

    const condition = weatherData.current.condition.toLowerCase();
    const selectedDay = weatherData.forecast[selectedDayIndex];

    return (
        <div className={`weather-container weather-${condition.includes('rain') ? 'rain' : condition.includes('cloud') ? 'cloudy' : condition.includes('snow') ? 'snow' : 'clear'}`}>
            {/* Animated Weather Background */}
            <WeatherBackground condition={condition} />

            {/* Gesture Guide - Always visible */}
            <GestureGuide screen={screen} />

            {/* Main Content */}
            {screen === 'current' && (
                <CurrentWeatherScreen weatherData={weatherData} />
            )}

            {screen === 'forecast' && (
                <ForecastScreen
                    forecast={weatherData.forecast}
                    selectedIndex={selectedDayIndex}
                />
            )}

            {screen === 'detail' && selectedDay && (
                <DayDetailScreen day={selectedDay} />
            )}
        </div>
    );
};

// Animated Weather Background Component
const WeatherBackground = ({ condition }) => {
    if (condition.includes('rain')) {
        return (
            <div className="weather-bg rain-bg">
                <div className="rain">
                    {[...Array(50)].map((_, i) => (
                        <div key={i} className="raindrop" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${0.5 + Math.random() * 0.5}s`
                        }} />
                    ))}
                </div>
            </div>
        );
    }

    if (condition.includes('snow')) {
        return (
            <div className="weather-bg snow-bg">
                <div className="snow">
                    {[...Array(50)].map((_, i) => (
                        <div key={i} className="snowflake" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}>❄</div>
                    ))}
                </div>
            </div>
        );
    }

    if (condition.includes('cloud')) {
        return (
            <div className="weather-bg cloudy-bg">
                <div className="clouds">
                    <div className="cloud cloud-1"></div>
                    <div className="cloud cloud-2"></div>
                    <div className="cloud cloud-3"></div>
                </div>
            </div>
        );
    }

    // Clear/Sunny
    return (
        <div className="weather-bg sunny-bg">
            <div className="sun">
                <div className="sun-rays"></div>
            </div>
        </div>
    );
};

// Gesture Guide Component
// Gesture Guide Component
const GestureGuide = ({ screen }) => {
    const guides = {
        current: [
            { icon: '🤏', text: 'Pinch: View Forecast' }
        ],
        forecast: [
            { icon: '👆', text: 'Swipe Up: Previous Day' },
            { icon: '👇', text: 'Swipe Down: Next Day' },
            { icon: '🤏', text: 'Pinch: View Details' },
            { icon: '✊', text: 'Closed Fist: Back' }
        ],
        detail: [
            { icon: '✊', text: 'Closed Fist: Back to Main' }
        ]
    };

    return (
        <div className="gesture-guide">
            {guides[screen]?.map((guide, i) => (
                <div key={i} className="gesture-item">
                    <span className="gesture-icon">{guide.icon}</span>
                    <span className="gesture-text">{guide.text}</span>
                </div>
            ))}
        </div>
    );
};
// Current Weather Screen
const CurrentWeatherScreen = ({ weatherData }) => {
    const { current, location } = weatherData;

    // Mock additional data
    const feelsLike = Math.round(current.temperature - 2);
    const todayHigh = Math.round(current.temperature + 5);
    const todayLow = Math.round(current.temperature - 8);
    const precipitation = 20;
    const uvIndex = 6;
    const pressure = 1013;
    const visibility = 10;
    const windDirection = 'NW';
    const airQuality = 'Good';
    const sunrise = '6:45 AM';
    const sunset = '5:30 PM';

    return (
        <div className="current-screen">
            <div className="weather-header">
                <h1>{location}</h1>
                <p className="date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="main-temp">
                <div className="temp-display">
                    <span className="temp-icon">{current.icon}</span>
                    <span className="temp-value">{current.temperature}°</span>
                </div>
                <div className="temp-details">
                    <p className="condition">{current.condition}</p>
                    <p className="feels-like">Feels like {feelsLike}°</p>
                    <p className="high-low">H: {todayHigh}° L: {todayLow}°</p>
                </div>
            </div>

            <div className="weather-grid">
                <div className="weather-card">
                    <span className="card-icon">💧</span>
                    <span className="card-label">Humidity</span>
                    <span className="card-value">{current.humidity}%</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">🌬️</span>
                    <span className="card-label">Wind</span>
                    <span className="card-value">{current.windSpeed} {current.windUnit}</span>
                    <span className="card-sub">{windDirection}</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">🌧️</span>
                    <span className="card-label">Precipitation</span>
                    <span className="card-value">{precipitation}%</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">☀️</span>
                    <span className="card-label">UV Index</span>
                    <span className="card-value">{uvIndex}</span>
                    <span className="card-sub">Moderate</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">🧭</span>
                    <span className="card-label">Pressure</span>
                    <span className="card-value">{pressure}</span>
                    <span className="card-sub">mb</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">👁️</span>
                    <span className="card-label">Visibility</span>
                    <span className="card-value">{visibility}</span>
                    <span className="card-sub">km</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">🌅</span>
                    <span className="card-label">Sunrise</span>
                    <span className="card-value">{sunrise}</span>
                </div>

                <div className="weather-card">
                    <span className="card-icon">🌇</span>
                    <span className="card-label">Sunset</span>
                    <span className="card-value">{sunset}</span>
                </div>

                <div className="weather-card full-width">
                    <span className="card-icon">🍃</span>
                    <span className="card-label">Air Quality</span>
                    <span className="card-value">{airQuality}</span>
                </div>
            </div>
        </div>
    );
};

// Forecast Screen
const ForecastScreen = ({ forecast, selectedIndex }) => {
    return (
        <div className="forecast-screen">
            <h2>7-Day Forecast</h2>
            <div className="forecast-list">
                {forecast.map((day, index) => (
                    <div
                        key={index}
                        className={`forecast-item ${index === selectedIndex ? 'selected' : ''}`}
                    >
                        {index === selectedIndex && <div className="selection-indicator">👉</div>}
                        <span className="day-name">{day.day}</span>
                        <span className="day-icon">{day.icon}</span>
                        <span className="day-condition">{day.condition}</span>
                        <div className="day-temps">
                            <span className="temp-high">{day.high}°</span>
                            <span className="temp-separator">/</span>
                            <span className="temp-low">{day.low}°</span>
                        </div>
                    </div>
                ))}
            </div>
            <p className="selection-hint">Use 🤏 Pinch to view details</p>
        </div>
    );
};

// Day Detail Screen
const DayDetailScreen = ({ day }) => {
    return (
        <div className="detail-screen">
            <h2>{day.day}</h2>
            <div className="detail-main">
                <span className="detail-icon">{day.icon}</span>
                <p className="detail-condition">{day.condition}</p>
                <div className="detail-temps">
                    <div className="temp-item">
                        <span className="temp-label">High</span>
                        <span className="temp-value-large">{day.high}°</span>
                    </div>
                    <div className="temp-item">
                        <span className="temp-label">Low</span>
                        <span className="temp-value-large">{day.low}°</span>
                    </div>
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-card">
                    <span>💧 Humidity</span>
                    <strong>65%</strong>
                </div>
                <div className="detail-card">
                    <span>🌬️ Wind</span>
                    <strong>12 mph</strong>
                </div>
                <div className="detail-card">
                    <span>🌧️ Rain</span>
                    <strong>30%</strong>
                </div>
                <div className="detail-card">
                    <span>☀️ UV</span>
                    <strong>5</strong>
                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
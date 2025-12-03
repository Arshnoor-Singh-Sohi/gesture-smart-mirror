import { useState, useEffect, useRef } from 'react';
import dataService from '../services/dataService';

const WeatherWidget = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState('current'); // 'current', 'forecast', 'detail'
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 10 * 60 * 1000);
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        
        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, []);

    useEffect(() => {
        if (weatherData && canvasRef.current) {
            initParticles();
            animateParticles();
        }
    }, [weatherData, screen]);

    const fetchWeather = async () => {
        try {
            const data = await dataService.getWeatherData();
            setWeatherData(data);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    // Particle system for weather effects
    const initParticles = () => {
        if (!canvasRef.current || !weatherData) return;
        
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const condition = weatherData.current.condition.toLowerCase();
        const count = condition.includes('rain') ? 150 : 
                     condition.includes('snow') ? 100 : 
                     condition.includes('cloud') ? 50 : 30;
        
        particlesRef.current = [];
        
        for (let i = 0; i < count; i++) {
            particlesRef.current.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: condition.includes('rain') ? Math.random() * 2 + 1 : 
                       condition.includes('snow') ? Math.random() * 4 + 2 : 
                       Math.random() * 3 + 1,
                speedY: condition.includes('rain') ? Math.random() * 8 + 5 : 
                       condition.includes('snow') ? Math.random() * 2 + 0.5 : 
                       Math.random() * 0.5 + 0.2,
                speedX: condition.includes('snow') ? (Math.random() - 0.5) * 2 : 
                       (Math.random() - 0.5) * 1,
                opacity: Math.random() * 0.6 + 0.2
            });
        }
    };

    const animateParticles = () => {
        if (!canvasRef.current || !weatherData) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const condition = weatherData.current.condition.toLowerCase();
        
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particlesRef.current.forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                
                if (condition.includes('rain')) {
                    ctx.fillStyle = `rgba(173, 216, 230, ${particle.opacity})`;
                } else if (condition.includes('snow')) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
                } else {
                    ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.5})`;
                }
                
                ctx.fill();
                
                particle.y += particle.speedY;
                particle.x += particle.speedX;
                
                if (particle.y > canvas.height) {
                    particle.y = -10;
                    particle.x = Math.random() * canvas.width;
                }
                
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.x < 0) particle.x = canvas.width;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    };

    // Gesture handlers
    useEffect(() => {
        window.weatherPinch = () => {
            if (screen === 'current') {
                setSelectedDayIndex(0);
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
            if (screen === 'forecast' && weatherData) {
                setSelectedDayIndex(prev => Math.min(weatherData.forecast.length - 1, prev + 1));
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
            <div className="weather-widget">
                <div className="weather-loading">
                    <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring spinner-ring-2"></div>
                        <div className="spinner-ring spinner-ring-3"></div>
                    </div>
                    <p className="loading-text">Fetching weather data...</p>
                </div>
            </div>
        );
    }

    if (!weatherData) {
        return (
            <div className="weather-widget">
                <div className="weather-error">
                    <span className="error-icon">⚠️</span>
                    <p>Weather data unavailable</p>
                </div>
            </div>
        );
    }

    const condition = weatherData.current.condition.toLowerCase();
    const selectedDay = weatherData.forecast[selectedDayIndex];
    const currentTimeString = currentTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit'
    });

    const getWeatherBackground = () => {
        if (condition.includes('rain')) return 'weather-bg-rain';
        if (condition.includes('snow')) return 'weather-bg-snow';
        if (condition.includes('cloud')) return 'weather-bg-cloudy';
        return 'weather-bg-clear';
    };

    return (
        <div className={`weather-widget ${getWeatherBackground()}`}>
            {/* Particle Canvas */}
            <canvas ref={canvasRef} className="weather-particles"></canvas>

            {/* Animated Background Elements */}
            <div className="weather-background-elements">
                {condition.includes('clear') && (
                    <div className="sun-element">
                        <div className="sun-core"></div>
                        <div className="sun-rays"></div>
                    </div>
                )}
                {condition.includes('cloud') && (
                    <>
                        <div className="cloud cloud-1"></div>
                        <div className="cloud cloud-2"></div>
                        <div className="cloud cloud-3"></div>
                    </>
                )}
            </div>

            {/* Gesture Guide */}
            <div className="weather-gesture-guide">
                {screen === 'current' && (
                    <div className="gesture-hint">
                        <span className="gesture-icon">🤏</span>
                        <span>Pinch for 7-day forecast</span>
                    </div>
                )}
                {screen === 'forecast' && (
                    <>
                        <div className="gesture-hint">
                            <span className="gesture-icon">👆</span>
                            <span>Previous</span>
                        </div>
                        <div className="gesture-hint">
                            <span className="gesture-icon">👇</span>
                            <span>Next</span>
                        </div>
                        <div className="gesture-hint">
                            <span className="gesture-icon">🤏</span>
                            <span>Details</span>
                        </div>
                        <div className="gesture-hint">
                            <span className="gesture-icon">✊</span>
                            <span>Back</span>
                        </div>
                    </>
                )}
                {screen === 'detail' && (
                    <div className="gesture-hint">
                        <span className="gesture-icon">✊</span>
                        <span>Back to main</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            {screen === 'current' && (
                <CurrentWeatherScreen 
                    weatherData={weatherData} 
                    currentTime={currentTimeString}
                />
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

// Current Weather Screen Component
const CurrentWeatherScreen = ({ weatherData, currentTime }) => {
    const { current, location } = weatherData;

    return (
        <div className="current-weather-screen">
            {/* Header */}
            <div className="weather-header-modern">
                <div className="header-location">
                    <span className="location-icon">📍</span>
                    <h1>{location}</h1>
                </div>
                <div className="header-time">
                    <div className="time-display">{currentTime}</div>
                    <div className="date-display">
                        {new Date().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </div>
                </div>
            </div>

            {/* Main Temperature Display */}
            <div className="temp-hero">
                <div className="temp-icon-large">
                    {current.icon}
                </div>
                <div className="temp-main">
                    <div className="temp-value">{current.temperature}°</div>
                    <div className="temp-unit">{current.tempUnit === '°F' ? 'Fahrenheit' : 'Celsius'}</div>
                </div>
                <div className="temp-condition">
                    <div className="condition-text">{current.condition}</div>
                    <div className="feels-like">Feels like {current.temperature - 2}°</div>
                </div>
            </div>

            {/* Weather Stats Grid */}
            <div className="weather-stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">💧</div>
                    <div className="stat-content">
                        <div className="stat-label">Humidity</div>
                        <div className="stat-value">{current.humidity}%</div>
                    </div>
                    <div className="stat-bar">
                        <div 
                            className="stat-bar-fill" 
                            style={{ width: `${current.humidity}%` }}
                        ></div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🌬️</div>
                    <div className="stat-content">
                        <div className="stat-label">Wind Speed</div>
                        <div className="stat-value">{current.windSpeed} {current.windUnit}</div>
                    </div>
                    <div className="stat-direction">Northwest</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🌡️</div>
                    <div className="stat-content">
                        <div className="stat-label">Pressure</div>
                        <div className="stat-value">1013 mb</div>
                    </div>
                    <div className="stat-trend">↑ Rising</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">☀️</div>
                    <div className="stat-content">
                        <div className="stat-label">UV Index</div>
                        <div className="stat-value">6</div>
                    </div>
                    <div className="stat-warning">Moderate</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">👁️</div>
                    <div className="stat-content">
                        <div className="stat-label">Visibility</div>
                        <div className="stat-value">10 km</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🌅</div>
                    <div className="stat-content">
                        <div className="stat-label">Sunrise</div>
                        <div className="stat-value">6:45 AM</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🌇</div>
                    <div className="stat-content">
                        <div className="stat-label">Sunset</div>
                        <div className="stat-value">5:30 PM</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🍃</div>
                    <div className="stat-content">
                        <div className="stat-label">Air Quality</div>
                        <div className="stat-value">Good</div>
                    </div>
                    <div className="aqi-indicator aqi-good"></div>
                </div>
            </div>
        </div>
    );
};

// Forecast Screen Component
const ForecastScreen = ({ forecast, selectedIndex }) => {
    return (
        <div className="forecast-screen-modern">
            <h2 className="forecast-title">7-Day Forecast</h2>
            
            <div className="forecast-list-vertical">
                {forecast.map((day, index) => {
                    const isSelected = index === selectedIndex;
                    
                    return (
                        <div
                            key={index}
                            className={`forecast-card-vertical ${isSelected ? 'selected' : ''}`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {isSelected && (
                                <div className="selection-pulse"></div>
                            )}
                            
                            {isSelected && (
                                <div className="selection-arrow-left">→</div>
                            )}
                            
                            <div className="forecast-day-name">{day.day}</div>
                            <div className="forecast-icon-medium">{day.icon}</div>
                            <div className="forecast-condition-text">{day.condition}</div>
                            
                            <div className="forecast-temps-row">
                                <div className="temp-high">
                                    <span className="temp-label">H</span>
                                    <span className="temp-number">{day.high}°</span>
                                </div>
                                <div className="temp-divider-vertical"></div>
                                <div className="temp-low">
                                    <span className="temp-label">L</span>
                                    <span className="temp-number">{day.low}°</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="forecast-hint">
                <span>👆 Swipe Up: Previous</span>
                <span>•</span>
                <span>👇 Swipe Down: Next</span>
                <span>•</span>
                <span>🤏 Pinch: View Details</span>
            </div>
        </div>
    );
};

// Day Detail Screen Component
const DayDetailScreen = ({ day }) => {
    return (
        <div className="detail-screen-modern">
            <div className="detail-header">
                <h2 className="detail-day">{day.day}</h2>
                <div className="detail-icon-massive">{day.icon}</div>
            </div>

            <div className="detail-temp-display">
                <div className="detail-condition">{day.condition}</div>
                <div className="detail-temp-range">
                    <div className="detail-temp-item">
                        <span className="detail-temp-label">High</span>
                        <span className="detail-temp-value">{day.high}°</span>
                    </div>
                    <div className="temp-range-bar">
                        <div className="temp-range-fill"></div>
                    </div>
                    <div className="detail-temp-item">
                        <span className="detail-temp-label">Low</span>
                        <span className="detail-temp-value">{day.low}°</span>
                    </div>
                </div>
            </div>

            <div className="detail-stats">
                <div className="detail-stat-card">
                    <span className="detail-stat-icon">💧</span>
                    <div className="detail-stat-info">
                        <span className="detail-stat-label">Humidity</span>
                        <span className="detail-stat-value">65%</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <span className="detail-stat-icon">🌬️</span>
                    <div className="detail-stat-info">
                        <span className="detail-stat-label">Wind</span>
                        <span className="detail-stat-value">12 mph</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <span className="detail-stat-icon">🌧️</span>
                    <div className="detail-stat-info">
                        <span className="detail-stat-label">Precipitation</span>
                        <span className="detail-stat-value">30%</span>
                    </div>
                </div>

                <div className="detail-stat-card">
                    <span className="detail-stat-icon">☀️</span>
                    <div className="detail-stat-info">
                        <span className="detail-stat-label">UV Index</span>
                        <span className="detail-stat-value">5</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
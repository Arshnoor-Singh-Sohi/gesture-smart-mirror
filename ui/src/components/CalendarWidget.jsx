import { useState, useEffect, useRef } from 'react';
import dataService from '../services/dataService';

const CalendarWidget = () => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const timelineRef = useRef(null);

  useEffect(() => {
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 5 * 60 * 1000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchCalendar = async () => {
    try {
      const data = await dataService.getCalendarData();
      setCalendarData(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const scrollUp = () => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  };

  const scrollDown = () => {
    if (calendarData && calendarData.events) {
      setSelectedIndex(prev => Math.min(calendarData.events.length - 1, prev + 1));
    }
  };

  const selectItem = () => {
    setShowDetail(!showDetail);
  };

  useEffect(() => {
    window.calendarScrollUp = scrollUp;
    window.calendarScrollDown = scrollDown;
    window.calendarSelectItem = selectItem;
  }, [calendarData, selectedIndex, showDetail]);

  // Auto-scroll selected event into view
  useEffect(() => {
    if (timelineRef.current && !showDetail) {
      const selectedElement = timelineRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIndex, showDetail]);

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="loading-pulse">
          <div className="pulse-ring"></div>
          <div className="pulse-ring pulse-ring-delay-1"></div>
          <div className="pulse-ring pulse-ring-delay-2"></div>
          <div className="loading-text">Loading your schedule...</div>
        </div>
      </div>
    );
  }

  if (!calendarData || !calendarData.events || calendarData.events.length === 0) {
    return (
      <div className="calendar-container">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-text">Your calendar is clear</div>
          <div className="empty-subtext">No events scheduled for today</div>
        </div>
      </div>
    );
  }

  const selectedEvent = calendarData.events[selectedIndex];
  const currentTimeString = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });

  const getTimeZone = (time) => {
    const hour = parseInt(time.split(':')[0]);
    const isPM = time.includes('PM');
    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    
    if (hour24 >= 6 && hour24 < 12) return 'morning';
    if (hour24 >= 12 && hour24 < 18) return 'afternoon';
    return 'evening';
  };

  return (
    <div className="calendar-container">
      {/* Animated Background */}
      <div className="calendar-bg">
        <div className="calendar-gradient morning"></div>
        <div className="calendar-gradient afternoon"></div>
        <div className="calendar-gradient evening"></div>
      </div>

      {/* Header */}
      <div className="calendar-header">
        <div className="header-left">
          <h1 className="calendar-title">Today's Timeline</h1>
          <p className="calendar-date">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="header-right">
          <div className="live-clock">
            <div className="clock-time">{currentTimeString.split(' ')[0]}</div>
            <div className="clock-period">{currentTimeString.split(' ')[1]}</div>
          </div>
          <div className="event-count">
            {calendarData.events.length} event{calendarData.events.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!showDetail ? (
        <div className="timeline-container" ref={timelineRef}>
          <div className="timeline-track">
            {/* Time markers */}
            <div className="time-markers">
              {['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'].map((time, i) => (
                <div key={i} className="time-marker" style={{ top: `${i * 16.67}%` }}>
                  <span className="time-label">{time}</span>
                  <div className="time-line"></div>
                </div>
              ))}
            </div>

            {/* Current time indicator */}
            <div className="current-time-indicator" style={{ top: `${(currentTime.getHours() - 6) * 6.25}%` }}>
              <div className="time-pulse"></div>
              <div className="time-line-current"></div>
              <span className="time-label-current">NOW</span>
            </div>

            {/* Events */}
            <div className="events-list">
              {calendarData.events.map((event, index) => {
                const timeZone = getTimeZone(event.time);
                const isSelected = index === selectedIndex;
                
                return (
                  <div
                    key={event.id}
                    data-index={index}
                    className={`event-card ${timeZone} ${isSelected ? 'selected' : ''}`}
                    style={{
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    {isSelected && (
                      <div className="selection-glow" style={{ backgroundColor: event.color }}></div>
                    )}
                    
                    <div className="event-color-bar" style={{ backgroundColor: event.color }}></div>
                    
                    <div className="event-content">
                      <div className="event-time">
                        <span className="time-icon">🕐</span>
                        <span className="time-text">{event.time}</span>
                        <span className="duration-badge">{event.duration}</span>
                      </div>
                      
                      <h3 className="event-title">{event.title}</h3>
                      
                      <p className="event-description">{event.description}</p>
                    </div>

                    {isSelected && (
                      <div className="selection-indicator">
                        <div className="indicator-arrow">→</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="event-detail-view">
          <div className="detail-hero" style={{ 
            background: `linear-gradient(135deg, ${selectedEvent.color}33 0%, ${selectedEvent.color}11 100%)`
          }}>
            <div className="detail-time">
              <span className="detail-icon">🕐</span>
              <span className="detail-time-text">{selectedEvent.time}</span>
            </div>
            <h2 className="detail-title">{selectedEvent.title}</h2>
            <div className="detail-duration">
              <span className="duration-icon">⏱️</span>
              <span>{selectedEvent.duration}</span>
            </div>
          </div>

          <div className="detail-body">
            <div className="detail-section">
              <h4 className="section-label">Description</h4>
              <p className="section-content">{selectedEvent.description}</p>
            </div>

            <div className="detail-grid">
              <div className="detail-info-card">
                <div className="info-icon">📍</div>
                <div className="info-content">
                  <div className="info-label">Location</div>
                  <div className="info-value">Conference Room A</div>
                </div>
              </div>

              <div className="detail-info-card">
                <div className="info-icon">👥</div>
                <div className="info-content">
                  <div className="info-label">Attendees</div>
                  <div className="info-value">5 people</div>
                </div>
              </div>

              <div className="detail-info-card">
                <div className="info-icon">🔔</div>
                <div className="info-content">
                  <div className="info-label">Reminder</div>
                  <div className="info-value">15 min before</div>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-back-hint">
            <span className="hint-icon">✋</span>
            <span>Open palm to return to timeline</span>
          </div>
        </div>
      )}

      {/* Gesture Hints */}
      <div className="gesture-hints">
        {!showDetail ? (
          <>
            <div className="hint-item">
              <span className="hint-emoji">👆</span>
              <span className="hint-text">Previous</span>
            </div>
            <div className="hint-item">
              <span className="hint-emoji">👇</span>
              <span className="hint-text">Next</span>
            </div>
            <div className="hint-item">
              <span className="hint-emoji">✋</span>
              <span className="hint-text">View Details</span>
            </div>
          </>
        ) : (
          <div className="hint-item">
            <span className="hint-emoji">✋</span>
            <span className="hint-text">Back to Timeline</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarWidget;
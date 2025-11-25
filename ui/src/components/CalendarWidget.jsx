import { useState, useEffect } from 'react';
import dataService from '../services/dataService';

const CalendarWidget = () => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (!calendarData || !calendarData.events || calendarData.events.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl text-center">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-white/60 text-xl">No events scheduled</p>
          <p className="text-white/40 text-sm mt-2">Your calendar is clear for today</p>
        </div>
      </div>
    );
  }

  const selectedEvent = calendarData.events[selectedIndex];
  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full h-full p-6 relative overflow-hidden">
      <div className="glass-header mb-6 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Today's Schedule</h2>
            <p className="text-white/70 text-sm">
              {calendarData.events.length} event{calendarData.events.length !== 1 ? 's' : ''} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white mb-1">{currentTime}</div>
            <div className="text-xs text-white/50">Current time</div>
          </div>
        </div>
      </div>

      {!showDetail ? (
        <div className="space-y-3 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 200px)' }}>
          {calendarData.events.map((event, index) => (
            <div
              key={event.id}
              className={`glass-mini-card p-4 rounded-xl selectable-item ${
                index === selectedIndex ? 'selected' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-1 h-full rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                ></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-white font-semibold text-lg">
                      {event.title}
                    </h3>
                    <span className="text-white/60 text-sm whitespace-nowrap">
                      {event.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <span className="flex items-center gap-1">
                      <span>⏱️</span>
                      {event.duration}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-6 rounded-3xl" style={{ height: 'calc(100% - 200px)' }}>
          <div 
            className="w-2 h-16 rounded-full mb-4"
            style={{ backgroundColor: selectedEvent.color }}
          ></div>
          
          <h2 className="text-3xl font-bold text-white mb-6">
            {selectedEvent.title}
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-white/80">
              <span className="text-2xl">🕒</span>
              <div>
                <div className="text-sm text-white/60">Time</div>
                <div className="text-lg font-semibold">{selectedEvent.time}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-white/80">
              <span className="text-2xl">⏱️</span>
              <div>
                <div className="text-sm text-white/60">Duration</div>
                <div className="text-lg font-semibold">{selectedEvent.duration}</div>
              </div>
            </div>
          </div>

          <div className="glass-mini-card p-4 rounded-xl">
            <div className="text-sm text-white/60 mb-2">Description</div>
            <p className="text-white/90 text-base leading-relaxed">
              {selectedEvent.description}
            </p>
          </div>
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
            {showDetail ? 'Back to list' : 'View details'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
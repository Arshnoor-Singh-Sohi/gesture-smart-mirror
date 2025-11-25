import { useState, useEffect, useRef } from 'react';
import WeatherWidget from './WeatherWidget';
import NewsWidget from './NewsWidget';
import CalendarWidget from './CalendarWidget';
import GestureTutorial from './GestureTutorial';
import HandCursor from './HandCursor';

const App = () => {
    const [currentWidget, setCurrentWidget] = useState(0);
    const [gesture, setGesture] = useState('NONE');
    const [isConnected, setIsConnected] = useState(false);
    const [debugOverlayVisible, setDebugOverlayVisible] = useState(false);
    const [showTutorial, setShowTutorial] = useState(true);
    const [landmarks, setLandmarks] = useState([]);

    const wsRef = useRef(null);
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8765/ws';

    const widgets = [
        { name: 'Weather', component: WeatherWidget },
        { name: 'News', component: NewsWidget },
        { name: 'Calendar', component: CalendarWidget },
    ];

    useEffect(() => {
        connectWebSocket();
        setupKeyboardControls();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const connectWebSocket = () => {
        try {
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setIsConnected(true);
                ws.send(JSON.stringify({
                    type: 'config',
                    camera_index: 0,
                    flip_camera: false,
                    mirror_mode: true
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'gesture') {
                        handleGesture(data.gesture);
                        if (data.landmarks) {
                            setLandmarks(data.landmarks);
                        }
                    }
                } catch (err) {
                    // Silently fail
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = () => {
                setIsConnected(false);
            };

            wsRef.current = ws;
        } catch (error) {
            setTimeout(connectWebSocket, 3000);
        }
    };

    const handleGesture = (detectedGesture) => {
        setGesture(detectedGesture);

        setTimeout(() => {
            setGesture('NONE');
        }, 1000);

        switch (detectedGesture) {
            case 'SWIPE_LEFT':
                navigateWidget('prev');
                break;
            case 'SWIPE_RIGHT':
                navigateWidget('next');
                break;
            case 'SWIPE_UP':
                handleSwipeUp();
                break;
            case 'SWIPE_DOWN':
                handleSwipeDown();
                break;
            case 'OPEN_PALM':
                handleOpenPalm();
                break;
            case 'CLOSED_FIST':
                const widgetName = widgets[currentWidget].name;
                if (widgetName === 'Weather' && window.weatherClosedFist) {
                    window.weatherClosedFist();
                } else {
                    setDebugOverlayVisible(prev => !prev);
                }
                break;
            case 'PINCH_START':
                handlePinch();
                break;
            default:
                break;
        }
    };

    const navigateWidget = (direction) => {
        if (direction === 'prev') {
            setCurrentWidget((prev) => (prev === 0 ? widgets.length - 1 : prev - 1));
        } else {
            setCurrentWidget((prev) => (prev === widgets.length - 1 ? 0 : prev + 1));
        }
    };

    const handleSwipeUp = () => {
        const widgetName = widgets[currentWidget].name;
        if (widgetName === 'Weather' && window.weatherSwipeUp) {
            window.weatherSwipeUp();
        } else if (widgetName === 'News' && window.newsScrollUp) {
            window.newsScrollUp();
        } else if (widgetName === 'Calendar' && window.calendarScrollUp) {
            window.calendarScrollUp();
        }
    };

    const handleSwipeDown = () => {
        const widgetName = widgets[currentWidget].name;
        if (widgetName === 'Weather' && window.weatherSwipeDown) {
            window.weatherSwipeDown();
        } else if (widgetName === 'News' && window.newsScrollDown) {
            window.newsScrollDown();
        } else if (widgetName === 'Calendar' && window.calendarScrollDown) {
            window.calendarScrollDown();
        }
    };

    const handleOpenPalm = () => {
        const widgetName = widgets[currentWidget].name;
        if (widgetName === 'Weather' && window.weatherToggleView) {
            window.weatherToggleView();
        } else if (widgetName === 'News' && window.newsSelectItem) {
            window.newsSelectItem();
        } else if (widgetName === 'Calendar' && window.calendarSelectItem) {
            window.calendarSelectItem();
        }
    };

    const handlePinch = () => {
        const widgetName = widgets[currentWidget].name;
        if (widgetName === 'Weather' && window.weatherPinch) {
            window.weatherPinch();
        }
    };

    const setupKeyboardControls = () => {
        const handleKeyPress = (e) => {
            switch (e.key.toLowerCase()) {
                case 'arrowleft':
                    navigateWidget('prev');
                    break;
                case 'arrowright':
                    navigateWidget('next');
                    break;
                case 'arrowup':
                    handleSwipeUp();
                    break;
                case 'arrowdown':
                    handleSwipeDown();
                    break;
                case 'enter':
                case ' ':
                    handleOpenPalm();
                    break;
                case 'd':
                    setDebugOverlayVisible(prev => !prev);
                    break;
                case 'h':
                    setShowTutorial(true);
                    break;
                case 'c':
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'clear_gesture_history' }));
                    }
                    break;
                case 'p':
                    handlePinch();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    };

    const CurrentWidgetComponent = widgets[currentWidget].component;

    return (
        <div className="w-screen h-screen relative">
            <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className="status-dot"></div>
                {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            <button
                className="help-button"
                onClick={() => setShowTutorial(true)}
                title="Show gesture guide (H)"
            >
                ❓
            </button>

            <div className="w-full h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                    <CurrentWidgetComponent />
                </div>

                {/* <div className="glass-card p-4 m-6 rounded-2xl">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {widgets.map((widget, index) => (
                            <div
                                key={index}
                                className={`widget-indicator ${index === currentWidget ? 'active' : ''}`}
                                style={{ width: index === currentWidget ? '40px' : '24px' }}
                            />
                        ))}
                    </div>
                    <div className="text-center">
                        <p className="text-white font-semibold text-lg mb-1">
                            {widgets[currentWidget].name}
                        </p>
                        <p className="text-white/60 text-sm">
                            {currentWidget + 1} of {widgets.length}
                        </p>
                    </div>
                </div> */}
                {/* Remove 'glass-card' and add 'bg-transparent' */}
                <div className="p-2 m-3">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {widgets.map((widget, index) => (
                            <div
                                key={index}
                                className={`widget-indicator ${index === currentWidget ? 'active' : ''}`}
                                style={{ width: index === currentWidget ? '40px' : '24px' }}
                            />
                        ))}
                    </div>
                    <div className="text-center">
                        <p className="text-white font-semibold text-lg mb-1">
                            {widgets[currentWidget].name}
                        </p>
                        <p className="text-white/60 text-sm">
                            {currentWidget + 1} of {widgets.length}
                        </p>
                    </div>
                </div>
            </div>

            {isConnected && <HandCursor gesture={gesture} landmarks={landmarks} />}

            {showTutorial && <GestureTutorial onClose={() => setShowTutorial(false)} />}

            {debugOverlayVisible && (
                <div className="fixed top-20 left-6 glass-card p-4 rounded-2xl max-w-xs z-50">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                        <span>🐛</span> Debug Info
                    </h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-white/60">Status:</span>
                            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Widget:</span>
                            <span className="text-white">{widgets[currentWidget].name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Gesture:</span>
                            <span className="text-white">{gesture}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white/60">Landmarks:</span>
                            <span className="text-white">{landmarks.length}</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-white/60 text-xs">
                            Keyboard: ← → ↑ ↓ Enter/Space • D: Debug • H: Help
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
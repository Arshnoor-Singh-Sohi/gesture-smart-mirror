/**
 * GestureDebugOverlay Component
 * Developer overlay showing detected gestures and system stats
 */

import { useState, useEffect } from 'react';

const GestureDebugOverlay = ({ 
  lastGesture, 
  gestureHistory, 
  connectionStatus,
  visible 
}) => {
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);

  // Calculate FPS from gesture timestamps
  useEffect(() => {
    if (gestureHistory.length >= 2) {
      const recent = gestureHistory.slice(0, 10);
      const timeSpan = recent[0].receivedAt - recent[recent.length - 1].receivedAt;
      const calculatedFps = (recent.length / timeSpan) * 1000;
      setFps(Math.min(calculatedFps, 60)); // Cap at 60 FPS
    }
  }, [gestureHistory]);

  // Calculate latency (mock - would need server timestamp)
  useEffect(() => {
    if (lastGesture && lastGesture.timestamp) {
      const clientTime = lastGesture.receivedAt;
      const serverTime = lastGesture.timestamp;
      const calculatedLatency = clientTime - serverTime;
      setLatency(Math.abs(calculatedLatency));
    }
  }, [lastGesture]);

  if (!visible) {
    return null;
  }

  // Connection status styling
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Gesture type color coding
  const getGestureColor = (gesture) => {
    const colors = {
      'OPEN_PALM': 'text-green-400',
      'CLOSED_FIST': 'text-red-400',
      'PINCH_START': 'text-purple-400',
      'PINCH_HOLD': 'text-purple-300',
      'PINCH_END': 'text-purple-500',
      'SWIPE_LEFT': 'text-blue-400',
      'SWIPE_RIGHT': 'text-cyan-400',
      'PUSH_FORWARD': 'text-yellow-400',
    };
    return colors[gesture] || 'text-gray-400';
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-50">
      {/* Top Bar - Connection and Stats */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        {/* Left Side - Connection Status */}
        <div className="bg-black bg-opacity-80 rounded-lg p-4 backdrop-blur-sm pointer-events-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-white font-semibold uppercase text-sm">
              {connectionStatus}
            </span>
          </div>
          <div className="text-gray-300 text-xs space-y-1">
            <div>WebSocket: ws://localhost:8765/ws</div>
          </div>
        </div>

        {/* Right Side - Performance Stats */}
        <div className="bg-black bg-opacity-80 rounded-lg p-4 backdrop-blur-sm pointer-events-auto">
          <div className="text-gray-300 text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <span>FPS:</span>
              <span className="font-mono font-bold text-green-400">
                {fps.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Latency:</span>
              <span className="font-mono font-bold text-blue-400">
                {latency.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Gestures:</span>
              <span className="font-mono font-bold text-purple-400">
                {gestureHistory.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Last Gesture Display */}
      {lastGesture && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-black bg-opacity-90 rounded-2xl p-8 backdrop-blur-sm pointer-events-auto animate-fade-in">
            <div className="text-center">
              <div className={`text-6xl font-bold mb-3 ${getGestureColor(lastGesture.gesture)}`}>
                {lastGesture.gesture}
              </div>
              <div className="text-gray-400 text-sm space-y-1">
                <div>
                  Confidence: 
                  <span className="ml-2 font-mono text-white">
                    {(lastGesture.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  Hand: 
                  <span className="ml-2 font-mono text-white">
                    {lastGesture.hand_id}
                  </span>
                </div>
                {lastGesture.metadata && Object.keys(lastGesture.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-500">Metadata:</div>
                    <pre className="text-xs text-left mt-1 text-gray-400">
                      {JSON.stringify(lastGesture.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom - Gesture History */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-black bg-opacity-80 rounded-lg p-4 backdrop-blur-sm pointer-events-auto">
          <div className="text-white text-sm font-semibold mb-3">
            Gesture History (last 10)
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {gestureHistory.slice(0, 10).map((gesture, index) => (
              <div 
                key={index}
                className="flex items-center justify-between text-xs py-1 border-b border-gray-800 last:border-0"
              >
                <span className={`font-mono ${getGestureColor(gesture.gesture)}`}>
                  {gesture.gesture}
                </span>
                <span className="text-gray-400">
                  Hand {gesture.hand_id}
                </span>
                <span className="text-gray-500">
                  {(gesture.confidence * 100).toFixed(0)}%
                </span>
                <span className="text-gray-600 font-mono">
                  {new Date(gesture.receivedAt).toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Right - Gesture Legend */}
      <div className="absolute top-4 right-4 mt-24">
        <div className="bg-black bg-opacity-80 rounded-lg p-4 backdrop-blur-sm pointer-events-auto">
          <div className="text-white text-xs font-semibold mb-2">
            Gesture Guide
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-green-400">OPEN_PALM</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Select/Toggle</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">CLOSED_FIST</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Confirm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">SWIPE_LEFT</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Previous</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">SWIPE_RIGHT</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Next</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">PINCH</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">PUSH</span>
              <span className="text-gray-500">→</span>
              <span className="text-gray-400">Push</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureDebugOverlay;
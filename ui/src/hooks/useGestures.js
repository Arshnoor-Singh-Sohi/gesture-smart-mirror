/**
 * useGestures hook
 * Manages gesture state and history
 */

import { useState, useCallback, useRef } from 'react';

const MAX_GESTURE_HISTORY = 10;

/**
 * Custom hook for gesture state management
 * @returns {Object} Gesture state and control functions
 */
export const useGestures = () => {
  const [lastGesture, setLastGesture] = useState(null);
  const [gestureHistory, setGestureHistory] = useState([]);
  const lastGestureTime = useRef(0);

  /**
   * Add a new gesture to state
   * @param {Object} gesture - Gesture data
   */
  const addGesture = useCallback((gesture) => {
    const now = Date.now();
    
    // Prevent duplicate gestures within 100ms
    if (now - lastGestureTime.current < 100 && 
        lastGesture && 
        lastGesture.gesture === gesture.gesture) {
      return;
    }
    
    lastGestureTime.current = now;
    
    const gestureWithTimestamp = {
      ...gesture,
      receivedAt: now,
    };
    
    setLastGesture(gestureWithTimestamp);
    
    setGestureHistory((prev) => {
      const newHistory = [gestureWithTimestamp, ...prev];
      return newHistory.slice(0, MAX_GESTURE_HISTORY);
    });
  }, [lastGesture]);

  /**
   * Clear all gesture state
   */
  const clearGestures = useCallback(() => {
    setLastGesture(null);
    setGestureHistory([]);
    lastGestureTime.current = 0;
  }, []);

  /**
   * Get gestures of a specific type from history
   * @param {string} gestureType - Type of gesture to filter
   * @returns {Array} Filtered gestures
   */
  const getGesturesByType = useCallback((gestureType) => {
    return gestureHistory.filter(g => g.gesture === gestureType);
  }, [gestureHistory]);

  /**
   * Get gesture count by type
   * @param {string} gestureType - Type of gesture to count
   * @returns {number} Count of gestures
   */
  const getGestureCount = useCallback((gestureType) => {
    return gestureHistory.filter(g => g.gesture === gestureType).length;
  }, [gestureHistory]);

  return {
    lastGesture,
    gestureHistory,
    addGesture,
    clearGestures,
    getGesturesByType,
    getGestureCount,
  };
};

export default useGestures;
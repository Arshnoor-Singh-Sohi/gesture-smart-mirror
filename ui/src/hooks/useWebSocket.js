/**
 * useWebSocket hook
 * Manages WebSocket connection lifecycle in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import wsClient from '../services/websocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8765/ws';

/**
 * Custom hook for WebSocket connection management
 * @param {Function} onMessage - Callback for incoming messages
 * @returns {Object} WebSocket state and control functions
 */
export const useWebSocket = (onMessage) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref updated
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Handle incoming messages
  const handleMessage = useCallback((data) => {
    setLastMessage(data);
    setError(null);
    
    if (onMessageRef.current) {
      onMessageRef.current(data);
    }
  }, []);

  // Handle errors
  const handleError = useCallback((err) => {
    console.error('[useWebSocket] Error:', err);
    setError(err);
  }, []);

  // Handle connection
  const handleConnect = useCallback(() => {
    setConnectionStatus('connected');
    setError(null);
  }, []);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    setConnectionStatus('disconnected');
  }, []);

  // Connect on mount
  useEffect(() => {
    setConnectionStatus('connecting');
    
    wsClient.connect(
      WS_URL,
      handleMessage,
      handleError,
      handleConnect,
      handleDisconnect
    );

    // Cleanup on unmount
    return () => {
      wsClient.disconnect();
    };
  }, [handleMessage, handleError, handleConnect, handleDisconnect]);

  // Send message function
  const sendMessage = useCallback((message) => {
    return wsClient.sendMessage(message);
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    wsClient.disconnect();
    setTimeout(() => {
      setConnectionStatus('connecting');
      wsClient.connect(
        WS_URL,
        handleMessage,
        handleError,
        handleConnect,
        handleDisconnect
      );
    }, 100);
  }, [handleMessage, handleError, handleConnect, handleDisconnect]);

  return {
    connectionStatus,
    lastMessage,
    error,
    sendMessage,
    reconnect,
    isConnected: connectionStatus === 'connected',
  };
};

export default useWebSocket;
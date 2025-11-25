/**
 * WebSocket client service for gesture events.
 * Implements automatic reconnection with exponential backoff.
 */

const DEFAULT_WS_URL = 'ws://localhost:8765/ws';
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const RECONNECT_BACKOFF_MULTIPLIER = 1.5;
const MAX_RECONNECT_ATTEMPTS = Infinity; // Keep trying forever

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.url = null;
    this.onMessageCallback = null;
    this.onErrorCallback = null;
    this.onConnectCallback = null;
    this.onDisconnectCallback = null;
    
    // Reconnection state
    this.shouldReconnect = true;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.isConnecting = false;
    
    // Connection state
    this.isConnected = false;
    this.connectionStartTime = null;
    
    // Message queue for offline messages
    this.messageQueue = [];
    this.maxQueueSize = 50;
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL
   * @param {Function} onMessage - Callback for incoming messages
   * @param {Function} onError - Callback for errors
   * @param {Function} onConnect - Callback for successful connection
   * @param {Function} onDisconnect - Callback for disconnection
   */
  connect(url = DEFAULT_WS_URL, onMessage, onError, onConnect, onDisconnect) {
    this.url = url;
    this.onMessageCallback = onMessage;
    this.onErrorCallback = onError;
    this.onConnectCallback = onConnect;
    this.onDisconnectCallback = onDisconnect;
    
    this.shouldReconnect = true;
    this._connect();
  }

  /**
   * Internal connection method
   * @private
   */
  _connect() {
    if (this.isConnecting || this.isConnected) {
      console.log('[WebSocket] Already connecting or connected');
      return;
    }

    this.isConnecting = true;
    console.log(`[WebSocket] Connecting to ${this.url}...`);
    
    try {
      this.ws = new WebSocket(this.url);
      this.connectionStartTime = Date.now();
      
      this.ws.onopen = this._handleOpen.bind(this);
      this.ws.onmessage = this._handleMessage.bind(this);
      this.ws.onerror = this._handleError.bind(this);
      this.ws.onclose = this._handleClose.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this._scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   * @private
   */
  _handleOpen() {
    console.log('[WebSocket] Connected successfully');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = INITIAL_RECONNECT_DELAY;
    
    // Flush message queue
    this._flushMessageQueue();
    
    if (this.onConnectCallback) {
      this.onConnectCallback();
    }
  }

  /**
   * Handle incoming WebSocket message
   * @private
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Log message for debugging
      if (data.type === 'gesture') {
        console.log(`[WebSocket] Gesture: ${data.gesture} (confidence: ${data.confidence})`);
      } else if (data.type === 'hello') {
        console.log('[WebSocket] Received hello:', data);
      } else if (data.type === 'status') {
        console.log(`[WebSocket] Status: FPS=${data.fps}, Hands=${data.hands_detected}`);
      }
      
      if (this.onMessageCallback) {
        this.onMessageCallback(data);
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
    }
  }

  /**
   * Handle WebSocket error
   * @private
   */
  _handleError(error) {
    console.error('[WebSocket] Error:', error);
    
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Handle WebSocket close event
   * @private
   */
  _handleClose(event) {
    console.log(`[WebSocket] Connection closed (code: ${event.code}, reason: ${event.reason})`);
    
    this.isConnected = false;
    this.isConnecting = false;
    this.ws = null;
    
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
    
    // Attempt reconnection if enabled
    if (this.shouldReconnect) {
      this._scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   * @private
   */
  _scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS && MAX_RECONNECT_ATTEMPTS !== Infinity) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(RECONNECT_BACKOFF_MULTIPLIER, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY
    );
    
    console.log(`[WebSocket] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this._connect();
    }, delay);
  }

  /**
   * Send message to WebSocket server
   * @param {Object} message - Message object to send
   * @returns {boolean} True if sent, false if queued
   */
  sendMessage(message) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        console.log('[WebSocket] Message sent:', message.type);
        return true;
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
        this._queueMessage(message);
        return false;
      }
    } else {
      console.warn('[WebSocket] Not connected, queueing message');
      this._queueMessage(message);
      return false;
    }
  }

  /**
   * Queue message for later sending
   * @private
   */
  _queueMessage(message) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('[WebSocket] Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }
    this.messageQueue.push(message);
  }

  /**
   * Flush queued messages
   * @private
   */
  _flushMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }
    
    console.log(`[WebSocket] Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Get connection status
   * @returns {string} 'connected', 'connecting', or 'disconnected'
   */
  getStatus() {
    if (this.isConnected) {
      return 'connected';
    } else if (this.isConnecting) {
      return 'connecting';
    } else {
      return 'disconnected';
    }
  }

  /**
   * Check if connected
   * @returns {boolean} True if connected
   */
  isActive() {
    return this.isConnected;
  }
}

// Singleton instance
const wsClient = new WebSocketClient();

export default wsClient;
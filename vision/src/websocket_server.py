"""
WebSocket server with REST API endpoints for widget data.
Combines gesture event broadcasting with data API.
"""

import asyncio
import json
import logging
import time
from typing import Set, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

try:
    from api_integrations import APIManager
    API_AVAILABLE = True
except ImportError:
    API_AVAILABLE = False
    logging.warning("API integrations not available, using mock data only")

logger = logging.getLogger('gesture_vision.websocket')


class GestureWebSocketServer:
    """WebSocket server with REST API for gesture events and widget data."""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        """
        Initialize server.
        
        Args:
            host: Host address to bind to
            port: Port number to listen on
        """
        self.host = host
        self.port = port
        self.app = FastAPI(title="Gesture Smart Mirror API")
        
        # CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Connected WebSocket clients
        self.active_connections: Set[WebSocket] = set()
        
        # API Manager
        if API_AVAILABLE:
            self.api_manager = APIManager()
        else:
            self.api_manager = None
        
        # Statistics
        self.stats = {
            'messages_sent': 0,
            'connections_total': 0,
            'api_requests': 0,
            'start_time': time.time()
        }
        
        # Setup routes
        self._setup_routes()
        
        logger.info(f"Server initialized on {host}:{port}")
    
    def _setup_routes(self):
        """Setup FastAPI routes."""
        
        # ============ WebSocket Route ============
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket for gesture events."""
            await self.handle_client(websocket)
        
        # ============ REST API Routes ============
        @self.app.get("/api/weather")
        async def get_weather(city: str = "San Francisco"):
            """Get weather data."""
            self.stats['api_requests'] += 1
            
            if not self.api_manager:
                return self._mock_weather()
            
            try:
                data = await self.api_manager.weather.get_weather(city)
                return data
            except Exception as e:
                logger.error(f"Error in /api/weather: {e}")
                return self._mock_weather()
        
        @self.app.get("/api/news")
        async def get_news(country: str = "us"):
            """Get news headlines."""
            self.stats['api_requests'] += 1
            
            if not self.api_manager:
                return self._mock_news()
            
            try:
                data = await self.api_manager.news.get_headlines(country)
                return data
            except Exception as e:
                logger.error(f"Error in /api/news: {e}")
                return self._mock_news()
        
        @self.app.get("/api/calendar")
        async def get_calendar():
            """Get calendar events."""
            self.stats['api_requests'] += 1
            
            if not self.api_manager:
                return self._mock_calendar()
            
            try:
                data = await self.api_manager.calendar.get_events()
                return data
            except Exception as e:
                logger.error(f"Error in /api/calendar: {e}")
                return self._mock_calendar()
        
        @self.app.get("/api/all")
        async def get_all_data():
            """Get all widget data in one call."""
            self.stats['api_requests'] += 1
            
            if not self.api_manager:
                return {
                    'weather': self._mock_weather(),
                    'news': self._mock_news(),
                    'calendar': self._mock_calendar()
                }
            
            try:
                data = await self.api_manager.get_all_data()
                return data
            except Exception as e:
                logger.error(f"Error in /api/all: {e}")
                return {
                    'weather': self._mock_weather(),
                    'news': self._mock_news(),
                    'calendar': self._mock_calendar()
                }
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {
                "status": "healthy",
                "clients_connected": len(self.active_connections),
                "messages_sent": self.stats['messages_sent'],
                "api_requests": self.stats['api_requests'],
                "uptime_seconds": time.time() - self.stats['start_time'],
                "api_manager_available": self.api_manager is not None
            }
        
        @self.app.get("/")
        async def root():
            """Root endpoint."""
            return {
                "service": "Gesture Smart Mirror API",
                "version": "1.0.0",
                "websocket_url": f"ws://{self.host}:{self.port}/ws",
                "endpoints": {
                    "weather": f"http://{self.host}:{self.port}/api/weather",
                    "news": f"http://{self.host}:{self.port}/api/news",
                    "calendar": f"http://{self.host}:{self.port}/api/calendar",
                    "all": f"http://{self.host}:{self.port}/api/all"
                }
            }
    
    # ============ WebSocket Handlers ============
    async def handle_client(self, websocket: WebSocket):
        """Handle WebSocket client connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.stats['connections_total'] += 1
        
        client_id = id(websocket)
        logger.info(f"Client {client_id} connected. Total: {len(self.active_connections)}")
        
        # Send hello message
        await self._send_message(websocket, {
            "type": "hello",
            "version": "1.0.0",
            "capabilities": ["gestures", "status"]
        })
        
        try:
            while True:
                try:
                    data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=60.0
                    )
                    await self._handle_client_message(websocket, data)
                except asyncio.TimeoutError:
                    await self._send_message(websocket, {
                        "type": "ping",
                        "timestamp": int(time.time() * 1000)
                    })
        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Error with client {client_id}: {e}")
        finally:
            self.active_connections.discard(websocket)
            logger.info(f"Client {client_id} removed. Total: {len(self.active_connections)}")
    
    async def _handle_client_message(self, websocket: WebSocket, message: str):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'ping':
                await self._send_message(websocket, {
                    "type": "pong",
                    "timestamp": int(time.time() * 1000)
                })
            elif msg_type == 'config':
                logger.info(f"Config from client: {data.get('settings')}")
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    async def _send_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Send message to specific client."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def broadcast_gesture(self, gesture):
        """Broadcast gesture event to all connected clients."""
        if not self.active_connections:
            return
        
        hand_center = getattr(gesture, 'hand_center', [0.5, 0.5])
        hand_size = getattr(gesture, 'hand_size', 0.1)
        
        message = {
            "type": "gesture",
            "gesture": gesture.gesture,
            "confidence": round(gesture.confidence, 3),
            "hand_id": gesture.hand_id,
            "timestamp": int(time.time() * 1000),
            "metadata": {
                "hand_center": [
                    round(hand_center[0], 3),
                    round(hand_center[1], 3)
                ],
                "hand_size": round(hand_size, 3),
                **gesture.metadata
            }
        }
        
        await self._broadcast(message)
    
    async def broadcast_status(self, fps: float, latency_ms: float, hands_detected: int):
        """Broadcast system status."""
        if not self.active_connections:
            return
        
        message = {
            "type": "status",
            "fps": round(fps, 1),
            "latency_ms": round(latency_ms, 1),
            "hands_detected": hands_detected
        }
        
        await self._broadcast(message)
    
    async def _broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all clients."""
        if not self.active_connections:
            return
        
        tasks = [self._send_message(ws, message) for ws in self.active_connections]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        self.stats['messages_sent'] += len(self.active_connections)
    
    # ============ Mock Data Helpers ============
    def _mock_weather(self):
        """Mock weather data."""
        return {
            'location': 'San Francisco, CA',
            'current': {
                'temperature': 68,
                'condition': 'Partly Cloudy',
                'humidity': 65,
                'windSpeed': 8,
                'icon': '⛅',
                'tempUnit': '°F',
                'windUnit': 'mph',
            },
            'forecast': [
                {'day': 'Monday', 'high': 72, 'low': 58, 'condition': 'Sunny', 'icon': '☀️'},
                {'day': 'Tuesday', 'high': 70, 'low': 56, 'condition': 'Partly Cloudy', 'icon': '⛅'},
                {'day': 'Wednesday', 'high': 65, 'low': 54, 'condition': 'Cloudy', 'icon': '☁️'},
            ]
        }
    
    def _mock_news(self):
        """Mock news data."""
        return {
            'headlines': [
                {
                    'id': 1,
                    'title': 'Major Breakthrough in Quantum Computing',
                    'source': 'Tech Today',
                    'time': '2 hours ago',
                    'summary': 'Researchers achieve significant milestone.',
                    'category': 'Technology',
                }
            ]
        }
    
    def _mock_calendar(self):
        """Mock calendar data."""
        return {
            'events': [
                {
                    'id': 1,
                    'title': 'Team Meeting',
                    'time': '9:00 AM',
                    'duration': '30 min',
                    'description': 'Weekly sync',
                    'color': '#3b82f6',
                }
            ]
        }
    
    # ============ Server Control ============
    def start(self):
        """Start server (blocking)."""
        logger.info(f"Starting server on {self.host}:{self.port}")
        uvicorn.run(self.app, host=self.host, port=self.port, log_level="info")
    
    async def start_async(self):
        """Start server (async)."""
        config = uvicorn.Config(self.app, host=self.host, port=self.port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()


if __name__ == "__main__":
    server = GestureWebSocketServer()
    server.start()
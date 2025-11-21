"""
WebSocket server for broadcasting gesture events to UI clients.
Uses FastAPI with WebSocket support.
"""

import asyncio
import json
import logging
import time
from typing import Set, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from gesture_classifier import GestureResult

logger = logging.getLogger('gesture_vision.websocket')


class GestureWebSocketServer:
    """WebSocket server for broadcasting gesture events."""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        """
        Initialize WebSocket server.
        
        Args:
            host: Host address to bind to
            port: Port number to listen on
        """
        self.host = host
        self.port = port
        self.app = FastAPI(title="Gesture WebSocket Server")
        
        # CORS middleware for web clients
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Connected clients
        self.active_connections: Set[WebSocket] = set()
        
        # Message queue for async broadcasting
        self.message_queue: asyncio.Queue = asyncio.Queue()
        
        # Statistics
        self.stats = {
            'messages_sent': 0,
            'connections_total': 0,
            'start_time': time.time()
        }
        
        # Setup routes
        self._setup_routes()
        
        logger.info(f"WebSocket server initialized on {host}:{port}")
    
    def _setup_routes(self):
        """Setup FastAPI routes."""
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket connection endpoint."""
            await self.handle_client(websocket)
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {
                "status": "healthy",
                "clients_connected": len(self.active_connections),
                "messages_sent": self.stats['messages_sent'],
                "uptime_seconds": time.time() - self.stats['start_time']
            }
        
        @self.app.get("/")
        async def root():
            """Root endpoint."""
            return {
                "service": "Gesture WebSocket Server",
                "version": "1.0.0",
                "websocket_url": f"ws://{self.host}:{self.port}/ws"
            }
    
    async def handle_client(self, websocket: WebSocket):
        """
        Handle individual WebSocket client connection.
        
        Args:
            websocket: WebSocket connection
        """
        await websocket.accept()
        self.active_connections.add(websocket)
        self.stats['connections_total'] += 1
        
        client_id = id(websocket)
        logger.info(f"Client {client_id} connected. Total clients: {len(self.active_connections)}")
        
        # Send hello message
        await self._send_message(websocket, {
            "type": "hello",
            "version": "1.0.0",
            "capabilities": ["gestures", "landmarks", "status"]
        })
        
        try:
            # Keep connection alive and handle incoming messages
            while True:
                try:
                    # Wait for messages from client (with timeout)
                    data = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=60.0
                    )
                    await self._handle_client_message(websocket, data)
                except asyncio.TimeoutError:
                    # Send ping to keep connection alive
                    await self._send_message(websocket, {
                        "type": "ping",
                        "timestamp": int(time.time() * 1000)
                    })
        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            self.active_connections.discard(websocket)
            logger.info(f"Client {client_id} removed. Total clients: {len(self.active_connections)}")
    
    async def _handle_client_message(self, websocket: WebSocket, message: str):
        """
        Handle incoming message from client.
        
        Args:
            websocket: Client WebSocket connection
            message: JSON message string
        """
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'ping':
                # Respond to ping
                await self._send_message(websocket, {
                    "type": "pong",
                    "timestamp": int(time.time() * 1000)
                })
            elif msg_type == 'config':
                # Handle configuration request
                logger.info(f"Config request from client: {data.get('settings')}")
                # TODO: Apply configuration if needed
            else:
                logger.warning(f"Unknown message type: {msg_type}")
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from client: {message}")
        except Exception as e:
            logger.error(f"Error processing client message: {e}")
    
    async def _send_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        Send message to specific client.
        
        Args:
            websocket: Client WebSocket connection
            message: Message dictionary
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")
    
    
        """
        Broadcast gesture event to all connected clients.
        
        Args:
            gesture: Detected gesture result
        """
        if not self.active_connections:
            return
        
        message = {
            "type": "gesture",
            "gesture": gesture.gesture,
            "confidence": round(gesture.confidence, 3),
            "hand_id": gesture.hand_id,
            "timestamp": int(time.time() * 1000),
            "metadata": {
                "hand_center": [
                    round(gesture.hand_center[0], 3),
                    round(gesture.hand_center[1], 3)
                ],
                "hand_size": round(gesture.hand_size, 3),
                **gesture.metadata
            }
        }
        
        await self._broadcast(message)
    async def broadcast_gesture(self, gesture):
        """
        Broadcast gesture event to all connected clients.
        
        Args:
            gesture: Detected gesture (GestureResult or GestureEvent)
        """
        if not self.active_connections:
            return
        
        # Handle both GestureResult and GestureEvent
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
        """
        Broadcast system status to all clients.
        
        Args:
            fps: Current frames per second
            latency_ms: Average latency in milliseconds
            hands_detected: Number of hands currently detected
        """
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
        """
        Broadcast message to all connected clients.
        
        Args:
            message: Message dictionary
        """
        if not self.active_connections:
            return
        
        # Send to all clients concurrently
        disconnected = set()
        
        tasks = []
        for websocket in self.active_connections:
            tasks.append(self._send_message(websocket, message))
        
        # Wait for all sends to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check for failed sends
        for websocket, result in zip(list(self.active_connections), results):
            if isinstance(result, Exception):
                logger.error(f"Failed to send to client: {result}")
                disconnected.add(websocket)
        
        # Remove disconnected clients
        self.active_connections -= disconnected
        
        self.stats['messages_sent'] += len(self.active_connections)
    
    def start(self):
        """
        Start WebSocket server (blocking).
        This runs the uvicorn server.
        """
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        uvicorn.run(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info"
        )
    
    async def start_async(self):
        """
        Start WebSocket server (non-blocking for integration with async event loop).
        """
        config = uvicorn.Config(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()


# Standalone test client for debugging
async def test_client():
    """Test WebSocket client for debugging."""
    import websockets
    
    uri = "ws://localhost:8765/ws"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"Connected to {uri}")
            
            # Receive hello message
            message = await websocket.recv()
            print(f"Received: {message}")
            
            # Listen for messages
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                print(f"Gesture: {data.get('gesture')}, Confidence: {data.get('confidence')}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    # Run standalone server for testing
    server = GestureWebSocketServer()
    server.start()
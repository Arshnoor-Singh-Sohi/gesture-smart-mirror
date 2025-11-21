#!/usr/bin/env python3
"""
Test WebSocket client for verifying gesture events.
Connects to the vision WebSocket server and prints received messages.
"""

import asyncio
import json
import sys

try:
    import websockets
except ImportError:
    print("Error: 'websockets' package not installed")
    print("Install with: pip install websockets")
    sys.exit(1)


async def test_client(uri: str = "ws://localhost:8765/ws"):
    """
    Test WebSocket client that connects and prints all received messages.
    
    Args:
        uri: WebSocket server URI
    """
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✓ Connected successfully!")
            print("Listening for gesture events (Ctrl+C to exit)...\n")
            
            while True:
                try:
                    # Receive message
                    message = await websocket.recv()
                    data = json.loads(message)
                    
                    # Print based on message type
                    msg_type = data.get('type')
                    
                    if msg_type == 'hello':
                        print(f"[HELLO] Server version: {data.get('version')}")
                        print(f"        Capabilities: {data.get('capabilities')}\n")
                    
                    elif msg_type == 'gesture':
                        gesture = data.get('gesture')
                        confidence = data.get('confidence')
                        hand_id = data.get('hand_id')
                        print(f"[GESTURE] {gesture} (hand {hand_id}, confidence: {confidence:.2f})")
                    
                    elif msg_type == 'status':
                        fps = data.get('fps')
                        hands = data.get('hands_detected')
                        print(f"[STATUS] FPS: {fps:.1f}, Hands: {hands}")
                    
                    elif msg_type == 'ping':
                        # Send pong response
                        await websocket.send(json.dumps({
                            "type": "pong",
                            "timestamp": data.get('timestamp')
                        }))
                    
                    else:
                        print(f"[UNKNOWN] {json.dumps(data, indent=2)}")
                
                except websockets.exceptions.ConnectionClosed:
                    print("\n✗ Connection closed by server")
                    break
                except json.JSONDecodeError:
                    print(f"✗ Invalid JSON: {message}")
                except Exception as e:
                    print(f"✗ Error: {e}")
                    break
    
    except ConnectionRefusedError:
        print(f"✗ Connection refused. Is the server running?")
        print(f"  Start the server with: python src/main.py")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error connecting: {e}")
        sys.exit(1)


def main():
    """Main entry point."""
    # Parse command line arguments
    uri = "ws://localhost:8765/ws"
    
    if len(sys.argv) > 1:
        uri = sys.argv[1]
    
    print("=" * 60)
    print("Gesture Recognition - WebSocket Test Client")
    print("=" * 60)
    
    try:
        asyncio.run(test_client(uri))
    except KeyboardInterrupt:
        print("\n\n✓ Test client stopped")


if __name__ == "__main__":
    main()
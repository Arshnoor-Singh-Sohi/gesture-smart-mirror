"""
Main entry point for gesture recognition system.
Runs CLI demo with OpenCV visualization and WebSocket server.
"""

import argparse
import asyncio
import cv2
import logging
import signal
import sys
import threading
from pathlib import Path

from camera import CameraManager
from detector import HandDetector
from gesture_classifier import GestureClassifier
from websocket_server import GestureWebSocketServer
from utils import setup_logging, load_config, FPSCalculator


logger = None  # Will be initialized in main


class GestureRecognitionSystem:
    """Main system orchestrating all components."""
    
    def __init__(self, config_path: str):
        """
        Initialize the gesture recognition system.
        
        Args:
            config_path: Path to configuration YAML file
        """
        # Load configuration
        self.config = load_config(config_path)
        
        # Setup logging
        global logger
        logger = setup_logging(self.config['performance']['log_level'])
        logger.info(f"Initializing Gesture Recognition System")
        logger.info(f"Config loaded from: {config_path}")
        
        # Initialize components
        self.camera = None
        self.detector = None
        self.classifier = None
        self.ws_server = None
        self.ws_thread = None
        
        # Performance monitoring
        self.fps_calculator = FPSCalculator()
        
        # Visualization settings
        self.show_visualization = self.config['performance']['show_visualization']
        self.show_fps = self.config['performance']['show_fps']
        
        # Control flags
        self.running = False
        
        # Event loop for WebSocket
        self.loop = None
    
    def initialize(self):
        """Initialize all components."""
        try:
            # Initialize camera
            logger.info("Initializing camera...")
            self.camera = CameraManager(
                device_id=self.config['camera']['device_id'],
                width=self.config['camera']['width'],
                height=self.config['camera']['height'],
                fps=self.config['camera']['fps']
            )
            
            # Initialize hand detector
            logger.info("Initializing hand detector...")
            self.detector = HandDetector(
                max_hands=self.config['detector']['max_hands'],
                min_detection_confidence=self.config['detector']['min_detection_confidence'],
                min_tracking_confidence=self.config['detector']['min_tracking_confidence'],
                model_complexity=self.config['detector']['model_complexity']
            )
            
            # Initialize gesture classifier
            logger.info("Initializing gesture classifier...")
            self.classifier = GestureClassifier(self.config['gestures'])
            
            # Initialize WebSocket server
            logger.info("Initializing WebSocket server...")
            self.ws_server = GestureWebSocketServer(
                host=self.config['websocket']['host'],
                port=self.config['websocket']['port']
            )
            
            logger.info("All components initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize system: {e}")
            self.cleanup()
            raise
    
    def start_websocket_server(self):
        """Start WebSocket server in background thread."""
        def run_server():
            """Run WebSocket server in separate thread."""
            logger.info("Starting WebSocket server thread...")
            
            # Create new event loop for this thread
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            
            try:
                self.loop.run_until_complete(self.ws_server.start_async())
            except Exception as e:
                logger.error(f"WebSocket server error: {e}")
            finally:
                self.loop.close()
        
        self.ws_thread = threading.Thread(target=run_server, daemon=True)
        self.ws_thread.start()
        
        logger.info("WebSocket server started in background thread")
    
    def process_frame(self, frame_rgb, frame_bgr):
        """
        Process a single frame through the detection pipeline.
        
        Args:
            frame_rgb: RGB frame for MediaPipe
            frame_bgr: BGR frame for visualization
            
        Returns:
            Annotated BGR frame for display
        """
        # Detect hands
        hands = self.detector.detect(frame_rgb)
        
        # Classify gestures
        gestures = self.classifier.classify(hands)
        
        # Broadcast gestures via WebSocket
        if gestures and self.loop:
            for gesture in gestures:
                # Schedule broadcast in WebSocket event loop
                asyncio.run_coroutine_threadsafe(
                    self.ws_server.broadcast_gesture(gesture),
                    self.loop
                )
                
                # Log gesture
                logger.info(
                    f"Gesture detected: {gesture.gesture} "
                    f"(confidence: {gesture.confidence:.2f}, hand: {gesture.hand_id})"
                )
        
        # Draw landmarks on frame
        annotated_frame = self.detector.draw_landmarks(frame_bgr, hands)
        
        # Draw gesture labels
        for idx, gesture in enumerate(gestures):
            text = f"{gesture.gesture} ({gesture.confidence:.2f})"
            position = (10, 30 + idx * 30)
            cv2.putText(
                annotated_frame,
                text,
                position,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )
        
        # Draw FPS
        if self.show_fps:
            fps = self.fps_calculator.update()
            fps_text = f"FPS: {fps:.1f}"
            cv2.putText(
                annotated_frame,
                fps_text,
                (10, annotated_frame.shape[0] - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2
            )
            
            # Broadcast status periodically
            if self.loop and int(fps) % 5 == 0:  # Every ~5 seconds
                asyncio.run_coroutine_threadsafe(
                    self.ws_server.broadcast_status(fps, 0.0, len(hands)),
                    self.loop
                )
        
        # Draw instructions
        instructions = [
            "Controls:",
            "Q - Quit",
            "Space - Reset"
        ]
        y_offset = annotated_frame.shape[0] - 100
        for instruction in instructions:
            cv2.putText(
                annotated_frame,
                instruction,
                (annotated_frame.shape[1] - 250, y_offset),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1
            )
            y_offset += 20
        
        return annotated_frame
    
    def run(self):
        """Main execution loop."""
        self.running = True
        
        # Start WebSocket server
        self.start_websocket_server()
        
        logger.info("Starting main loop...")
        logger.info("Press 'Q' to quit, 'Space' to reset")
        
        try:
            while self.running:
                # Capture frame
                frame_rgb = self.camera.read_frame()
                frame_bgr = self.camera.read_frame_bgr()
                
                if frame_rgb is None or frame_bgr is None:
                    logger.warning("Failed to capture frame")
                    continue
                
                # Process frame
                annotated_frame = self.process_frame(frame_rgb, frame_bgr)
                
                # Display frame
                if self.show_visualization:
                    cv2.imshow('Gesture Recognition', annotated_frame)
                    
                    # Handle keyboard input
                    key = cv2.waitKey(1) & 0xFF
                    
                    if key == ord('q') or key == ord('Q'):
                        logger.info("Quit command received")
                        break
                    elif key == ord(' '):
                        logger.info("Reset command received")
                        self.fps_calculator.reset()
                
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received")
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            raise
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up all resources."""
        logger.info("Cleaning up resources...")
        
        self.running = False
        
        # Close OpenCV windows
        if self.show_visualization:
            cv2.destroyAllWindows()
        
        # Release camera
        if self.camera:
            self.camera.release()
        
        # Close detector
        if self.detector:
            self.detector.close()
        
        # Note: WebSocket server thread will terminate when main thread exits (daemon=True)
        
        logger.info("Cleanup complete")


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Gesture Recognition System - CLI Demo"
    )
    
    parser.add_argument(
        '--config',
        type=str,
        default='config/default.yaml',
        help='Path to configuration YAML file'
    )
    
    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_arguments()
    
    # Resolve config path relative to vision directory
    config_path = Path(__file__).parent.parent / args.config
    
    if not config_path.exists():
        print(f"Error: Configuration file not found: {config_path}")
        sys.exit(1)
    
    try:
        # Initialize system
        system = GestureRecognitionSystem(str(config_path))
        
        # Setup signal handlers for graceful shutdown
        def signal_handler(sig, frame):
            logger.info("Signal received, shutting down...")
            system.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Initialize components
        system.initialize()
        
        # Run main loop
        system.run()
        
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
    
    print("System shutdown complete")


if __name__ == "__main__":
    main()
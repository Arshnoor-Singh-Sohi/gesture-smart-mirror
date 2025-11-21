"""
Utility functions for gesture recognition system.
Handles logging, configuration, and performance metrics.
"""

import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional
import yaml


def setup_logging(level: str = "INFO") -> logging.Logger:
    """
    Configure logging with consistent format across all modules.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        
    Returns:
        Configured logger instance
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    logging.basicConfig(
        level=numeric_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    logger = logging.getLogger('gesture_vision')
    return logger


def load_config(config_path: str) -> Dict[str, Any]:
    """
    Load YAML configuration file with validation.
    
    Args:
        config_path: Path to YAML config file
        
    Returns:
        Dictionary containing configuration
        
    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config is invalid or missing required keys
    """
    path = Path(config_path)
    
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Validate required top-level keys
    required_keys = ['camera', 'detector', 'gestures', 'websocket', 'performance']
    missing_keys = [key for key in required_keys if key not in config]
    
    if missing_keys:
        raise ValueError(f"Configuration missing required keys: {missing_keys}")
    
    # Validate camera config
    camera_keys = ['device_id', 'width', 'height', 'fps']
    missing_camera = [key for key in camera_keys if key not in config['camera']]
    if missing_camera:
        raise ValueError(f"Camera config missing keys: {missing_camera}")
    
    # Validate detector config
    detector_keys = ['model_complexity', 'max_hands', 'min_detection_confidence', 'min_tracking_confidence']
    missing_detector = [key for key in detector_keys if key not in config['detector']]
    if missing_detector:
        raise ValueError(f"Detector config missing keys: {missing_detector}")
    
    return config


class FPSCalculator:
    """Calculate frames per second with moving average."""
    
    def __init__(self, window_size: int = 30):
        """
        Initialize FPS calculator.
        
        Args:
            window_size: Number of frames to average over
        """
        self.window_size = window_size
        self.frame_times = []
        self.last_time = time.time()
    
    def update(self) -> float:
        """
        Update FPS calculation with new frame.
        
        Returns:
            Current FPS (averaged over window)
        """
        current_time = time.time()
        delta = current_time - self.last_time
        self.last_time = current_time
        
        if delta > 0:
            self.frame_times.append(1.0 / delta)
        
        # Keep only last window_size frames
        if len(self.frame_times) > self.window_size:
            self.frame_times.pop(0)
        
        if not self.frame_times:
            return 0.0
        
        return sum(self.frame_times) / len(self.frame_times)
    
    def reset(self):
        """Reset FPS calculation."""
        self.frame_times.clear()
        self.last_time = time.time()


class LatencyTracker:
    """Track end-to-end latency for gesture detection pipeline."""
    
    def __init__(self):
        """Initialize latency tracker."""
        self.start_times = {}
        self.latencies = []
    
    def start(self, event_id: str):
        """
        Mark start of event processing.
        
        Args:
            event_id: Unique identifier for this event
        """
        self.start_times[event_id] = time.time()
    
    def end(self, event_id: str) -> Optional[float]:
        """
        Mark end of event processing and calculate latency.
        
        Args:
            event_id: Unique identifier for this event
            
        Returns:
            Latency in milliseconds, or None if start not found
        """
        if event_id not in self.start_times:
            return None
        
        latency_ms = (time.time() - self.start_times[event_id]) * 1000
        self.latencies.append(latency_ms)
        
        # Keep only last 100 measurements
        if len(self.latencies) > 100:
            self.latencies.pop(0)
        
        del self.start_times[event_id]
        return latency_ms
    
    def get_average_latency(self) -> float:
        """
        Get average latency over recent measurements.
        
        Returns:
            Average latency in milliseconds
        """
        if not self.latencies:
            return 0.0
        return sum(self.latencies) / len(self.latencies)
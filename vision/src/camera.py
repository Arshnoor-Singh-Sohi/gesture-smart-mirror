"""
Camera management module.
Handles webcam initialization, frame capture, and resource cleanup.
"""

import cv2
import numpy as np
import logging
from typing import Optional, Tuple

logger = logging.getLogger('gesture_vision.camera')


class CameraManager:
    """Manages webcam capture with configurable resolution and FPS."""
    
    def __init__(self, device_id: int = 0, width: int = 640, height: int = 480, fps: int = 30):
        """
        Initialize camera manager.
        
        Args:
            device_id: Camera device ID (typically 0 for default webcam)
            width: Frame width in pixels
            height: Frame height in pixels
            fps: Target frames per second
            
        Raises:
            RuntimeError: If camera cannot be opened
        """
        self.device_id = device_id
        self.width = width
        self.height = height
        self.fps = fps
        self.cap = None
        
        logger.info(f"Initializing camera {device_id} at {width}x{height} @ {fps}fps")
        
        self._open_camera()
    
    def _open_camera(self):
        """
        Open camera device and configure parameters.
        
        Raises:
            RuntimeError: If camera cannot be opened or configured
        """
        self.cap = cv2.VideoCapture(self.device_id)
        
        if not self.cap.isOpened():
            raise RuntimeError(f"Failed to open camera device {self.device_id}")
        
        # Set resolution
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        
        # Set FPS (may not be supported by all cameras)
        self.cap.set(cv2.CAP_PROP_FPS, self.fps)
        
        # Verify actual settings (camera may not support requested values)
        actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        
        if actual_width != self.width or actual_height != self.height:
            logger.warning(
                f"Camera resolution mismatch: requested {self.width}x{self.height}, "
                f"got {actual_width}x{actual_height}"
            )
        
        if actual_fps != self.fps:
            logger.warning(f"Camera FPS mismatch: requested {self.fps}, got {actual_fps}")
        
        logger.info(f"Camera opened successfully: {actual_width}x{actual_height} @ {actual_fps}fps")
    
    def read_frame(self) -> Optional[np.ndarray]:
        """
        Capture a single frame from camera.
        
        Returns:
            RGB frame as numpy array (H, W, 3), or None if capture fails
        """
        if self.cap is None or not self.cap.isOpened():
            logger.error("Camera not initialized or closed")
            return None
        
        ret, frame = self.cap.read()
        
        if not ret or frame is None:
            logger.error("Failed to capture frame")
            return None
        
        # Convert BGR (OpenCV default) to RGB for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        return frame_rgb
    
    def read_frame_bgr(self) -> Optional[np.ndarray]:
        """
        Capture a single frame in BGR format (for OpenCV visualization).
        
        Returns:
            BGR frame as numpy array (H, W, 3), or None if capture fails
        """
        if self.cap is None or not self.cap.isOpened():
            logger.error("Camera not initialized or closed")
            return None
        
        ret, frame = self.cap.read()
        
        if not ret or frame is None:
            logger.error("Failed to capture frame")
            return None
        
        return frame
    
    def get_properties(self) -> dict:
        """
        Get current camera properties.
        
        Returns:
            Dictionary with width, height, fps
        """
        if self.cap is None or not self.cap.isOpened():
            return {}
        
        return {
            'width': int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': int(self.cap.get(cv2.CAP_PROP_FPS))
        }
    
    def release(self):
        """Release camera resources."""
        if self.cap is not None:
            logger.info("Releasing camera")
            self.cap.release()
            self.cap = None
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit with cleanup."""
        self.release()
    
    def __del__(self):
        """Destructor to ensure cleanup."""
        self.release()
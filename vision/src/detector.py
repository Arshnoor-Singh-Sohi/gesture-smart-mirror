"""
Hand detection module using MediaPipe Hands.
Extracts 21-point hand landmarks from camera frames.
"""

import cv2
import numpy as np
import mediapipe as mp
import logging
from typing import List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger('gesture_vision.detector')


# MediaPipe hand landmark indices
class HandLandmark:
    """MediaPipe hand landmark indices (0-20)."""
    WRIST = 0
    
    THUMB_CMC = 1
    THUMB_MCP = 2
    THUMB_IP = 3
    THUMB_TIP = 4
    
    INDEX_FINGER_MCP = 5
    INDEX_FINGER_PIP = 6
    INDEX_FINGER_DIP = 7
    INDEX_FINGER_TIP = 8
    
    MIDDLE_FINGER_MCP = 9
    MIDDLE_FINGER_PIP = 10
    MIDDLE_FINGER_DIP = 11
    MIDDLE_FINGER_TIP = 12
    
    RING_FINGER_MCP = 13
    RING_FINGER_PIP = 14
    RING_FINGER_DIP = 15
    RING_FINGER_TIP = 16
    
    PINKY_MCP = 17
    PINKY_PIP = 18
    PINKY_DIP = 19
    PINKY_TIP = 20


@dataclass
class Landmark:
    """Single landmark point with normalized coordinates."""
    x: float  # Normalized [0, 1]
    y: float  # Normalized [0, 1]
    z: float  # Depth relative to wrist (negative = closer to camera)


@dataclass
class HandLandmarks:
    """Complete set of hand landmarks for one detected hand."""
    landmarks: List[Landmark]  # 21 landmarks
    handedness: str  # "Left" or "Right"
    score: float  # Detection confidence [0, 1]


class HandDetector:
    """Wrapper around MediaPipe Hands for gesture detection."""
    
    def __init__(
        self,
        max_hands: int = 2,
        min_detection_confidence: float = 0.7,
        min_tracking_confidence: float = 0.7,
        model_complexity: int = 1
    ):
        """
        Initialize hand detector.
        
        Args:
            max_hands: Maximum number of hands to detect
            min_detection_confidence: Minimum confidence for detection
            min_tracking_confidence: Minimum confidence for tracking
            model_complexity: Model complexity (0=lite, 1=full)
        """
        self.max_hands = max_hands
        self.min_detection_confidence = min_detection_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self.model_complexity = model_complexity
        
        logger.info(
            f"Initializing MediaPipe Hands: max_hands={max_hands}, "
            f"detection_conf={min_detection_confidence}, "
            f"tracking_conf={min_tracking_confidence}, "
            f"complexity={model_complexity}"
        )
        
        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            model_complexity=model_complexity
        )
    
    def detect(self, frame_rgb: np.ndarray) -> List[HandLandmarks]:
        """
        Detect hands in RGB frame and extract landmarks.
        
        Args:
            frame_rgb: RGB image as numpy array (H, W, 3)
            
        Returns:
            List of detected hands with landmarks
        """
        if frame_rgb is None:
            return []
        
        # Process frame with MediaPipe
        results = self.hands.process(frame_rgb)
        
        if not results.multi_hand_landmarks:
            return []
        
        detected_hands = []
        
        # Extract landmarks for each detected hand
        for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            # Get handedness (Left/Right)
            handedness = "Unknown"
            if results.multi_handedness and idx < len(results.multi_handedness):
                handedness = results.multi_handedness[idx].classification[0].label
            
            # Get detection score
            score = 1.0
            if results.multi_handedness and idx < len(results.multi_handedness):
                score = results.multi_handedness[idx].classification[0].score
            
            # Extract all 21 landmarks
            landmarks = []
            for landmark in hand_landmarks.landmark:
                landmarks.append(Landmark(
                    x=landmark.x,
                    y=landmark.y,
                    z=landmark.z
                ))
            
            detected_hands.append(HandLandmarks(
                landmarks=landmarks,
                handedness=handedness,
                score=score
            ))
        
        return detected_hands
    
    def draw_landmarks(
        self,
        frame_bgr: np.ndarray,
        hands: List[HandLandmarks],
        draw_connections: bool = True
    ) -> np.ndarray:
        """
        Draw hand landmarks on frame for visualization.
        
        Args:
            frame_bgr: BGR image (OpenCV format)
            hands: List of detected hands
            draw_connections: Whether to draw connections between landmarks
            
        Returns:
            Frame with drawn landmarks
        """
        annotated_frame = frame_bgr.copy()
        
        for hand in hands:
            # Convert landmarks back to MediaPipe format for drawing
            from mediapipe.framework.formats import landmark_pb2
            
            mp_landmarks = landmark_pb2.NormalizedLandmarkList()
            
            for landmark in hand.landmarks:
                mp_landmark = mp_landmarks.landmark.add()
                mp_landmark.x = landmark.x
                mp_landmark.y = landmark.y
                mp_landmark.z = landmark.z
            
            # Draw landmarks and connections
            if draw_connections:
                self.mp_drawing.draw_landmarks(
                    annotated_frame,
                    mp_landmarks,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style()
                )
            else:
                self.mp_drawing.draw_landmarks(
                    annotated_frame,
                    mp_landmarks,
                    None,
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    None
                )
        
        return annotated_frame
    
    def close(self):
        """Release MediaPipe resources."""
        if self.hands:
            self.hands.close()
            logger.info("MediaPipe Hands closed")
    
    def __del__(self):
        """Destructor to ensure cleanup."""
        self.close()
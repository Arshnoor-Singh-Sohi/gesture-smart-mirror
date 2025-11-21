"""
Gesture classification module.
Converts hand landmarks to gesture labels using heuristic algorithms.
"""

import numpy as np
import logging
from typing import Optional, List, Tuple
from dataclasses import dataclass
from collections import deque

from detector import HandLandmarks, HandLandmark, Landmark

logger = logging.getLogger('gesture_vision.gesture_classifier')


@dataclass
class GestureResult:
    """Result of gesture classification."""
    gesture: str  # Gesture label
    confidence: float  # Confidence score [0, 1]
    hand_id: int  # Which hand (0 or 1)
    hand_center: Tuple[float, float]  # Normalized (x, y)
    hand_size: float  # Normalized area
    metadata: dict  # Additional info


class GestureClassifier:
    """Classifies hand landmarks into gesture labels using heuristics."""
    
    # Gesture labels
    OPEN_PALM = "OPEN_PALM"
    CLOSED_FIST = "CLOSED_FIST"
    PINCH_START = "PINCH_START"
    PINCH_HOLD = "PINCH_HOLD"
    PINCH_END = "PINCH_END"
    SWIPE_LEFT = "SWIPE_LEFT"
    SWIPE_RIGHT = "SWIPE_RIGHT"
    PUSH_FORWARD = "PUSH_FORWARD"
    
    def __init__(self, config: dict):
        """
        Initialize gesture classifier with configuration.
        
        Args:
            config: Dictionary with gesture thresholds
        """
        self.config = config
        
        # Thresholds from config
        self.open_palm_threshold = config.get('open_palm_finger_threshold', 0.02)
        self.open_palm_min_fingers = config.get('open_palm_min_fingers', 3)
        
        self.closed_fist_threshold = config.get('closed_fist_distance_threshold', 0.10)
        self.closed_fist_min_fingers = config.get('closed_fist_min_fingers', 4)
        
        self.pinch_enter_threshold = config.get('pinch_enter_threshold', 0.05)
        self.pinch_exit_threshold = config.get('pinch_exit_threshold', 0.07)
        
        self.swipe_window = config.get('swipe_window_size', 10)
        self.swipe_dx_threshold = config.get('swipe_dx_threshold', 0.15)
        self.swipe_dy_ratio = config.get('swipe_dy_ratio', 0.5)
        
        self.push_window = config.get('push_window_size', 10)
        self.push_size_threshold = config.get('push_size_increase_threshold', 0.20)
        self.push_z_threshold = config.get('push_z_threshold', 0.15)
        
        # History for temporal gestures
        self.hand_history = [deque(maxlen=self.swipe_window) for _ in range(2)]
        
        # Previous pinch state for hysteresis
        self.prev_pinch_state = [None, None]
        
        logger.info("Gesture classifier initialized with thresholds from config")
    
    def classify(self, hands: List[HandLandmarks]) -> List[GestureResult]:
        """Classify gestures for all detected hands."""
        results = []
        
        for hand_id, hand in enumerate(hands[:2]):
            hand_center = self._calculate_hand_center(hand.landmarks)
            hand_size = self._calculate_hand_size(hand.landmarks)
            
            self.hand_history[hand_id].append({
                'center': hand_center,
                'size': hand_size,
                'landmarks': hand.landmarks
            })
            
            gesture = None
            confidence = 0.0
            metadata = {}
            
            # CHECK TEMPORAL GESTURES FIRST (they clear history)
            # 1. Check SWIPE
            if len(self.hand_history[hand_id]) >= self.swipe_window:
                swipe = self._detect_swipe(hand_id)
                if swipe:
                    gesture = swipe
                    confidence = 0.80
                    metadata['swipe_direction'] = 'left' if swipe == self.SWIPE_LEFT else 'right'
            
            # 2. Check PUSH_FORWARD
            if not gesture and len(self.hand_history[hand_id]) >= self.push_window:
                if self._detect_push_forward(hand_id):
                    gesture = self.PUSH_FORWARD
                    confidence = 0.85
                    metadata['push_magnitude'] = self._get_push_magnitude(hand_id)
            
            # THEN CHECK STATIC GESTURES (if no temporal gesture found)
            if not gesture:
                # 3. Check OPEN_PALM
                palm_conf = self._detect_open_palm(hand.landmarks)
                if palm_conf >= 0.75:
                    gesture = self.OPEN_PALM
                    confidence = palm_conf
                    metadata['fingers_extended'] = self._count_extended_fingers(hand.landmarks)
                
                # 4. Check CLOSED_FIST
                elif self._detect_closed_fist(hand.landmarks):
                    gesture = self.CLOSED_FIST
                    confidence = 0.85
                    metadata['fist_tightness'] = self._calculate_fist_tightness(hand.landmarks)
                
                # 5. Check PINCH
                else:
                    pinch_result = self._detect_pinch(hand.landmarks, hand_id)
                    if pinch_result:
                        gesture = pinch_result
                        confidence = 0.90
                        metadata['pinch_distance'] = self._get_pinch_distance(hand.landmarks)
            
            if gesture:
                results.append(GestureResult(
                    gesture=gesture,
                    confidence=confidence,
                    hand_id=hand_id,
                    hand_center=hand_center,
                    hand_size=hand_size,
                    metadata=metadata
                ))
        
        return results
    
    def _detect_open_palm(self, landmarks: List[Landmark]) -> float:
        """
        Detect open palm gesture (all fingers extended).
        
        Returns:
            Confidence score [0, 1]
        """
        fingers = [
            HandLandmark.INDEX_FINGER_TIP,
            HandLandmark.MIDDLE_FINGER_TIP,
            HandLandmark.RING_FINGER_TIP,
            HandLandmark.PINKY_TIP
        ]
        
        finger_pips = [
            HandLandmark.INDEX_FINGER_PIP,
            HandLandmark.MIDDLE_FINGER_PIP,
            HandLandmark.RING_FINGER_PIP,
            HandLandmark.PINKY_PIP
        ]
        
        extended_count = 0
        
        for tip_idx, pip_idx in zip(fingers, finger_pips):
            tip = landmarks[tip_idx]
            pip = landmarks[pip_idx]
            
            # Finger is extended if tip.y < pip.y (lower in image = higher Y)
            if tip.y < pip.y - self.open_palm_threshold:
                extended_count += 1
        
        confidence = extended_count / 4.0
        return confidence
    
    def _detect_closed_fist(self, landmarks: List[Landmark]) -> bool:
        """
        Detect closed fist (all fingertips close to palm center).
        
        Returns:
            True if fist detected
        """
        palm_center = self._calculate_palm_center(landmarks)
        
        fingertips = [
            HandLandmark.THUMB_TIP,
            HandLandmark.INDEX_FINGER_TIP,
            HandLandmark.MIDDLE_FINGER_TIP,
            HandLandmark.RING_FINGER_TIP,
            HandLandmark.PINKY_TIP
        ]
        
        closed_count = 0
        
        for tip_idx in fingertips:
            tip = landmarks[tip_idx]
            distance = self._euclidean_distance(tip, palm_center)
            
            if distance < self.closed_fist_threshold:
                closed_count += 1
        
        return closed_count >= self.closed_fist_min_fingers
    
    def _detect_pinch(self, landmarks: List[Landmark], hand_id: int) -> Optional[str]:
        """
        Detect pinch gesture (thumb and index touching).
        
        Args:
            landmarks: Hand landmarks
            hand_id: Hand identifier for state tracking
            
        Returns:
            Pinch gesture label or None
        """
        thumb_tip = landmarks[HandLandmark.THUMB_TIP]
        index_tip = landmarks[HandLandmark.INDEX_FINGER_TIP]
        
        distance = self._euclidean_distance(thumb_tip, index_tip)
        
        prev_state = self.prev_pinch_state[hand_id]
        
        # Hysteresis: different thresholds for entering/exiting
        if prev_state == self.PINCH_HOLD:
            threshold = self.pinch_exit_threshold
        else:
            threshold = self.pinch_enter_threshold
        
        if distance < threshold:
            if prev_state != self.PINCH_HOLD:
                self.prev_pinch_state[hand_id] = self.PINCH_HOLD
                return self.PINCH_START
            else:
                return self.PINCH_HOLD
        else:
            if prev_state == self.PINCH_HOLD:
                self.prev_pinch_state[hand_id] = None
                return self.PINCH_END
            else:
                return None
    
    def _detect_swipe(self, hand_id: int) -> Optional[str]:
        """
        Detect swipe gesture (lateral hand movement).
        
        Args:
            hand_id: Hand identifier
            
        Returns:
            SWIPE_LEFT, SWIPE_RIGHT, or None
        """
        history = list(self.hand_history[hand_id])
        
        if len(history) < self.swipe_window:
            return None
        
        start_pos = history[0]['center']
        end_pos = history[-1]['center']
        
        dx = end_pos[0] - start_pos[0]
        dy = end_pos[1] - start_pos[1]
        
        # Must be mostly horizontal movement
        if abs(dy) > abs(dx) * self.swipe_dy_ratio:
            return None
        
        # Check if movement exceeds threshold
        if abs(dx) > self.swipe_dx_threshold:
            # Clear history after detecting swipe to prevent repeated detections
            self.hand_history[hand_id].clear()
            return self.SWIPE_LEFT if dx < 0 else self.SWIPE_RIGHT
        
        return None
    
    def _detect_push_forward(self, hand_id: int) -> bool:
        """
        Detect push forward gesture (hand moving toward camera).
        
        Args:
            hand_id: Hand identifier
            
        Returns:
            True if push detected
        """
        history = list(self.hand_history[hand_id])
        
        if len(history) < self.push_window:
            return False
        
        start_size = history[0]['size']
        end_size = history[-1]['size']
        
        # Check size increase
        if start_size > 0:
            size_increase = (end_size - start_size) / start_size
            if size_increase > self.push_size_threshold:
                self.hand_history[hand_id].clear()
                return True
        
        # Alternative: Check Z coordinate decrease (hand closer to camera)
        start_z = np.mean([lm.z for lm in history[0]['landmarks']])
        end_z = np.mean([lm.z for lm in history[-1]['landmarks']])
        
        if (start_z - end_z) > self.push_z_threshold:
            self.hand_history[hand_id].clear()
            return True
        
        return False
    
    def _calculate_hand_center(self, landmarks: List[Landmark]) -> Tuple[float, float]:
        """Calculate geometric center of hand."""
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]
        return (np.mean(x_coords), np.mean(y_coords))
    
    def _calculate_palm_center(self, landmarks: List[Landmark]) -> Landmark:
        """Calculate center of palm using wrist and base knuckles."""
        palm_indices = [
            HandLandmark.WRIST,
            HandLandmark.INDEX_FINGER_MCP,
            HandLandmark.MIDDLE_FINGER_MCP,
            HandLandmark.RING_FINGER_MCP,
            HandLandmark.PINKY_MCP
        ]
        
        x = np.mean([landmarks[i].x for i in palm_indices])
        y = np.mean([landmarks[i].y for i in palm_indices])
        z = np.mean([landmarks[i].z for i in palm_indices])
        
        return Landmark(x=x, y=y, z=z)
    
    def _calculate_hand_size(self, landmarks: List[Landmark]) -> float:
        """Calculate approximate hand size (bounding box area)."""
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]
        
        width = max(x_coords) - min(x_coords)
        height = max(y_coords) - min(y_coords)
        
        return width * height
    
    def _euclidean_distance(self, lm1: Landmark, lm2: Landmark) -> float:
        """Calculate Euclidean distance between two landmarks."""
        dx = lm1.x - lm2.x
        dy = lm1.y - lm2.y
        dz = lm1.z - lm2.z
        return np.sqrt(dx**2 + dy**2 + dz**2)
    
    def _count_extended_fingers(self, landmarks: List[Landmark]) -> int:
        """Count number of extended fingers."""
        fingers = [
            HandLandmark.INDEX_FINGER_TIP,
            HandLandmark.MIDDLE_FINGER_TIP,
            HandLandmark.RING_FINGER_TIP,
            HandLandmark.PINKY_TIP
        ]
        
        finger_pips = [
            HandLandmark.INDEX_FINGER_PIP,
            HandLandmark.MIDDLE_FINGER_PIP,
            HandLandmark.RING_FINGER_PIP,
            HandLandmark.PINKY_PIP
        ]
        
        count = 0
        for tip_idx, pip_idx in zip(fingers, finger_pips):
            tip = landmarks[tip_idx]
            pip = landmarks[pip_idx]
            if tip.y < pip.y - self.open_palm_threshold:
                count += 1
        
        return count
    
    def _calculate_fist_tightness(self, landmarks: List[Landmark]) -> float:
        """Calculate how tightly closed the fist is."""
        palm_center = self._calculate_palm_center(landmarks)
        fingertips = [
            HandLandmark.THUMB_TIP,
            HandLandmark.INDEX_FINGER_TIP,
            HandLandmark.MIDDLE_FINGER_TIP,
            HandLandmark.RING_FINGER_TIP,
            HandLandmark.PINKY_TIP
        ]
        
        distances = [self._euclidean_distance(landmarks[i], palm_center) for i in fingertips]
        return 1.0 - (np.mean(distances) / 0.15)  # Normalize
    
    def _get_pinch_distance(self, landmarks: List[Landmark]) -> float:
        """Get distance between thumb and index tips."""
        thumb_tip = landmarks[HandLandmark.THUMB_TIP]
        index_tip = landmarks[HandLandmark.INDEX_FINGER_TIP]
        return self._euclidean_distance(thumb_tip, index_tip)
    
    def _get_push_magnitude(self, hand_id: int) -> float:
        """Get magnitude of push gesture."""
        history = list(self.hand_history[hand_id])
        if len(history) < 2:
            return 0.0
        
        start_size = history[0]['size']
        end_size = history[-1]['size']
        
        if start_size > 0:
            return (end_size - start_size) / start_size
        return 0.0
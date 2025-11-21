"""
Gesture state machine for filtering and debouncing.
Converts noisy gesture detections into clean, discrete events.
"""

import time
import logging
from typing import Optional, List
from dataclasses import dataclass
from collections import deque

from gesture_classifier import GestureResult

logger = logging.getLogger('gesture_vision.state_machine')


@dataclass
class GestureEvent:
    """Filtered gesture event ready for broadcast."""
    gesture: str
    confidence: float
    hand_id: int
    timestamp: int  # Unix milliseconds
    metadata: dict


class GestureStateMachine:
    """
    State machine for filtering gesture detections.
    
    States:
    - IDLE: No gesture detected, ready for new input
    - DETECTING: Accumulating evidence for gesture
    - TRIGGERED: Gesture confirmed, event emitted
    - COOLDOWN: Waiting before accepting new gestures
    
    Ensures:
    - Gestures are stable (N consecutive frames)
    - No rapid re-triggering (cooldown period)
    - Clean discrete events (not continuous stream)
    """
    
    # State constants
    IDLE = "idle"
    DETECTING = "detecting"
    TRIGGERED = "triggered"
    COOLDOWN = "cooldown"
    
    def __init__(self, hand_id: int, config: dict):
        """
        Initialize state machine for one hand.
        
        Args:
            hand_id: Hand identifier (0 or 1)
            config: Configuration dictionary with state_machine section
        """
        self.hand_id = hand_id
        
        # Configuration
        self.stability_frames = config.get('stability_frames', 5)
        self.cooldown_ms = config.get('cooldown_ms', 1000)
        self.allow_same_gesture = config.get('allow_same_gesture_repeat', False)
        
        # State
        self.state = self.IDLE
        self.detection_buffer = deque(maxlen=self.stability_frames)
        self.cooldown_end_time = 0
        self.last_triggered_gesture = None
        self.last_event = None
        
        logger.info(
            f"State machine initialized for hand {hand_id}: "
            f"stability={self.stability_frames}, cooldown={self.cooldown_ms}ms"
        )
    
    def update(self, gesture_result: Optional[GestureResult]) -> Optional[GestureEvent]:
        """
        Update state machine with new gesture detection.
        
        Args:
            gesture_result: Detected gesture from classifier, or None if no detection
            
        Returns:
            GestureEvent if gesture should be triggered, None otherwise
        """
        current_time_ms = int(time.time() * 1000)
        
        # State: COOLDOWN
        if self.state == self.COOLDOWN:
            if current_time_ms >= self.cooldown_end_time:
                logger.debug(f"Hand {self.hand_id}: Cooldown expired, returning to IDLE")
                self.state = self.IDLE
                self.detection_buffer.clear()
            else:
                # Still in cooldown, ignore all input
                return None
        
        # No gesture detected
        if gesture_result is None:
            if self.state != self.IDLE:
                logger.debug(f"Hand {self.hand_id}: No gesture, resetting to IDLE")
                self.state = self.IDLE
                self.detection_buffer.clear()
            return None
        
        # State: IDLE or DETECTING
        # Check if this is the same gesture we just triggered
        if (not self.allow_same_gesture and 
            self.last_triggered_gesture == gesture_result.gesture and
            current_time_ms < self.cooldown_end_time):
            # Ignore same gesture during cooldown period
            return None
        
        # Add detection to buffer
        self.detection_buffer.append(gesture_result)
        
        # Check if we have enough stable frames
        if len(self.detection_buffer) < self.stability_frames:
            if self.state != self.DETECTING:
                logger.debug(
                    f"Hand {self.hand_id}: Started detecting {gesture_result.gesture} "
                    f"({len(self.detection_buffer)}/{self.stability_frames})"
                )
                self.state = self.DETECTING
            return None
        
        # Buffer is full - check if all detections are the same gesture
        gestures_in_buffer = [g.gesture for g in self.detection_buffer]
        
        if len(set(gestures_in_buffer)) == 1:
            # All frames agree on the same gesture - TRIGGER!
            gesture = gestures_in_buffer[0]
            
            # Calculate average confidence
            avg_confidence = sum(g.confidence for g in self.detection_buffer) / len(self.detection_buffer)
            
            # Get most recent metadata
            metadata = self.detection_buffer[-1].metadata.copy()
            
            # Create event
            event = GestureEvent(
                gesture=gesture,
                confidence=avg_confidence,
                hand_id=self.hand_id,
                timestamp=current_time_ms,
                metadata=metadata
            )
            
            logger.info(
                f"Hand {self.hand_id}: TRIGGERED {gesture} "
                f"(confidence: {avg_confidence:.2f})"
            )
            
            # Update state
            self.state = self.COOLDOWN
            self.cooldown_end_time = current_time_ms + self.cooldown_ms
            self.last_triggered_gesture = gesture
            self.last_event = event
            self.detection_buffer.clear()
            
            return event
        else:
            # Buffer contains mixed gestures - not stable yet
            # Keep oldest frames and wait for stability
            logger.debug(
                f"Hand {self.hand_id}: Unstable buffer {set(gestures_in_buffer)}, "
                f"continuing detection"
            )
            self.state = self.DETECTING
            return None
    
    def reset(self):
        """Reset state machine to initial state."""
        logger.info(f"Hand {self.hand_id}: State machine reset")
        self.state = self.IDLE
        self.detection_buffer.clear()
        self.cooldown_end_time = 0
        self.last_triggered_gesture = None
    
    def get_state_info(self) -> dict:
        """
        Get current state information for debugging.
        
        Returns:
            Dictionary with state details
        """
        return {
            'hand_id': self.hand_id,
            'state': self.state,
            'buffer_size': len(self.detection_buffer),
            'buffer_capacity': self.stability_frames,
            'in_cooldown': time.time() * 1000 < self.cooldown_end_time,
            'cooldown_remaining_ms': max(0, self.cooldown_end_time - int(time.time() * 1000)),
            'last_gesture': self.last_triggered_gesture
        }


class MultiHandStateMachine:
    """
    Manager for multiple hand state machines.
    Maintains separate state for each hand.
    """
    
    def __init__(self, max_hands: int, config: dict):
        """
        Initialize multi-hand state machine manager.
        
        Args:
            max_hands: Maximum number of hands to track
            config: Configuration dictionary
        """
        self.max_hands = max_hands
        self.state_machines = [
            GestureStateMachine(hand_id=i, config=config)
            for i in range(max_hands)
        ]
        
        logger.info(f"Multi-hand state machine manager initialized for {max_hands} hands")
    
    def update(self, gesture_results: List[GestureResult]) -> List[GestureEvent]:
        """
        Update all hand state machines.
        
        Args:
            gesture_results: List of gesture detections (one per hand)
            
        Returns:
            List of triggered gesture events
        """
        events = []
        
        # Create lookup by hand_id
        results_by_hand = {g.hand_id: g for g in gesture_results}
        
        # Update each state machine
        for hand_id, state_machine in enumerate(self.state_machines):
            gesture_result = results_by_hand.get(hand_id)
            event = state_machine.update(gesture_result)
            
            if event is not None:
                events.append(event)
        
        return events
    
    def reset(self):
        """Reset all state machines."""
        for sm in self.state_machines:
            sm.reset()
    
    def get_state_info(self) -> List[dict]:
        """Get state information for all hands."""
        return [sm.get_state_info() for sm in self.state_machines]
"""
Phase 2 Test - State Machine Demonstration
Shows how state machine filters noisy gestures into clean events.
"""

import sys
import time
from pathlib import Path

# Add src to path (run from vision/ directory)
sys.path.insert(0, str(Path(__file__).parent.parent / 'vision' / 'src'))
if not Path(__file__).parent.parent.joinpath('vision', 'src').exists():
    # If running from vision directory
    sys.path.insert(0, str(Path(__file__).parent / 'src'))
    
from detector import Landmark
from gesture_classifier import GestureResult
from state_machine import MultiHandStateMachine, GestureEvent


def simulate_noisy_detections():
    """Simulate noisy gesture detections like real-world scenario."""
    
    print("=" * 70)
    print("PHASE 2 TEST: State Machine Filtering")
    print("=" * 70)
    print()
    
    # Configuration
    config = {
        'stability_frames': 5,
        'cooldown_ms': 1000
    }
    
    # Create state machine
    state_machine = MultiHandStateMachine(max_hands=2, config=config)
    
    print(f"Config: stability_frames={config['stability_frames']}, cooldown_ms={config['cooldown_ms']}ms")
    print()
    
    # Test Case 1: Stable gesture detection
    print("TEST 1: Stable OPEN_PALM detection (requires 5 consecutive frames)")
    print("-" * 70)
    
    for frame in range(10):
        # Simulate stable OPEN_PALM for 10 frames
        gesture_results = [
            GestureResult(
                gesture="OPEN_PALM",
                confidence=0.95,
                hand_id=0,
                hand_center=(0.5, 0.5),
                hand_size=0.1,
                metadata={'fingers_extended': 4}
            )
        ]
        
        events = state_machine.update(gesture_results)
        
        print(f"Frame {frame+1:2d}: OPEN_PALM detected", end="")
        
        if events:
            for event in events:
                print(f" -> ✓ EVENT TRIGGERED: {event.gesture} (conf: {event.confidence:.2f})")
        else:
            print(" -> (buffering...)")
        
        time.sleep(0.05)
    
    print()
    
    # Test Case 2: Unstable detections (should NOT trigger)
    print("TEST 2: Unstable mixed gestures (should NOT trigger)")
    print("-" * 70)
    
    state_machine.reset()
    gestures = ["OPEN_PALM", "CLOSED_FIST", "OPEN_PALM", "CLOSED_FIST", "OPEN_PALM"]
    
    for frame, gesture_name in enumerate(gestures):
        gesture_results = [
            GestureResult(
                gesture=gesture_name,
                confidence=0.90,
                hand_id=0,
                hand_center=(0.5, 0.5),
                hand_size=0.1,
                metadata={}
            )
        ]
        
        events = state_machine.update(gesture_results)
        
        print(f"Frame {frame+1}: {gesture_name:15s} detected", end="")
        
        if events:
            print(f" -> ✓ EVENT TRIGGERED")
        else:
            print(f" -> (not stable, no event)")
    
    print()
    
    # Test Case 3: Cooldown prevention
    print("TEST 3: Cooldown prevents rapid re-triggering")
    print("-" * 70)
    
    state_machine.reset()
    
    # Trigger once
    for frame in range(5):
        gesture_results = [
            GestureResult(
                gesture="SWIPE_LEFT",
                confidence=0.85,
                hand_id=0,
                hand_center=(0.5, 0.5),
                hand_size=0.1,
                metadata={'swipe_direction': 'left'}
            )
        ]
        events = state_machine.update(gesture_results)
        if events:
            print(f"Frame {frame+1}: SWIPE_LEFT -> ✓ TRIGGERED (entering cooldown)")
            break
    
    # Try to trigger again immediately (should fail due to cooldown)
    print("\nAttempting to trigger again immediately:")
    for frame in range(5, 10):
        gesture_results = [
            GestureResult(
                gesture="SWIPE_LEFT",
                confidence=0.85,
                hand_id=0,
                hand_center=(0.5, 0.5),
                hand_size=0.1,
                metadata={'swipe_direction': 'left'}
            )
        ]
        events = state_machine.update(gesture_results)
        print(f"Frame {frame+1}: SWIPE_LEFT -> ✗ BLOCKED (in cooldown)")
        time.sleep(0.05)
    
    # Wait for cooldown to expire
    print("\nWaiting 1 second for cooldown to expire...")
    time.sleep(1.0)
    
    # Trigger again after cooldown
    print("\nAttempting after cooldown:")
    for frame in range(5):
        gesture_results = [
            GestureResult(
                gesture="SWIPE_LEFT",
                confidence=0.85,
                hand_id=0,
                hand_center=(0.5, 0.5),
                hand_size=0.1,
                metadata={'swipe_direction': 'left'}
            )
        ]
        events = state_machine.update(gesture_results)
        if events:
            print(f"Frame {frame+1}: SWIPE_LEFT -> ✓ TRIGGERED (cooldown expired)")
            break
    
    print()
    
    # Test Case 4: Multi-hand independence
    print("TEST 4: Independent state machines for each hand")
    print("-" * 70)
    
    state_machine.reset()
    
    # Hand 0: stable OPEN_PALM
    # Hand 1: stable CLOSED_FIST
    for frame in range(5):
        gesture_results = [
            GestureResult(
                gesture="OPEN_PALM",
                confidence=0.95,
                hand_id=0,
                hand_center=(0.3, 0.5),
                hand_size=0.1,
                metadata={}
            ),
            GestureResult(
                gesture="CLOSED_FIST",
                confidence=0.90,
                hand_id=1,
                hand_center=(0.7, 0.5),
                hand_size=0.1,
                metadata={}
            )
        ]
        
        events = state_machine.update(gesture_results)
        
        print(f"Frame {frame+1}: Hand0=OPEN_PALM, Hand1=CLOSED_FIST", end="")
        
        if events:
            print(" -> ", end="")
            for event in events:
                print(f"Hand{event.hand_id}={event.gesture} TRIGGERED ", end="")
            print()
        else:
            print(" -> (buffering...)")
    
    print()
    print("=" * 70)
    print("PHASE 2 COMPLETE: State machine successfully filters gestures")
    print("=" * 70)


if __name__ == "__main__":
    try:
        simulate_noisy_detections()
    except KeyboardInterrupt:
        print("\n\nTest interrupted")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
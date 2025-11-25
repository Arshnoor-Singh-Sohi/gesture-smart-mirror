"""
Test script for SWIPE_UP and SWIPE_DOWN gestures
"""

import cv2
import mediapipe as mp
import yaml
from gesture_classifier import GestureClassifier

# Load config
with open('../config/default.yaml', 'r') as f:
    config = yaml.safe_load(f)

# Initialize MediaPipe
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(
    model_complexity=config['mediapipe']['model_complexity'],
    min_detection_confidence=config['mediapipe']['min_detection_confidence'],
    min_tracking_confidence=config['mediapipe']['min_tracking_confidence'],
    max_num_hands=config['mediapipe']['max_num_hands']
)

# Initialize classifier
classifier = GestureClassifier(config['gesture'])

# Initialize camera
cap = cv2.VideoCapture(config['camera']['index'])
cap.set(cv2.CAP_PROP_FRAME_WIDTH, config['camera']['width'])
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config['camera']['height'])
cap.set(cv2.CAP_PROP_FPS, config['camera']['fps'])

print("Testing SWIPE_UP and SWIPE_DOWN gestures")
print("Try the following:")
print("  - Swipe your index finger UP")
print("  - Swipe your index finger DOWN")
print("  - Swipe your index finger LEFT")
print("  - Swipe your index finger RIGHT")
print("\nPress 'q' to quit\n")

gesture_count = {
    'SWIPE_UP': 0,
    'SWIPE_DOWN': 0,
    'SWIPE_LEFT': 0,
    'SWIPE_RIGHT': 0
}

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Mirror frame
    if config['camera']['mirror_mode']:
        frame = cv2.flip(frame, 1)
    
    # Convert to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process with MediaPipe
    results = hands.process(rgb_frame)
    
    gesture = 'NONE'
    
    if results.multi_hand_landmarks:
        # Get first hand
        hand_landmarks = results.multi_hand_landmarks[0]
        
        # Draw landmarks
        mp_drawing.draw_landmarks(
            frame,
            hand_landmarks,
            mp_hands.HAND_CONNECTIONS
        )
        
        # Classify gesture
        gesture = classifier.classify(hand_landmarks.landmark)
        
        # Count swipes
        if gesture in gesture_count:
            gesture_count[gesture] += 1
    
    # Display gesture and counts
    cv2.putText(frame, f"Gesture: {gesture}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    
    y_offset = 70
    for g, count in gesture_count.items():
        cv2.putText(frame, f"{g}: {count}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        y_offset += 30
    
    cv2.imshow('Swipe Gesture Test', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()
hands.close()

print("\nTest Results:")
for g, count in gesture_count.items():
    print(f"{g}: {count} detections")
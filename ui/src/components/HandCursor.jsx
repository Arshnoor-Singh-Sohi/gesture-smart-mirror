import { useState, useEffect } from 'react';

const HandCursor = ({ gesture, landmarks }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [icon, setIcon] = useState('👆');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (landmarks && landmarks.length > 8) {
      const indexTip = landmarks[8];
      const x = indexTip.x * window.innerWidth;
      const y = indexTip.y * window.innerHeight;
      setPosition({ x, y });
    }
  }, [landmarks]);

  useEffect(() => {
    const gestureIcons = {
      'SWIPE_LEFT': '👈',
      'SWIPE_RIGHT': '👉',
      'SWIPE_UP': '👆',
      'SWIPE_DOWN': '👇',
      'OPEN_PALM': '✋',
      'CLOSED_FIST': '✊',
      'THUMBS_UP': '👍',
      'INDEX_POINTING': '☝️',
      'NONE': '👆'
    };

    setIcon(gestureIcons[gesture] || '👆');
    setIsActive(gesture && gesture !== 'NONE');
  }, [gesture]);

  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  return (
    <div
      className={`hand-cursor ${isActive ? 'gesture-active' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {icon}
    </div>
  );
};

export default HandCursor;
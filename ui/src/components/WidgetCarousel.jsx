/**
 * WidgetCarousel Component
 * Manages widget switching with animations
 */

import { useState, useEffect } from 'react';

const WidgetCarousel = ({ widgets, currentIndex, onSwipe }) => {
  const [direction, setDirection] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const CurrentWidget = widgets[currentIndex];

  // Handle swipe with animation
  useEffect(() => {
    if (direction) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setDirection(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [direction]);

  // Swipe handler
  const handleSwipe = (swipeDirection) => {
    if (isTransitioning) {
      return; // Prevent rapid swipes
    }

    setDirection(swipeDirection);
    
    if (onSwipe) {
      onSwipe(swipeDirection);
    }
  };

  // Animation classes based on direction
  const getAnimationClass = () => {
    if (!direction) {
      return '';
    }
    
    if (direction === 'left') {
      return 'animate-slide-left';
    } else if (direction === 'right') {
      return 'animate-slide-right';
    }
    return '';
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-mirror-bg">
      {/* Widget Indicators */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-3">
          {widgets.map((_, index) => (
            <div
              key={index}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === currentIndex 
                  ? 'w-12 bg-mirror-accent' 
                  : 'w-2 bg-mirror-border'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Current Widget */}
      <div className={`w-full h-full ${getAnimationClass()}`}>
        <CurrentWidget onGesture={handleSwipe} />
      </div>

      {/* Widget Name Label */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="bg-black bg-opacity-50 px-6 py-2 rounded-full backdrop-blur-sm">
          <span className="text-white text-sm font-medium">
            {['Weather', 'Calendar', 'News'][currentIndex]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WidgetCarousel;
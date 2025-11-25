/**
 * Gesture Tutorial Component
 * Shows users what each gesture does
 */

import { useState } from 'react';

const GestureTutorial = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const gestures = [
    {
      icon: '👈',
      name: 'Swipe Left',
      description: 'Navigate to previous widget',
      action: 'Move to Weather → News → Calendar'
    },
    {
      icon: '👉',
      name: 'Swipe Right',
      description: 'Navigate to next widget',
      action: 'Move to Weather → News → Calendar'
    },
    {
      icon: '👆',
      name: 'Swipe Up',
      description: 'Scroll up or select previous item',
      action: 'Navigate through news articles or calendar events'
    },
    {
      icon: '👇',
      name: 'Swipe Down',
      description: 'Scroll down or select next item',
      action: 'Navigate through news articles or calendar events'
    },
    {
      icon: '✋',
      name: 'Open Palm',
      description: 'Select/Toggle/Open',
      action: 'View details, toggle forecast, open selected item'
    },
    {
      icon: '✊',
      name: 'Closed Fist',
      description: 'Back/Close',
      action: 'Return to previous view or close details'
    },
    {
      icon: '☝️',
      name: 'Point Up',
      description: 'Scroll up quickly',
      action: 'Fast scroll in lists'
    },
    {
      icon: '👎',
      name: 'Thumbs Down',
      description: 'Toggle debug mode',
      action: 'Show/hide gesture detection overlay'
    }
  ];

  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3">
            👋 Gesture Controls Guide
          </h1>
          <p className="text-white/70 text-lg">
            Use these hand gestures to control your smart mirror
          </p>
        </div>

        {/* Gestures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {gestures.map((gesture, index) => (
            <div key={index} className="gesture-demo">
              <div className="gesture-icon">{gesture.icon}</div>
              <h3 className="text-white font-bold text-lg">{gesture.name}</h3>
              <p className="text-white/70 text-sm text-center">
                {gesture.description}
              </p>
              <div className="glass-mini-card p-2 rounded-lg mt-2">
                <p className="text-white/60 text-xs text-center">
                  {gesture.action}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Usage Examples */}
        <div className="glass-card p-6 rounded-2xl mb-6">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <span>💡</span>
            Quick Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-mini-card p-4 rounded-xl">
              <div className="text-2xl mb-2">📰</div>
              <p className="text-white/80 text-sm">
                <strong>Reading News:</strong> Swipe up/down to browse headlines, 
                open palm to read full article
              </p>
            </div>
            <div className="glass-mini-card p-4 rounded-xl">
              <div className="text-2xl mb-2">🌤️</div>
              <p className="text-white/80 text-sm">
                <strong>Weather:</strong> Open palm to toggle between current 
                weather and 5-day forecast
              </p>
            </div>
            <div className="glass-mini-card p-4 rounded-xl">
              <div className="text-2xl mb-2">📅</div>
              <p className="text-white/80 text-sm">
                <strong>Calendar:</strong> Swipe through events, open palm 
                to see full event details
              </p>
            </div>
          </div>
        </div>

        {/* Hand Position Tips */}
        <div className="glass-card p-6 rounded-2xl mb-6">
          <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <span>🎯</span>
            Best Practices
          </h3>
          <div className="space-y-3 text-white/80">
            <div className="flex items-start gap-3">
              <span className="text-xl">✓</span>
              <p>Hold your hand 1-2 feet from the camera for best detection</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">✓</span>
              <p>Make clear, deliberate gestures with your dominant hand</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">✓</span>
              <p>Ensure good lighting - avoid backlighting or shadows</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">✓</span>
              <p>Wait briefly between gestures for system to respond</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="glass-card w-full p-4 rounded-2xl text-white font-semibold text-lg hover:bg-white/20 transition-all"
        >
          Got it! Let's start 🚀
        </button>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-4 text-center">
          <p className="text-white/50 text-sm">
            💡 Keyboard shortcuts: Arrow keys to navigate • D for debug • C for camera • G for this guide
          </p>
        </div>
      </div>
    </div>
  );
};

export default GestureTutorial;
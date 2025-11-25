# Gesture-Controlled Smart Mirror - UI

React-based user interface for the gesture-controlled smart mirror system.

## Features

- **Widget Carousel**: Navigate between Weather, Calendar, and News widgets
- **Gesture-Driven Navigation**: 
  - SWIPE_LEFT/RIGHT: Switch between widgets
  - OPEN_PALM: Toggle widget details
  - SWIPE_UP/DOWN: Scroll within widgets
  - CLOSED_FIST: Toggle debug overlay
- **WebSocket Connection**: Real-time gesture events from Python vision engine
- **Debug Overlay**: Development tools showing gestures, FPS, latency
- **Auto-Reconnect**: Robust WebSocket connection with exponential backoff

## Directory Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── App.jsx                    # Main app component
│   │   ├── WidgetCarousel.jsx         # Widget navigation
│   │   ├── WeatherWidget.jsx          # Weather display
│   │   ├── CalendarWidget.jsx         # Calendar events
│   │   ├── NewsWidget.jsx             # News headlines
│   │   └── GestureDebugOverlay.jsx    # Debug overlay
│   ├── hooks/
│   │   ├── useWebSocket.js            # WebSocket connection hook
│   │   └── useGestures.js             # Gesture state hook
│   ├── services/
│   │   ├── websocket.js               # WebSocket client
│   │   └── mockData.js                # Mock widget data
│   ├── styles/
│   │   └── index.css                  # Global styles
│   └── main.jsx                       # Entry point
├── public/                            # Static assets
├── index.html                         # Root HTML
├── package.json                       # Dependencies
├── vite.config.js                     # Vite configuration
├── tailwind.config.js                 # Tailwind CSS config
└── README.md                          # This file
```

## Prerequisites

- Node.js 18+ and npm
- Python vision engine running on ws://localhost:8765/ws

## Installation

```bash
cd ui
npm install
```

## Development

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

The development server will start at http://localhost:3000

## Configuration

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` to configure WebSocket URL:

```
VITE_WS_URL=ws://localhost:8765/ws
```

## Usage

### Starting the UI

1. **Start Python vision engine** (in another terminal):
   ```bash
   cd ../vision
   python src/main.py
   ```

2. **Start UI development server**:
   ```bash
   npm run dev
   ```

3. **Open browser**: Navigate to http://localhost:3000

### Gesture Controls

| Gesture | Action |
|---------|--------|
| SWIPE_LEFT | Previous widget |
| SWIPE_RIGHT | Next widget |
| OPEN_PALM | Toggle widget details |
| SWIPE_UP | Scroll up (within widget) |
| SWIPE_DOWN | Scroll down (within widget) |
| CLOSED_FIST | Toggle debug overlay |

### Keyboard Shortcuts (Development)

| Key | Action |
|-----|--------|
| D | Toggle debug overlay |
| C | Clear gesture history |
| ← | Previous widget |
| → | Next widget |

## Widgets

### Weather Widget
- Current temperature and conditions
- 5-day forecast (toggle with OPEN_PALM)
- Humidity and wind speed

### Calendar Widget
- Today's events list
- Scroll with SWIPE_UP/DOWN
- View details with OPEN_PALM

### News Widget
- Latest headlines
- Scroll with SWIPE_UP/DOWN
- Read article with OPEN_PALM

## Debug Overlay

Press 'D' or use CLOSED_FIST gesture to toggle debug overlay showing:
- Connection status
- FPS and latency
- Last detected gesture
- Gesture history (last 10)
- Gesture legend

## WebSocket Protocol

The UI connects to the Python vision engine via WebSocket and expects these message types:

### Incoming (from vision engine):
```json
{
  "type": "gesture",
  "gesture": "SWIPE_LEFT",
  "confidence": 0.95,
  "hand_id": 0,
  "timestamp": 1234567890,
  "metadata": {...}
}
```

### Outgoing (to vision engine):
```json
{
  "type": "config",
  "settings": {
    "debug_mode": true,
    "sensitivity": 1.0
  }
}
```

## Troubleshooting

### UI Not Connecting

**Problem**: Red "Not connected" banner at top

**Solutions**:
1. Verify Python vision engine is running:
   ```bash
   cd ../vision
   python src/main.py
   ```
2. Check WebSocket URL in `.env` matches vision server
3. Check browser console for connection errors

### Gestures Not Working

**Problem**: Gestures detected but UI not responding

**Solutions**:
1. Toggle debug overlay (press 'D') to see if gestures are received
2. Verify gesture names match expected values
3. Check browser console for JavaScript errors

### Slow Performance

**Problem**: UI feels laggy or animations stutter

**Solutions**:
1. Check FPS in debug overlay (should be 30+ fps)
2. Reduce number of gesture history items displayed
3. Use production build: `npm run build && npm run preview`

## Development Notes

### Adding New Widgets

1. Create widget component in `src/components/`
2. Import in `App.jsx`
3. Add to `widgets` array
4. Implement `onGesture` prop for gesture handling

### Modifying Gesture Mappings

Edit gesture handlers in `App.jsx`:
```javascript
const handleGestureCommand = (gesture) => {
  switch (gesture) {
    case 'YOUR_GESTURE':
      // Your action
      break;
  }
};
```

### Customizing Styles

- Global styles: `src/styles/index.css`
- Tailwind config: `tailwind.config.js`
- Custom colors defined in Tailwind config under `theme.extend.colors`

## Testing Phase 3

1. Start vision engine
2. Start UI
3. Verify WebSocket connection (green indicator)
4. Test gestures:
   - Swipe left/right to navigate widgets
   - Open palm within widgets
   - Verify debug overlay shows gestures
5. Test keyboard shortcuts

## Next Phase

Phase 4 will focus on integration testing and end-to-end validation.
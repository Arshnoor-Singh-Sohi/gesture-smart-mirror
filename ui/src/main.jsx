/**
 * Main entry point for React application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
// import './styles/index.css';
import './index.css';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

{/* <div className="bg-red-500 text-white p-10 text-4xl">
  Tailwind Test Works 🚀
</div> */}

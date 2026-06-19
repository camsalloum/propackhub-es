import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress external library errors (search analyzer)
window.addEventListener('error', (event) => {
  if (event.message?.includes('Search engine null')) {
    event.preventDefault();
  }
});

// Suppress unhandled promise rejections from search analyzer
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Search engine null')) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA (if available)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('Service worker registration failed:', err);
    });
  });
}
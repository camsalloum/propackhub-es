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

// PWA service worker — production only. In dev, a registered SW intercepts Vite
// module requests (/@fs, /src, HMR) and causes "Failed to convert value to Response".
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('Service worker registration failed:', err);
      });
    });
  } else {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }
}
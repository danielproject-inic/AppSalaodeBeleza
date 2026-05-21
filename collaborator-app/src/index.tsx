import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SalonProvider } from './contexts/SalonContext';
import './index.css';
import './NeonBento.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element");
}

// Prevent scrolling on number inputs globally
document.addEventListener('wheel', (event) => {
  const target = event.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    target.blur();
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SalonProvider>
      <App />
    </SalonProvider>
  </React.StrictMode>
);
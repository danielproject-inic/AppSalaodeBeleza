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

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SalonProvider>
      <App />
    </SalonProvider>
  </React.StrictMode>
);
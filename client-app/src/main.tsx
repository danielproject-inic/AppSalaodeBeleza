import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SalonProvider } from './contexts/SalonContext.tsx'

// Prevent scrolling on number inputs globally
document.addEventListener('wheel', (event) => {
  const target = event.target as HTMLInputElement;
  if (target && target.tagName === 'INPUT' && target.type === 'number') {
    target.blur();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SalonProvider>
      <App />
    </SalonProvider>
  </StrictMode>,
)

import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Cleanup any existing service workers on native platforms
if (Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then(registrations => registrations.forEach(registration => 
      registration.unregister().catch(() => {})
    ))
    .catch(() => {});
}

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <Router>
    <App />
  </Router>
);

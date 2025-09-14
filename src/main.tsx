import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import { IS_NATIVE } from './lib/platform/nativeFlags'
import App from './App.tsx'
import './index.css'

// Cleanup any existing service workers on native platforms
if (IS_NATIVE && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then(registrations => registrations.forEach(registration => 
      registration.unregister().catch(() => {})
    ))
    .catch(() => {});
}

const Router = IS_NATIVE ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <Router>
    <App />
  </Router>
);

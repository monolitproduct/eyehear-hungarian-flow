import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <Router>
    <App />
  </Router>
);

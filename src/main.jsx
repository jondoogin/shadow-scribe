import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './utils/analytics.js'

// Initialise analytics before the app mounts.
// No-op unless VITE_PLAUSIBLE_DOMAIN is set in the deployment environment.
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './global.css'
import App from './App.jsx'
import { restoreSession } from './data/auth'

// Check the login cookie first, so a refresh doesn't flash the logged-out site
restoreSession().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Lataa moderation service globaalisti testejä varten
import moderationService from './utils/moderation.js'
window.moderationService = moderationService

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

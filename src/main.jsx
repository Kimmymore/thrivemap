import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted Space Grotesk, latin subset only, woff2.
// Deliberately not Google Fonts: a third-party font CDN would undermine the
// "nothing is saved, no tracking" promise and blocks first render.
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

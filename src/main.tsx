import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite, precached by the service worker for offline use).
// Replaces the previous Google Fonts CDN <link> tags in index.html, which broke offline.
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/cinzel/900.css'
import '@fontsource/cinzel-decorative/400.css'
import '@fontsource/cinzel-decorative/700.css'
import '@fontsource/cinzel-decorative/900.css'
import '@fontsource/forum/400.css'
// Instrument Sans — client UI body font (mockup restyle)
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/instrument-sans/400-italic.css'
import './styles/globals.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

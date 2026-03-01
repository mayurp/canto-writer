import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/common.css'
import App from './App.tsx'
import { initAudioUnlock } from './utils/unlockAudio'
import './utils/simplifyDebugging.ts'

// Workaround to make audio work on iPad Safari
initAudioUnlock()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root container missing in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

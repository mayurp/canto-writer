import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './utils/simplify-debugging'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root container missing in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

serviceWorkerRegistration.register()

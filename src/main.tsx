import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.pcss'
import App from './App.tsx'
import { initAuth } from './auth/authService'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

// Kick off tenant registration + key-pair generation immediately.
// The promise is stored inside authService so getBearerToken() will await it
// automatically — no need to block rendering here.
void initAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.pcss'
import App from './App.tsx'
import { initializeTenant } from './auth/tenant'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}

/**
 * Ensure tenant registration and key-pair initialization complete before the
 * React tree mounts.  Every authenticated API call inside the app depends on
 * the auth state being ready, so we block rendering until it is.
 *
 * On failure we surface a minimal error message rather than a blank screen.
 */
async function bootstrap() {
  const root = createRoot(document.getElementById('root')!)

  try {
    await initializeTenant()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    root.render(
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#b00' }}>
        <strong>Failed to initialize wallet.</strong>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#555' }}>
          {message}
        </p>
      </div>
    )
    return
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void bootstrap()
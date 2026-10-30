import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { applyTheme, watchSystemTheme } from './lib/theme'
import { reloadForNewBuild } from './lib/chunkReload'
import './index.css'

applyTheme()
watchSystemTheme()

// A lazy page from an older build failed to load: fetch the new build instead.
window.addEventListener('vite:preloadError', event => {
  if (reloadForNewBuild()) event.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

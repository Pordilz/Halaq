import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
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

// The native WebView serves the SPA from a local origin (https://localhost on
// Android, capacitor://localhost on iOS) with no server-side SPA fallback, so
// reloading /stock/AAPL (or following a link to it) 404s under BrowserRouter.
// Hash URLs are resolved entirely in the WebView and survive reloads/offline.
//
// Runtime detection is the primary signal — it also covers a production web
// bundle dropped into a native shell. The build flag is a belt-and-braces
// fallback for `vite build --mode android|ios`. Either signal is enough; on
// normal web builds both are absent so we keep clean path URLs.
const buildPlatform = import.meta.env.VITE_PLATFORM || import.meta.env.MODE
const isNative =
  Capacitor.isNativePlatform() ||
  buildPlatform === 'android' ||
  buildPlatform === 'ios'
const Router = isNative ? HashRouter : BrowserRouter

if (isNative) {
  // Custom-scheme deep links (com.halaq.app://stock/AAPL) are registered in
  // the Android manifest and iOS Info.plist. Map them onto the hash route so
  // the router picks them up on both cold start and resume. getLaunchUrl()
  // covers the cold-start event that can fire before React mounts.
  const openDeepLink = url => {
    const prefix = 'com.halaq.app://'
    if (typeof url !== 'string' || !url.toLowerCase().startsWith(prefix)) return
    const [rawPath = '', rawQuery] = url.slice(prefix.length).split('?')
    const path = `/${rawPath.replace(/^\/+/, '')}`
    if (path === '/') return
    const target = `#${path}${rawQuery ? `?${rawQuery}` : ''}`
    if (window.location.hash !== target) window.location.hash = target
  }

  CapacitorApp.getLaunchUrl()
    .then(({ url } = {}) => openDeepLink(url))
    .catch(() => {})
  CapacitorApp.addListener('appUrlOpen', ({ url }) => openDeepLink(url))
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </React.StrictMode>,
)

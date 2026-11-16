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
  //
  // The incoming URL is untrusted, so require the exact scheme, a known
  // route, and only the query keys this app actually reads. Everything else
  // is dropped rather than reflected into window.location.hash.
  const DEEP_LINK_SCHEME = 'com.halaq.app://'
  const ROUTE_PREFIXES = [
    '/stock/', '/etf/', '/jobs', '/screener', '/watchlist', '/learn',
    '/batch', '/chat', '/profile', '/settings', '/upgrade', '/legal',
    '/home', '/pricing', '/plans',
  ]
  const QUERY_KEYS = ['url', 'q', 'tier', 'upgrade']

  const openDeepLink = raw => {
    if (typeof raw !== 'string') return
    const value = raw.trim()
    if (value.slice(0, DEEP_LINK_SCHEME.length).toLowerCase() !== DEEP_LINK_SCHEME) return
    const rest = value.slice(DEEP_LINK_SCHEME.length)
    if (!rest || rest.includes('#') || /[\\\u0000-\u001f\u007f]/.test(rest)) return

    const qIndex = rest.indexOf('?')
    const rawPath = qIndex === -1 ? rest : rest.slice(0, qIndex)
    const rawQuery = qIndex === -1 ? '' : rest.slice(qIndex + 1)
    // A leading "//" would be parsed as a host by URL parsers; never allow it.
    if (!rawPath || rawPath.startsWith('//')) return

    let path
    try {
      path = decodeURIComponent(rawPath)
    } catch {
      return
    }
    if (/[\\\u0000-\u001f\u007f]/.test(path)) return
    if (path.split('/').some(segment => segment === '..' || segment === '.')) return
    const route = `/${path.replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')
    const knownRoute = ROUTE_PREFIXES.some(prefix =>
      prefix.endsWith('/')
        ? route.startsWith(prefix) && route.length > prefix.length
        : route === prefix || route.startsWith(`${prefix}/`),
    )
    if (!knownRoute) return

    const incoming = new URLSearchParams(rawQuery)
    const clean = new URLSearchParams()
    for (const key of QUERY_KEYS) {
      for (const candidate of incoming.getAll(key)) {
        // `url` is consumed by the job screener: allow bare domains, but if a
        // scheme is present it must be http(s), never javascript:/data:.
        if (key === 'url' && /^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
          let ok = false
          try {
            ok = ['http:', 'https:'].includes(new URL(candidate).protocol)
          } catch {}
          if (!ok) continue
        }
        clean.append(key, candidate)
      }
    }
    const query = clean.toString()
    const target = `#${route}${query ? `?${query}` : ''}`
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

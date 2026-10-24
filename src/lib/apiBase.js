// Single source of truth for the API base URL.
//
// In web dev/production:  empty string → calls hit "/api/..." on the same
//                         origin (Vite proxy in dev, Vercel rewrites in prod).
// In the Capacitor build: set VITE_API_BASE_URL to your production Vercel URL
//                         (e.g. https://halaq.app) so calls leave the webview
//                         shell and hit the live API.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${p}`
}

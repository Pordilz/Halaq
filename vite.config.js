import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mirrors the Content-Security-Policy header set in vercel.json. Native
// WebViews load the built files from a local origin and never see Vercel's
// headers, so the same policy is embedded as a meta tag in build output only.
// Dev is untouched so Vite's HMR client and inline dev scripts still work.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co https://api.gleif.org https://halaq.app https://*.lemonsqueezy.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function nativeCspMeta() {
  return {
    name: 'halaq-native-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ],
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), nativeCspMeta()],
  build: {
    // Vite 5's default. Vite 7+ defaults to Chrome 111 / Safari 16.4, which
    // rewrites media queries to range syntax that older Android WebViews
    // and iOS < 16.4 ignore.
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      }
    }
  },
})

// Pre-paint theme bootstrap. Externalized from index.html so the document can
// run under a strict CSP (script-src 'self') without inline script exceptions.
// Keep this in sync with src/lib/theme.js.
document.documentElement.classList.add('js')

try {
  var pref = localStorage.getItem('halaq_theme')
  var dark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
} catch (e) {}

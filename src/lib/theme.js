// Appearance: 'system' | 'light' | 'dark', saved per device. The resolved
// theme lands on <html data-theme>, which src/index.css keys the dark tokens
// on. index.html applies it before first paint too, so there's no flash.

const STORAGE_KEY = 'halaq_theme'
const PREFERENCES = ['system', 'light', 'dark']
const darkQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return PREFERENCES.includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

const resolve = preference =>
  preference === 'system' ? (darkQuery?.matches ? 'dark' : 'light') : preference

export function applyTheme(preference = getThemePreference()) {
  const theme = resolve(preference)
  document.documentElement.dataset.theme = theme
  syncStatusBar(theme)
  return theme
}

export function setThemePreference(preference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Storage disabled — the choice still applies for this session.
  }
  return applyTheme(preference)
}

// Follow the OS setting while the preference is 'system'.
export function watchSystemTheme() {
  const onChange = () => {
    if (getThemePreference() === 'system') applyTheme('system')
  }
  darkQuery?.addEventListener?.('change', onChange)
  return () => darkQuery?.removeEventListener?.('change', onChange)
}

// Android app only: match the native status bar to the page.
async function syncStatusBar(theme) {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    // Style.Dark = light icons for a dark bar; Style.Light = dark icons.
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0f141a' : '#f8f9fb' })
  } catch {
    // Plugin unavailable — keep the capacitor.config.json defaults.
  }
}

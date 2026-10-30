// After a deploy, a tab still running the previous build asks for chunk files
// that no longer exist. Reloading once picks up the new build; the timestamp
// stops a reload loop if a chunk is genuinely broken.
const KEY = 'halaq_chunk_reload_at'
const WINDOW_MS = 10_000

const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|not a valid JavaScript MIME type|Unable to preload CSS/i

export function isChunkLoadError(error) {
  return CHUNK_ERROR.test(String(error?.message ?? error ?? ''))
}

/** Reloads the page unless it already did so moments ago. Returns whether it reloaded. */
export function reloadForNewBuild({ storage = globalThis.sessionStorage, now = Date.now(), reload = () => window.location.reload() } = {}) {
  // Without storage there is no way to tell a first failure from a loop, so
  // leave it to the error screen's Refresh button.
  try {
    const last = Number(storage.getItem(KEY)) || 0
    if (now - last < WINDOW_MS) return false
    storage.setItem(KEY, String(now))
  } catch {
    return false
  }
  reload()
  return true
}

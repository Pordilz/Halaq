// Post-login redirect targets come from the URL (?redirect=...), so only
// same-app paths are allowed: a single leading "/", never "//" or a
// backslash (browsers read "//host" and "/\host" as another site), and no
// control characters. Anything else falls back.
export function safeRedirect(target, fallback = '/home') {
  if (typeof target !== 'string' || !target.startsWith('/')) return fallback
  if (target.startsWith('//') || target.includes('\\') || /[\u0000-\u001f\u007f]/.test(target)) {
    return fallback
  }
  return target
}

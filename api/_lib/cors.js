/**
 * Shared CORS policy for every API function.
 *
 * Vercel cannot interpolate environment variables into vercel.json `headers`,
 * so a static header there can't express a real origin allowlist (a literal
 * `*` would open every authorized endpoint to any site). Instead we enforce
 * the allowlist here, at request time, and echo the exact request Origin only
 * when it is on the list.
 *
 * Allowed origins:
 *   - the production web app: APP_ORIGIN (comma-separated allowed), falling
 *     back to VITE_APP_URL for backwards compatibility;
 *   - capacitor://localhost — Capacitor iOS WebView;
 *   - https://localhost    — iOS/modern WebView + local HTTPS dev;
 *   - http://localhost     — Capacitor Android WebView / plain local dev.
 *
 * `Vary: Origin` is always set so CDNs/proxies key cached responses by origin
 * and never serve one origin's ACAO header to another.
 */

// Schemed localhost origins used by the native shells and local development.
// These carry no credentials of their own and cannot be controlled by a
// remote site, so listing them explicitly is safe.
const LOCAL_ORIGINS = [
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
];

const normalize = (value) => String(value).trim().replace(/\/+$/, '');

/** The full, explicit allowlist for this deployment. */
export function allowedOrigins() {
  const configured = process.env.APP_ORIGIN || process.env.VITE_APP_URL || '';
  const web = configured
    .split(',')
    .map(normalize)
    .filter(Boolean);
  return [...LOCAL_ORIGINS, ...web];
}

/** True only when `origin` exactly matches an allowlisted origin. */
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  const normalized = normalize(origin);
  return allowedOrigins().some((allowed) => allowed.toLowerCase() === normalized.toLowerCase());
}

/**
 * Apply CORS headers to a request and return the (normalized) Origin, or null
 * when the origin is absent/disallowed. Call at the top of every handler,
 * before the method / OPTIONS checks, so preflights get the same policy.
 */
export function applyCors(req, res) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers?.origin;
  if (origin && isAllowedOrigin(origin)) {
    // Reflect the exact request origin (never a wildcard) so credentialed
    // Authorization: Bearer requests from the app are permitted.
    res.setHeader('Access-Control-Allow-Origin', origin);
    return normalize(origin);
  }
  return null;
}

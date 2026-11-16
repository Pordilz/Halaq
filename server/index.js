/**
 * Halaq local API server (dev only).
 *
 * Mounts the Vercel functions in /api as Express routes, so local dev runs
 * exactly the code production runs (rate limits, caching, CORS preflight)
 * instead of a hand-maintained copy. In production, requests go directly to
 * the Vercel functions.
 */

import express from 'express';
import cors from 'cors';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { isAllowedOrigin } from '../api/_lib/cors.js';

const app = express();
const PORT = process.env.PORT || 3005;
const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'api');

// Don't advertise the framework/version to every caller.
app.disable('x-powered-by');

// Only honour X-Forwarded-* from a proxy we actually control. TRUST_PROXY is
// the number of trusted hops (0/unset = direct connections only, which is the
// safe local default). api/_lib/supabase.js reads the same value when it
// decides whether a forwarding header may be used as the anon-quota IP, so a
// client cannot reset its quota by inventing x-real-ip/x-forwarded-for.
const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
app.set('trust proxy', Number.isFinite(trustProxy) && trustProxy > 0 ? Math.floor(trustProxy) : 0);

// Same explicit allowlist the Vercel functions use (api/_lib/cors.js). The
// `cors` middleware answers OPTIONS preflights before the handlers run, so
// this must apply the identical policy to local dev.
app.use(cors({
  origin(origin, callback) {
    // Non-browser / same-origin callers send no Origin and are always fine.
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false); // omit ACAO so the browser blocks it
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// api/screen/[ticker].js → /api/screen/:ticker. Files under api/_lib are
// helpers, not functions — Vercel skips underscore-prefixed paths too.
async function discoverFunctions(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await discoverFunctions(full)));
    else if (entry.name.endsWith('.js')) found.push(full);
  }
  return found;
}

function routeFor(file) {
  const path = relative(API_DIR, file).split(sep).join('/').replace(/\.js$/, '');
  return '/api/' + path.replace(/\[([^\]]+)\]/g, ':$1');
}

// Vercel handlers read route params from req.query and get a parsed JSON
// body unless they opt out (the Lemon Squeezy webhook reads the raw body to
// check its signature). Express 5's req.query is a getter, so redefine it.
function adapt(handler) {
  return (req, res, next) => {
    Object.defineProperty(req, 'query', {
      value: { ...req.query, ...req.params },
      configurable: true,
      enumerable: true,
    });
    Promise.resolve(handler(req, res)).catch(next);
  };
}

for (const file of await discoverFunctions(API_DIR)) {
  const mod = await import(pathToFileURL(file).href);
  const rawBody = mod.config?.api?.bodyParser === false;
  const route = routeFor(file);
  const middleware = rawBody ? [] : [express.json({ limit: '128kb' })];
  app.all(route, ...middleware, adapt(mod.default));
  console.log(`  ${route}`);
}

app.listen(PORT, () => {
  console.log(`\n  Halaq API server: http://localhost:${PORT}\n`);
});

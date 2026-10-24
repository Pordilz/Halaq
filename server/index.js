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

const app = express();
const PORT = process.env.PORT || 3005;
const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'api');

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.VITE_APP_URL || true)
    : true,
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

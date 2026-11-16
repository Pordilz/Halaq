/**
 * DNS-rebinding-safe HTTP(S) client primitive.
 *
 * `safeFetch` (job-posting.js) validates the IP addresses a hostname resolves
 * to, then calls `pinnedFetch` with one of those already-validated addresses.
 * `pinnedFetch` opens the TCP/TLS connection with a `lookup` callback that
 * *always* returns that address, so the connection can never be redirected to
 * a different (e.g. private/metadata) IP between validation and connect — the
 * TOCTOU window that plain `fetch(url)` leaves open.
 *
 * TLS still presents and validates the real hostname via `servername`, and the
 * original `Host` header is preserved. This module deliberately has no
 * external dependencies (uses only node:http/node:https).
 */

import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export const DEFAULT_MAX_BYTES = 2_000_000;

/**
 * Perform one GET to `url`, connecting only to `pinned.address`.
 *
 * @param {URL} url
 * @param {object}   opts
 * @param {{address:string, family:number}} opts.pinned  Validated IP + family.
 *                                                       Required on purpose:
 *                                                       there is no DNS fallback.
 * @param {AbortSignal} [opts.signal]                     Bounds connect + body read.
 * @param {object} [opts.headers]                         Extra request headers.
 * @param {number} [opts.maxBytes]                        Body cap (bytes).
 * @returns {Promise<{status:number, ok:boolean, headers:Headers, text:() => Promise<string>}>}
 *          A minimal Response-like shape; intentionally no WHATWG `Response`
 *          so non-standard-but-blocked statuses such as 999 survive intact.
 */
export function pinnedFetch(url, { pinned, signal, headers = {}, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  if (!pinned?.address || !pinned.family) {
    // Fail closed: never resolve DNS ourselves. Doing so would reintroduce the
    // validation/connect race this helper exists to remove.
    return Promise.reject(Object.assign(new Error('pinnedFetch requires a validated address'), { name: 'PinError' }));
  }

  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const port = url.port ? Number(url.port) : (isHttps ? 443 : 80);

    let settled = false;
    const succeed = value => { if (!settled) { settled = true; resolve(value); } };
    const fail = err => { if (!settled) { settled = true; reject(err); } };

    const req = transport.request({
      protocol: url.protocol,
      hostname: host,
      port,
      method: 'GET',
      path: `${url.pathname}${url.search}`,
      // Pin DNS: net/net.connect calls this instead of the system resolver.
      // Node >= 22 requests `all: true` and expects an array of {address,
      // family}; older versions expect (err, address, family). Handle both.
      lookup: (_hostname, options, cb) => {
        if (options?.all) cb(null, [{ address: pinned.address, family: pinned.family }]);
        else cb(null, pinned.address, pinned.family);
      },
      // TLS must announce/validate the real hostname, not the raw IP we dial.
      servername: net.isIP(host) ? undefined : host,
      // One-off connection per request: no pooled socket can bypass the pin.
      agent: false,
      headers: { Host: url.host, ...headers },
      signal,
    }, res => {
      const resHeaders = new Headers();
      for (const [name, value] of Object.entries(res.headers)) {
        if (Array.isArray(value)) value.forEach(v => resHeaders.append(name, v));
        else if (value != null) resHeaders.set(name, String(value));
      }

      const chunks = [];
      let size = 0;
      const result = () => ({
        status: res.statusCode || 0,
        ok: res.statusCode >= 200 && res.statusCode < 300,
        headers: resHeaders,
        text: async () => Buffer.concat(chunks).toString('utf8'),
      });

      res.on('data', chunk => {
        if (settled) return;
        if (size + chunk.length > maxBytes) {
          const keep = Math.max(0, maxBytes - size);
          if (keep > 0) chunks.push(chunk.subarray(0, keep));
          size = maxBytes;
          req.destroy(); // stop streaming; we have our cap
          succeed(result());
        } else {
          size += chunk.length;
          chunks.push(chunk);
        }
      });
      res.on('end', () => succeed(result()));
      res.on('error', fail);
      res.on('aborted', () => fail(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });

    // Preserve the AbortError name so callers can distinguish timeouts.
    req.on('error', fail);
    req.end();
  });
}

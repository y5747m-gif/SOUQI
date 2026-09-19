'use strict';
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createPlaces, ApiError } = require('./places');
const ROOT = path.resolve(__dirname, '..');
const STATIC = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/souqi.html', ['souqi.html', 'text/html; charset=utf-8']],
  ['/README.md', ['README.md', 'text/plain; charset=utf-8']],
  ...['هوية_سوقي_الالوان.html', 'خطة_جمع_البيانات.md'].map(f => ['/' + f, [f, f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8']]),
  ...['souqi-icon.svg', 'souqi-icon.png', ...[32, 64, 128, 180, 192, 256, 512].map(n => `souqi-icon-${n}.png`)].map(f => ['/' + f, [f, f.endsWith('.svg') ? 'image/svg+xml' : 'image/png']])
]);
function positiveInt(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 100000) throw new Error('Invalid server limit configuration');
  return n;
}
function limiter(perIp, globalLimit, now = Date.now) {
  const clients = new Map(); let window = 0, total = 0;
  return ip => {
    const tick = Math.floor(now() / 60000);
    if (tick !== window) { window = tick; total = 0; clients.clear(); }
    if (total >= globalLimit || (clients.get(ip) || 0) >= perIp) return false;
    total++; clients.set(ip, (clients.get(ip) || 0) + 1); return true;
  };
}
async function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE');
  if (Number(req.headers['content-length']) > 4096) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ApiError(400, 'INVALID_INPUT'); }
}
function createServer({ env = process.env, fetchImpl, now } = {}) {
  const places = createPlaces({ apiKey: env.GOOGLE_PLACES_API_KEY?.trim(), fetchImpl });
  const allowed = (env.APP_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean).map(s => new URL(s).origin);
  if (env.NODE_ENV === 'production' && !allowed.length) throw new Error('APP_ORIGINS is required in production');
  const take = limiter(positiveInt(env.PLACES_PER_IP_PER_MINUTE, 20), positiveInt(env.PLACES_GLOBAL_PER_MINUTE, 100), now);
  const maxConcurrent = positiveInt(env.PLACES_MAX_CONCURRENT, 4);
  let inflight = 0;
  return http.createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 8192 }, async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
    const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://souqi.internal');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.startsWith('/api/')) {
        if (!['/api/places/search', '/api/places/area'].includes(pathname)) throw new ApiError(404, 'NOT_FOUND');
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new ApiError(405, 'METHOD_NOT_ALLOWED'); }
        const origin = req.headers.origin;
        if (req.headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'FORBIDDEN');
        if (origin) {
          let accepted = false;
          try { accepted = allowed.length ? allowed.includes(new URL(origin).origin) : new URL(origin).host === req.headers.host; } catch { /* deny opaque/malformed origins */ }
          if (!accepted) throw new ApiError(403, 'FORBIDDEN');
        }
        // Forwarded headers are ignored unless deployment explicitly trusts its proxy.
        const ip = env.TRUST_PROXY === 'true' ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',')[0].trim() : req.socket.remoteAddress;
        if (!take(ip) || inflight >= maxConcurrent) throw new ApiError(429, 'RATE_LIMITED');
        inflight++;
        try {
          const body = await readJson(req);
          const result = await (pathname.endsWith('/search') ? places.search(body) : places.area(body));
          json(200, result);
        } finally { inflight--; }
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); throw new ApiError(405, 'METHOD_NOT_ALLOWED'); }
      const file = STATIC.get(pathname);
      if (!file) throw new ApiError(404, 'NOT_FOUND');
      const data = await fs.readFile(path.join(ROOT, file[0]));
      res.writeHead(200, { 'Content-Type': file[1], 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (err) {
      // Never return or log Google response bodies, request bodies, key, or raw exceptions.
      const safe = err instanceof ApiError ? err : new ApiError(502, 'PLACES_UNAVAILABLE');
      if (safe.status === 429) res.setHeader('Retry-After', '60');
      if (!res.headersSent && !res.destroyed) json(safe.status, { error: { code: safe.code, message: safe.message } });
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = createServer();
  server.listen(port, '0.0.0.0', () => console.log(`SOUQI is listening on port ${port}. Places key ${process.env.GOOGLE_PLACES_API_KEY?.trim() ? 'configured' : 'not configured'}.`));
}
module.exports = { createServer, limiter };

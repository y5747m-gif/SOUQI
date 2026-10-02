import http from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(new URL('..', import.meta.url))));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.ico', 'image/x-icon']
]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const rel = decoded && !decoded.endsWith('/') ? decoded : 'index.html';
  const full = normalize(join(root, rel));
  return full.startsWith(root) ? full : join(root, 'index.html');
}

const server = http.createServer(async (req, res) => {
  try {
    const file = safePath(req.url || '/');
    const stat = await fs.stat(file).catch(() => null);
    const finalFile = stat?.isFile() ? file : join(root, 'index.html');
    res.setHeader('Cache-Control', finalFile.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600');
    res.setHeader('Content-Type', types.get(extname(finalFile)) || 'application/octet-stream');
    createReadStream(finalFile).pipe(res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('خطأ في تشغيل خادم فهيم');
  }
});

server.listen(port, host, () => {
  console.log(`Faheem study app is running on http://${host}:${port}`);
});

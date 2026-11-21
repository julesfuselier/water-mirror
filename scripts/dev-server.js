// Local dev server: serves public/ and the API routes the same way Vercel does.
// Usage: npm run dev  ->  http://localhost:3000

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const REWRITES = { '/update': '/api/update' }; // keep in sync with vercel.json

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

async function serveStatic(pathname, res) {
  let file = normalize(join(PUBLIC, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC)) return false;
  try {
    const info = await stat(file).catch(() => null);
    if (info?.isDirectory()) file = join(file, 'index.html');
    else if (!info && !extname(file)) file += '.html'; // cleanUrls, like vercel.json
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = REWRITES[url.pathname] ?? url.pathname;

  if (pathname.startsWith('/api/')) {
    const file = normalize(join(ROOT, `${pathname}.js`));
    const exists = file.startsWith(join(ROOT, 'api')) && (await stat(file).catch(() => null));
    if (exists) {
      try {
        const mod = await import(pathToFileURL(file).href);
        return await mod.default(req, res);
      } catch (err) {
        console.error(err);
        return res.writeHead(500, { 'Content-Type': 'text/plain' }).end(String(err.message));
      }
    }
  }
  if (await serveStatic(pathname, res)) return;
  res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
}).listen(PORT, () => {
  const db = process.env.DATABASE_URL || process.env.POSTGRES_URL ? 'Postgres' : 'in-memory demo data';
  console.log(`Water Mirror running on http://localhost:${PORT} (${db})`);
});

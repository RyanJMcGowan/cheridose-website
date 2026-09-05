import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const root = resolve('dist');
const port = Number(process.env.CHERIDOSE_SITE_PORT || 4300);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  let target = resolve(root, `.${pathname}`);

  if (!target.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    if (pathname.endsWith('/') || (await stat(target)).isDirectory()) {
      target = join(target, 'index.html');
    }
    await stat(target);
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes[extname(target)] || 'application/octet-stream',
  });
  createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Cheridose website preview: http://127.0.0.1:${port}`);
});

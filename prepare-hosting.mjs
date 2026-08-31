import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./build.mjs');

const websiteDirectory = dirname(fileURLToPath(import.meta.url));
const staticBuildDirectory = join(websiteDirectory, '..', 'dist', 'website');
const publicDirectory = join(websiteDirectory, 'public');

await rm(publicDirectory, { recursive: true, force: true });
await mkdir(publicDirectory, { recursive: true });
await Promise.all(
  [
    'assets',
    'apple-touch-icon.png',
    'robots.txt',
    'site-config.js',
    'site.js',
    'sitemap.xml',
    'styles.css',
  ].map((entry) =>
    cp(join(staticBuildDirectory, entry), join(publicDirectory, entry), { recursive: true }),
  ),
);

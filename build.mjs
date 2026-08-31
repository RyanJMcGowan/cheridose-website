import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const websiteDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(websiteDirectory, '..');
const outputDirectory = join(repositoryRoot, 'dist', 'website');
const outputAssets = join(outputDirectory, 'assets');
const iconPath = join(websiteDirectory, 'assets', 'icon.svg');
const socialCardPath = join(websiteDirectory, 'assets', 'social-card.png');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  [
    'assets',
    'index.html',
    'privacy',
    'robots.txt',
    'site-config.js',
    'site.js',
    'sitemap.xml',
    'styles.css',
    'support',
  ].map((entry) =>
    cp(join(websiteDirectory, entry), join(outputDirectory, entry), { recursive: true }),
  ),
);
await mkdir(outputAssets, { recursive: true });

await Promise.all([
  sharp(iconPath).resize(32, 32).png().toFile(join(outputAssets, 'favicon-32.png')),
  sharp(iconPath).resize(180, 180).png().toFile(join(outputDirectory, 'apple-touch-icon.png')),
  sharp(iconPath).resize(512, 512).png().toFile(join(outputAssets, 'icon-512.png')),
]);

const socialCard = await sharp(socialCardPath).metadata();
if (socialCard.width !== 1200 || socialCard.height !== 630 || socialCard.format !== 'png') {
  throw new Error('The social card must remain a 1200 × 630 PNG.');
}

console.log(`Cheridose website built at ${outputDirectory}`);

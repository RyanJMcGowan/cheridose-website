import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const websiteDirectory = dirname(fileURLToPath(import.meta.url));
const outputFlagIndex = process.argv.indexOf('--output');
const outputDirectory =
  outputFlagIndex >= 0 && process.argv[outputFlagIndex + 1]
    ? resolve(process.cwd(), process.argv[outputFlagIndex + 1])
    : join(websiteDirectory, 'dist');
const outputAssets = join(outputDirectory, 'assets');
const logoPath = join(websiteDirectory, 'assets', 'logo.svg');
const iconPath = join(websiteDirectory, 'assets', 'icon.svg');
const socialCardPhonePath = join(websiteDirectory, 'assets', 'social-card-phone-source.png');

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
await rm(join(outputAssets, 'social-card-phone-source.png'), { force: true });

await Promise.all([
  sharp(iconPath).resize(32, 32).png().toFile(join(outputAssets, 'favicon-32.png')),
  sharp(iconPath).resize(180, 180).png().toFile(join(outputDirectory, 'apple-touch-icon.png')),
  sharp(iconPath).resize(512, 512).png().toFile(join(outputAssets, 'icon-512.png')),
]);

const logo = await sharp(logoPath).resize({ width: 430 }).png().toBuffer();
const phoneCorner = await sharp(socialCardPhonePath)
  .extract({ left: 350, top: 0, width: 521, height: 967 })
  .resize({ width: 650 })
  .extract({ left: 0, top: 130, width: 650, height: 630 })
  .png()
  .toBuffer();
const socialCopy = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <text x="88" y="370" fill="#17211d" font-family="Inter, Arial, sans-serif"
      font-size="72" font-weight="750" letter-spacing="-2">Know what’s next.</text>
    <text x="91" y="446" fill="#5f6861" font-family="Inter, Arial, sans-serif"
      font-size="27">A calm medication reminder for iPhone.</text>
  </svg>
`);

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: '#f5f0e9',
  },
})
  .composite([
    { input: logo, left: 86, top: 64 },
    { input: socialCopy, left: 0, top: 0 },
    { input: phoneCorner, left: 700, top: 0 },
  ])
  .png()
  .toFile(join(outputAssets, 'social-card.png'));

console.log(`Cheridose website built at ${outputDirectory}`);

import { cp, mkdir, readFile, rm } from 'node:fs/promises';
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
const socialCardPortraitPath = join(websiteDirectory, 'assets', 'Cheryl-monotone-refined.png');
const socialCardMapPath = join(websiteDirectory, 'assets', 'terceira-map.svg');

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

const socialLogoSource = (await readFile(logoPath, 'utf8')).replace('#008a8b', '#fffaf3');
const logo = await sharp(Buffer.from(socialLogoSource)).resize({ width: 200 }).png().toBuffer();
const map = await sharp(socialCardMapPath)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
  .png()
  .toBuffer();
const portrait = await sharp(socialCardPortraitPath)
  .resize({ width: 720, height: 720, fit: 'cover', position: 'attention' })
  .rotate(-3, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extract({ left: 68, top: 63, width: 620, height: 630 })
  .png()
  .toBuffer();
const socialCopy = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <text x="54" y="150" fill="#fffaf3" font-family="Inter, Arial, sans-serif"
      font-size="78" font-weight="770" letter-spacing="-1.5">I made this for</text>
    <text x="54" y="252" fill="#fffaf3" font-family="Inter, Arial, sans-serif"
      font-size="102" font-weight="780" letter-spacing="-2">my mom.</text>
    <text x="54" y="361" fill="#f08f6e" font-family="Georgia, 'Times New Roman', serif"
      font-size="86" font-style="italic" font-weight="700" letter-spacing="-1">And yours, too.</text>
    <rect x="439" y="527" width="322" height="66" rx="33" fill="#fffaf3" />
    <text x="469" y="568" fill="#006f70" font-family="Inter, Arial, sans-serif"
      font-size="22" font-weight="760">Read about the story</text>
    <path d="M716 558h17m-7-7 7 7-7 7" fill="none" stroke="#f08f6e"
      stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`);
const portraitShadow = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="portrait-shadow" x="-30%" y="-30%" width="170%" height="170%">
        <feDropShadow dx="-16" dy="14" stdDeviation="18" flood-color="#17211d"
          flood-opacity=".42" />
      </filter>
    </defs>
    <rect x="580" y="0" width="620" height="630" fill="#17211d"
      filter="url(#portrait-shadow)" />
  </svg>
`);
const motionLine = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <path d="M-60 590 C 270 612 480 560 680 495 C 890 427 1087 330 1260 205"
      fill="none" stroke="#fffaf3" stroke-opacity=".3" stroke-width="5"
      stroke-linecap="round" />
  </svg>
`);
const mapWash = Buffer.from(`
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#006f70" fill-opacity=".64" />
  </svg>
`);

await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: '#006f70',
  },
})
  .composite([
    { input: map, left: 0, top: 0 },
    { input: mapWash, left: 0, top: 0 },
    { input: portraitShadow, left: 0, top: 0 },
    { input: portrait, left: 580, top: 0 },
    { input: motionLine, left: 0, top: 0 },
    { input: socialCopy, left: 0, top: 0 },
    { input: logo, left: 970, top: 552 },
  ])
  .png()
  .toFile(join(outputAssets, 'social-card.png'));

console.log(`Cheridose website built at ${outputDirectory}`);

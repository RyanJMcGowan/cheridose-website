import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const websiteDirectory = dirname(fileURLToPath(import.meta.url));
const assetsDirectory = join(websiteDirectory, 'assets');
const outputDirectory = join(assetsDirectory, 'social-covers');
const mapPath = join(assetsDirectory, 'terceira-map.svg');
const iconPath = join(assetsDirectory, 'icon.svg');
const profilePicture = {
  filename: 'facebook-profile-picture.png',
  width: 1024,
  height: 1024,
};

const covers = [
  {
    filename: 'facebook-page-cover.png',
    label: 'Facebook Page',
    width: 1640,
    height: 624,
    routeEnd: [0.78, 0.23],
    compass: [0.86, 0.64],
    safeInsetY: 28,
  },
  {
    filename: 'x-profile-header.png',
    label: 'X profile',
    width: 1500,
    height: 500,
    routeEnd: [0.79, 0.24],
    compass: [0.88, 0.64],
    safeInsetY: 68,
  },
  {
    filename: 'linkedin-page-cover.png',
    label: 'LinkedIn Page',
    width: 1512,
    height: 256,
    routeEnd: [0.76, 0.3],
    compass: [0.88, 0.58],
    safeInsetY: 18,
  },
  {
    filename: 'youtube-channel-banner.png',
    label: 'YouTube channel',
    width: 2560,
    height: 1440,
    routeEnd: [0.68, 0.43],
    compass: [0.77, 0.57],
    safeArea: { x: 507, y: 509, width: 1546, height: 423 },
  },
];

await mkdir(outputDirectory, { recursive: true });

const mapSource = await readFile(mapPath, 'utf8');
const lightMapSource = mapSource
  .replaceAll('#006f70', '#f5f0e9')
  .replaceAll('#fff', '#006f70')
  .replace(
    '.graticule { fill: none; stroke: #006f70; stroke-opacity: .08;',
    '.graticule { fill: none; stroke: #006f70; stroke-opacity: .055;',
  )
  .replace(
    '.island { fill: #006f70; fill-opacity: .018; stroke: #006f70; stroke-opacity: .58;',
    '.island { fill: #006f70; fill-opacity: .026; stroke: #006f70; stroke-opacity: .44;',
  )
  .replace('.trunk { stroke-opacity: .5;', '.trunk { stroke-opacity: .38;')
  .replace('.primary { stroke-opacity: .42;', '.primary { stroke-opacity: .32;')
  .replace('.secondary { stroke-opacity: .32;', '.secondary { stroke-opacity: .23;')
  .replace('.tertiary { stroke-opacity: .22;', '.tertiary { stroke-opacity: .15;')
  .replace(
    '.place text { fill: #006f70; fill-opacity: .88;',
    '.place text { fill: #006f70; fill-opacity: .76;',
  )
  .replace('.place-minor text { fill-opacity: .68;', '.place-minor text { fill-opacity: .56;')
  .replace(
    '.ocean-title { fill: #006f70; fill-opacity: .5;',
    '.ocean-title { fill: #006f70; fill-opacity: .38;',
  )
  .replace(
    '.island-title-mark path { fill: #006f70; fill-opacity: .26;',
    '.island-title-mark path { fill: #006f70; fill-opacity: .13;',
  )
  .replace(
    '.compass { fill: none; stroke: #006f70; stroke-opacity: .68;',
    '.compass { fill: none; stroke: #006f70; stroke-opacity: .46;',
  );
const iconOriginalSource = await readFile(iconPath, 'utf8');
const iconIvorySource = iconOriginalSource.replaceAll('#008a8b', '#fffaf3');
const themes = [
  {
    id: 'cream',
    background: '#f5f0e9',
    mapSource: lightMapSource,
    iconSource: iconOriginalSource,
  },
  {
    id: 'teal',
    background: '#006f70',
    mapSource,
    iconSource: iconIvorySource,
  },
];

const number = (value) => Math.round(value * 100) / 100;

function createAtmosphere({ width, height, routeEnd }, theme) {
  const [endXRatio, endYRatio] = routeEnd;
  const endX = width * endXRatio;
  const endY = height * endYRatio;
  const routeWidth = Math.max(2.4, width / 460);
  const isCream = theme.id === 'cream';
  const routeColor = isCream ? '#f08f6e' : '#fffaf3';
  const iconSize = Math.max(34, Math.min(88, height * 0.135));
  const routeGap = Math.max(iconSize * 0.75, width * 0.022);
  const routeStartX = -width * 0.06;
  const routeStartY = height * 0.86;
  const routeStopX = endX - routeGap;
  const routeStopY = endY + routeGap * 0.55;
  const routePath = `M ${number(routeStartX)} ${number(routeStartY)} C ${number(width * 0.22)} ${number(height * 0.94)}, ${number(width * 0.6)} ${number(height * 0.55)}, ${number(routeStopX)} ${number(routeStopY)}`;

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="edge-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${isCream ? '#d9cec2' : '#004f50'}" stop-opacity="${isCream ? '.38' : '.62'}" />
          <stop offset=".22" stop-color="${isCream ? '#eee6dc' : '#006f70'}" stop-opacity=".08" />
          <stop offset=".72" stop-color="${isCream ? '#eee6dc' : '#006f70'}" stop-opacity=".03" />
          <stop offset="1" stop-color="${isCream ? '#d9cec2' : '#004f50'}" stop-opacity="${isCream ? '.28' : '.42'}" />
        </linearGradient>
        <radialGradient id="sea-light" cx="54%" cy="48%" r="58%">
          <stop offset="0" stop-color="${isCream ? '#fffaf3' : '#37b9b8'}" stop-opacity="${isCream ? '.56' : '.19'}" />
          <stop offset=".56" stop-color="${isCream ? '#fffaf3' : '#0c9192'}" stop-opacity=".06" />
          <stop offset="1" stop-color="${isCream ? '#f5f0e9' : '#006f70'}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="route-line" gradientUnits="userSpaceOnUse"
          x1="${number(routeStartX)}" y1="${number(routeStartY)}"
          x2="${number(routeStopX)}" y2="${number(routeStopY)}">
          <stop offset="0" stop-color="${routeColor}" stop-opacity="${isCream ? '.72' : '.34'}" />
          <stop offset=".76" stop-color="${routeColor}" stop-opacity="${isCream ? '.72' : '.34'}" />
          <stop offset=".92" stop-color="${routeColor}" stop-opacity="${isCream ? '.34' : '.16'}" />
          <stop offset="1" stop-color="${routeColor}" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="route-halo" gradientUnits="userSpaceOnUse"
          x1="${number(routeStartX)}" y1="${number(routeStartY)}"
          x2="${number(routeStopX)}" y2="${number(routeStopY)}">
          <stop offset="0" stop-color="${routeColor}" stop-opacity="${isCream ? '.13' : '.17'}" />
          <stop offset=".74" stop-color="${routeColor}" stop-opacity="${isCream ? '.13' : '.17'}" />
          <stop offset="1" stop-color="${routeColor}" stop-opacity="0" />
        </linearGradient>
        <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="${number(Math.max(3, height * 0.009))}" />
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="${theme.background}" fill-opacity="${isCream ? '.2' : '.45'}" />
      <rect width="${width}" height="${height}" fill="url(#sea-light)" />
      <rect width="${width}" height="${height}" fill="url(#edge-shade)" />
      <path d="${routePath}"
        fill="none" stroke="url(#route-halo)" stroke-width="${number(routeWidth * 3.2)}"
        stroke-linecap="round" filter="url(#route-glow)" />
      <path d="${routePath}"
        fill="none" stroke="url(#route-line)" stroke-width="${number(routeWidth)}"
        stroke-linecap="round" />
    </svg>
  `);
}

function createCompass({ width, height, compass }, theme) {
  const [xRatio, yRatio] = compass;
  const radius = Math.max(26, Math.min(height * 0.17, width * 0.06));
  const x = width * xRatio;
  const y = height * yRatio;
  const line = Math.max(1, radius / 42);
  const compassColor = theme.id === 'cream' ? '#006f70' : '#fffaf3';

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${number(x)} ${number(y)})" fill="none" stroke="${compassColor}" opacity="${theme.id === 'cream' ? '.34' : '.3'}">
        <circle r="${number(radius)}" stroke-width="${number(line)}" />
        <circle r="${number(radius * 0.78)}" stroke-opacity=".55" stroke-width="${number(line * 0.7)}" />
        <path d="M0 ${number(-radius * 1.16)}V${number(radius * 1.16)}M${number(-radius * 1.16)} 0H${number(radius * 1.16)}"
          stroke-opacity=".6" stroke-width="${number(line * 0.7)}" />
        <path d="M0 ${number(-radius)}L${number(radius * 0.13)} ${number(-radius * 0.12)}L0 0L${number(-radius * 0.13)} ${number(-radius * 0.12)}Z"
          fill="${compassColor}" fill-opacity=".62" stroke-width="${number(line)}" />
        <path d="M0 ${number(-radius)}L${number(radius * 0.13)} ${number(-radius * 0.12)}L0 0L${number(-radius * 0.13)} ${number(-radius * 0.12)}Z"
          fill="${compassColor}" fill-opacity=".13" stroke-width="${number(line)}" transform="rotate(90)" />
        <path d="M0 ${number(-radius)}L${number(radius * 0.13)} ${number(-radius * 0.12)}L0 0L${number(-radius * 0.13)} ${number(-radius * 0.12)}Z"
          fill="${compassColor}" fill-opacity=".13" stroke-width="${number(line)}" transform="rotate(180)" />
        <path d="M0 ${number(-radius)}L${number(radius * 0.13)} ${number(-radius * 0.12)}L0 0L${number(-radius * 0.13)} ${number(-radius * 0.12)}Z"
          fill="${compassColor}" fill-opacity=".13" stroke-width="${number(line)}" transform="rotate(270)" />
        <circle r="${number(radius * 0.055)}" fill="${compassColor}" stroke="none" />
        <text x="0" y="${number(-radius * 1.35)}" fill="${compassColor}" stroke="none"
          font-family="Georgia, 'Times New Roman', serif" font-size="${number(radius * 0.27)}"
          font-weight="700" text-anchor="middle">N</text>
      </g>
    </svg>
  `);
}

function createAttribution({ width, height, safeArea, safeInsetY = 16 }, theme) {
  const fontSize = Math.max(8, Math.min(13, height * 0.018));
  const y = safeArea
    ? safeArea.y + safeArea.height - fontSize * 1.2
    : height - Math.max(safeInsetY, fontSize * 1.5);

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${number(width / 2)}" y="${number(y)}" fill="${theme.id === 'cream' ? '#006f70' : '#fffaf3'}" fill-opacity=".48"
        font-family="Inter, Arial, sans-serif" font-size="${number(fontSize)}"
        letter-spacing=".04em" text-anchor="middle">Map data © OpenStreetMap contributors</text>
    </svg>
  `);
}

async function renderCover(cover, theme) {
  const { width, height, routeEnd } = cover;
  const filename =
    theme.id === 'cream' ? cover.filename : cover.filename.replace('.png', `-${theme.id}.png`);
  const map = await sharp(Buffer.from(theme.mapSource))
    .resize({ width, height, fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
  const iconSize = Math.max(34, Math.min(88, height * 0.135));
  const icon = await sharp(Buffer.from(theme.iconSource))
    .resize({ width: Math.round(iconSize), height: Math.round(iconSize) })
    .png()
    .toBuffer();
  const iconLeft = Math.round(width * routeEnd[0] - iconSize / 2);
  const iconTop = Math.round(height * routeEnd[1] - iconSize / 2);

  const layers = [
    { input: map, left: 0, top: 0 },
    { input: createAtmosphere(cover, theme), left: 0, top: 0 },
  ];

  if (width / height > 2) {
    layers.push({ input: createCompass(cover, theme), left: 0, top: 0 });
  }

  layers.push(
    { input: icon, left: iconLeft, top: iconTop },
    { input: createAttribution(cover, theme), left: 0, top: 0 },
  );

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: theme.background,
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(outputDirectory, filename));
}

async function renderProfilePicture() {
  const { filename, width, height } = profilePicture;
  const iconSize = Math.round(width * 0.88);
  const icon = await sharp(Buffer.from(iconIvorySource))
    .resize({ width: iconSize, height: iconSize })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#006f70',
    },
  })
    .composite([
      {
        input: icon,
        left: Math.round((width - iconSize) / 2),
        top: Math.round((height - iconSize) / 2),
      },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(join(outputDirectory, filename));
}

await Promise.all([
  ...covers.flatMap((cover) => themes.map((theme) => renderCover(cover, theme))),
  renderProfilePicture(),
]);

const previewWidth = 1200;
const previewPadding = 42;
const previewLabelHeight = 42;
const previewItems = [];
let previewHeight = previewPadding;

for (const cover of covers) {
  const previewImageWidth = previewWidth - previewPadding * 2;
  const previewImageHeight = Math.round((previewImageWidth * cover.height) / cover.width);
  const previewImage = await sharp(join(outputDirectory, cover.filename))
    .resize({ width: previewImageWidth, height: previewImageHeight, fit: 'fill' })
    .png()
    .toBuffer();
  const label = Buffer.from(`
    <svg width="${previewWidth}" height="${previewLabelHeight}" xmlns="http://www.w3.org/2000/svg">
      <text x="${previewPadding}" y="28" fill="#075f60" font-family="Inter, Arial, sans-serif"
        font-size="17" font-weight="750" letter-spacing=".08em">${cover.label.toUpperCase()} · ${cover.width} × ${cover.height}</text>
    </svg>
  `);

  previewItems.push({ input: label, left: 0, top: previewHeight });
  previewHeight += previewLabelHeight;
  previewItems.push({ input: previewImage, left: previewPadding, top: previewHeight });
  previewHeight += previewImageHeight + previewPadding;
}

await sharp({
  create: {
    width: previewWidth,
    height: previewHeight,
    channels: 4,
    background: '#f5f0e9',
  },
})
  .composite(previewItems)
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(join(outputDirectory, 'social-cover-preview.png'));

console.log(`Cheridose social covers generated at ${outputDirectory}`);

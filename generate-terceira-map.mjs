import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteDirectory = dirname(fileURLToPath(import.meta.url));
const outputPaths = {
  landscape: join(websiteDirectory, 'assets', 'terceira-map.svg'),
  portrait: join(websiteDirectory, 'assets', 'terceira-map-portrait.svg'),
};
const islandLetteringPath = join(websiteDirectory, 'assets', 'ilha-terceira.svg');
const userAgent = 'CheridoseWebsite/1.0 (support@cheridose.com)';

const islandLetteringSource = await readFile(islandLetteringPath, 'utf8');
const islandLetteringViewBox = islandLetteringSource.match(/viewBox=["']0 0 ([\d.]+) ([\d.]+)["']/);
if (!islandLetteringViewBox) {
  throw new Error('The ILHA TERCEIRA artwork does not have the expected viewBox.');
}

const islandLetteringWidth = Number(islandLetteringViewBox[1]);
const islandLetteringHeight = Number(islandLetteringViewBox[2]);
const islandLetteringPaths = [...islandLetteringSource.matchAll(/<path\b[\s\S]*?\/>/g)]
  .map(([path]) => path.replace(/\sclass=["'][^"']*["']/, ''))
  .join('\n');
if (!islandLetteringPaths) {
  throw new Error('The ILHA TERCEIRA artwork does not contain any outlined paths.');
}

const placeResponse = await fetch(
  'https://nominatim.openstreetmap.org/search?q=Terceira%2C%20Azores%2C%20Portugal&format=jsonv2&polygon_geojson=1&limit=1',
  { headers: { 'User-Agent': userAgent } },
);
if (!placeResponse.ok) {
  throw new Error(`Unable to load the Terceira boundary (${placeResponse.status}).`);
}

const [place] = await placeResponse.json();
if (!place?.geojson || !['Polygon', 'MultiPolygon'].includes(place.geojson.type)) {
  throw new Error('OpenStreetMap did not return the expected Terceira polygon.');
}

const [south, north, west, east] = place.boundingbox.map(Number);
const mapQuery = `[out:json][timeout:30];
way["highway"~"^(trunk|primary|secondary|tertiary)$"](${south},${west},${north},${east})->.roads;
nwr["place"~"^(city|town|village)$"](${south},${west},${north},${east})->.places;
.roads out geom;
.places out center;`;
const mapResponse = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'User-Agent': userAgent,
  },
  body: new URLSearchParams({ data: mapQuery }),
});
if (!mapResponse.ok) {
  throw new Error(`Unable to load Terceira map details (${mapResponse.status}).`);
}

const mapData = await mapResponse.json();
const longitudeScale = Math.cos((((south + north) / 2) * Math.PI) / 180);
const geographicWidth = (east - west) * longitudeScale;
const geographicHeight = north - south;

const labelPlans = [
  { name: 'Angra do Heroísmo', dx: 0, dy: 34, anchor: 'middle', prominence: 'city' },
  { name: 'Praia da Vitória', dx: -20, dy: -16, anchor: 'end', prominence: 'city' },
  { name: 'Raminho', dx: 0, dy: -18, anchor: 'middle', prominence: 'minor' },
  { name: 'Altares', dx: 0, dy: 22, anchor: 'middle', prominence: 'minor' },
  { name: 'Biscoitos', dx: 0, dy: -24, anchor: 'middle', prominence: 'village' },
  { name: 'Quatro Ribeiras', dx: 0, dy: 24, anchor: 'middle', prominence: 'minor' },
  { name: 'Agualva', dx: 0, dy: -20, anchor: 'middle', prominence: 'minor' },
  { name: 'Vila Nova', dx: 0, dy: 22, anchor: 'middle', prominence: 'minor' },
  { name: 'Lajes', dx: 0, dy: -19, anchor: 'middle', prominence: 'minor' },
  { name: 'Doze Ribeiras', dx: 18, dy: -14, anchor: 'start', prominence: 'minor' },
  { name: 'Santa Bárbara', dx: 18, dy: 18, anchor: 'start', prominence: 'minor' },
  {
    name: 'Vila de São Sebastião',
    displayName: 'São Sebastião',
    dx: -18,
    dy: 26,
    anchor: 'end',
    prominence: 'village',
  },
  { name: 'Serreta', dx: 20, dy: -18, anchor: 'start', prominence: 'village' },
  {
    name: 'São Bartolomeu de Regatos',
    dx: 0,
    dy: -24,
    anchor: 'middle',
    prominence: 'minor',
  },
  { name: 'Terra Chã', dx: 18, dy: 18, anchor: 'start', prominence: 'minor' },
  {
    name: 'São Mateus da Calheta',
    dx: -18,
    dy: 22,
    anchor: 'end',
    prominence: 'minor',
  },
  { name: 'Porto Judeu', dx: 0, dy: -19, anchor: 'middle', prominence: 'minor' },
  { name: 'Fonte do Bastardo', dx: -18, dy: -16, anchor: 'end', prominence: 'minor' },
  { name: 'Porto Martins', dx: -18, dy: 20, anchor: 'end', prominence: 'minor' },
];

const placeElements = new Map();
for (const element of mapData.elements) {
  const name = element.tags?.name;
  if (!labelPlans.some((label) => label.name === name)) continue;

  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

  if (!placeElements.has(name) || element.type === 'node') {
    placeElements.set(name, { latitude, longitude });
  }
}

const polygons =
  place.geojson.type === 'Polygon' ? [place.geojson.coordinates] : place.geojson.coordinates;

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function simplify(points, minimumDistance = 1.35) {
  if (points.length < 3) return points;

  const simplified = [points[0]];
  const threshold = minimumDistance ** 2;
  for (let index = 1; index < points.length - 1; index += 1) {
    const [lastX, lastY] = simplified[simplified.length - 1];
    const [x, y] = points[index];
    if ((x - lastX) ** 2 + (y - lastY) ** 2 >= threshold) {
      simplified.push(points[index]);
    }
  }
  simplified.push(points.at(-1));
  return simplified;
}

function compassRose({ x, y, scale = 1 }) {
  return `
    <g class="compass" transform="translate(${x} ${y}) scale(${scale})" aria-hidden="true">
      <circle class="compass-ring" r="74" />
      <circle class="compass-ring compass-ring-inner" r="60" />
      <path class="compass-axis" d="M0-88V88M-88 0H88M-62-62L62 62M62-62L-62 62" />
      <g class="compass-points">
        <path class="compass-point compass-point-dark" d="M0-78 10-9 0 0-10-9Z" />
        <path class="compass-point" d="M0-78 10-9 0 0-10-9Z" transform="rotate(90)" />
        <path class="compass-point" d="M0-78 10-9 0 0-10-9Z" transform="rotate(180)" />
        <path class="compass-point" d="M0-78 10-9 0 0-10-9Z" transform="rotate(270)" />
        <path class="compass-point compass-point-minor" d="M0-54 6-7 0 0-6-7Z" transform="rotate(45)" />
        <path class="compass-point compass-point-minor" d="M0-54 6-7 0 0-6-7Z" transform="rotate(135)" />
        <path class="compass-point compass-point-minor" d="M0-54 6-7 0 0-6-7Z" transform="rotate(225)" />
        <path class="compass-point compass-point-minor" d="M0-54 6-7 0 0-6-7Z" transform="rotate(315)" />
      </g>
      <circle class="compass-center" r="4" />
      <text class="compass-letter compass-north" x="0" y="-101">N</text>
      <text class="compass-letter" x="102" y="5">E</text>
      <text class="compass-letter" x="0" y="111">S</text>
      <text class="compass-letter" x="-103" y="5">W</text>
    </g>`;
}

function graticule({ width, height }) {
  const verticalLines = [0.125, 0.375, 0.625, 0.875]
    .map((position) => `<path d="M${width * position} 0V${height}" />`)
    .join('');
  const horizontalLines = [0.18, 0.42, 0.66, 0.9]
    .map((position) => `<path d="M0 ${height * position}H${width}" />`)
    .join('');
  return `<g class="graticule" aria-hidden="true">${verticalLines}${horizontalLines}</g>`;
}

function renderMap({
  width,
  height,
  paddingX,
  mapMaxHeight,
  mapCenterY,
  labelScale,
  compass,
  oceanLabel,
  islandMark,
}) {
  const scale = Math.min((width - paddingX * 2) / geographicWidth, mapMaxHeight / geographicHeight);
  const renderedWidth = geographicWidth * scale;
  const renderedHeight = geographicHeight * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = mapCenterY - renderedHeight / 2;

  function project([longitude, latitude]) {
    return [
      offsetX + (longitude - west) * longitudeScale * scale,
      offsetY + (north - latitude) * scale,
    ];
  }

  function pathData(points, close = false) {
    const projected = simplify(points.map(project));
    if (projected.length < 2) return '';

    const commands = projected.map(
      ([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`,
    );
    if (close) commands.push('Z');
    return commands.join(' ');
  }

  const coastPaths = polygons
    .map((polygon) => pathData(polygon[0], true))
    .filter(Boolean)
    .map((path) => `    <path class="island" d="${path}" />`)
    .join('\n');

  const roadPaths = mapData.elements
    .filter(
      (element) =>
        element.tags?.highway && Array.isArray(element.geometry) && element.geometry.length > 1,
    )
    .map((element) => {
      const path = pathData(element.geometry.map(({ lon, lat }) => [lon, lat]));
      const roadClass = ['trunk', 'primary', 'secondary', 'tertiary'].includes(element.tags.highway)
        ? element.tags.highway
        : 'tertiary';
      return path ? `    <path class="road ${roadClass}" d="${path}" />` : '';
    })
    .filter(Boolean)
    .join('\n');

  const labels = labelPlans
    .map((label) => {
      const location = placeElements.get(label.name);
      if (!location) return '';

      const [x, y] = project([location.longitude, location.latitude]);
      const dx = label.dx * labelScale;
      const dy = label.dy * labelScale;
      const markerRadius = { city: 5, village: 3.6, minor: 2.5 }[label.prominence] ?? 3.6;
      return `
    <g class="place place-${label.prominence}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
      <circle r="${markerRadius}" />
      <text x="${dx.toFixed(1)}" y="${dy.toFixed(1)}" text-anchor="${label.anchor}">${escapeXml((label.displayName ?? label.name).toUpperCase())}</text>
    </g>`;
    })
    .filter(Boolean)
    .join('');

  const islandMarkScale = islandMark.width / islandLetteringWidth;
  const islandMarkHeight = islandLetteringHeight * islandMarkScale;
  const islandMarkX = islandMark.x - islandMark.width / 2;
  const islandMarkY = islandMark.y - islandMarkHeight / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <title>Terceira, Azores</title>
  <desc>Coastline, major roads, and settlement names derived from OpenStreetMap data, with a decorative compass rose.</desc>
  <style>
    .graticule { fill: none; stroke: #fff; stroke-opacity: .08; stroke-width: 1; }
    .island { fill: #fff; fill-opacity: .018; stroke: #fff; stroke-opacity: .58; stroke-width: 3; }
    .road { fill: none; stroke: #fff; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
    .trunk { stroke-opacity: .5; stroke-width: 3.2; }
    .primary { stroke-opacity: .42; stroke-width: 2.7; }
    .secondary { stroke-opacity: .32; stroke-width: 2.1; }
    .tertiary { stroke-opacity: .22; stroke-width: 1.5; }
    .place circle { fill: #fff; fill-opacity: .82; }
    .place text { fill: #fff; fill-opacity: .88; stroke: #006f70; stroke-opacity: .78; stroke-width: 5; paint-order: stroke fill; font-family: Georgia, 'Times New Roman', serif; font-size: ${22 * labelScale}px; font-weight: 700; letter-spacing: .1em; }
    .place-city text { font-size: ${25 * labelScale}px; letter-spacing: .12em; }
    .place-minor circle { fill-opacity: .62; }
    .place-minor text { fill-opacity: .68; stroke-width: 3.5; font-size: ${15 * labelScale}px; font-weight: 600; letter-spacing: .075em; }
    .ocean-title { fill: #fff; fill-opacity: .5; font-family: Georgia, 'Times New Roman', serif; font-size: ${21 * labelScale}px; font-style: italic; letter-spacing: .22em; text-anchor: middle; }
    .island-title-mark path { fill: #fff; fill-opacity: .26; }
    .compass { fill: none; stroke: #fff; stroke-opacity: .68; }
    .compass-ring { stroke-width: 1.4; }
    .compass-ring-inner { stroke-opacity: .42; stroke-width: .8; }
    .compass-axis { stroke-opacity: .34; stroke-width: .8; }
    .compass-point { fill: #fff; fill-opacity: .16; stroke-width: 1; }
    .compass-point-dark { fill-opacity: .58; }
    .compass-point-minor { fill-opacity: .08; stroke-opacity: .46; }
    .compass-center { fill: #fff; fill-opacity: .76; stroke: none; }
    .compass-letter { fill: #fff; fill-opacity: .72; stroke: none; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 700; text-anchor: middle; }
    .compass-north { font-size: 21px; }
  </style>
  ${graticule({ width, height })}
  <text class="ocean-title" x="${oceanLabel.x}" y="${oceanLabel.y}">Atlantic Ocean</text>
  <g class="island-title-mark" transform="translate(${islandMarkX.toFixed(1)} ${islandMarkY.toFixed(1)}) scale(${islandMarkScale.toFixed(5)})" aria-hidden="true">
${islandLetteringPaths}
  </g>
  <g>
${coastPaths}
${roadPaths}
${labels}
  </g>
  ${compassRose(compass)}
</svg>
`;
}

const landscapeSvg = renderMap({
  width: 1600,
  height: 1000,
  paddingX: 70,
  mapMaxHeight: 820,
  mapCenterY: 530,
  labelScale: 1,
  compass: { x: 1300, y: 160, scale: 0.9 },
  oceanLabel: { x: 460, y: 965 },
  islandMark: { x: 800, y: 545, width: 950 },
});
const portraitSvg = renderMap({
  width: 600,
  height: 1900,
  paddingX: 28,
  mapMaxHeight: 430,
  mapCenterY: 430,
  labelScale: 0.76,
  compass: { x: 360, y: 1120, scale: 1.05 },
  oceanLabel: { x: 180, y: 1720 },
  islandMark: { x: 300, y: 430, width: 450 },
});

await Promise.all([
  writeFile(outputPaths.landscape, landscapeSvg, 'utf8'),
  writeFile(outputPaths.portrait, portraitSvg, 'utf8'),
]);

const missingLabels = labelPlans.filter((label) => !placeElements.has(label.name));
if (missingLabels.length) {
  console.warn(
    `Map generated without labels for: ${missingLabels.map(({ name }) => name).join(', ')}`,
  );
}
console.log(`Terceira maps generated in ${join(websiteDirectory, 'assets')}`);

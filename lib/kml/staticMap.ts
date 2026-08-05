/**
 * Génère une image de carte (fond OpenStreetMap + polygone de la zone de vol
 * + position(s) du télépilote) pour illustrer une fiche "zone" importée
 * depuis un KML. Pas de dépendance à une clé API (Google/Mapbox) : on
 * compose l'image nous-mêmes à partir des tuiles raster publiques d'OSM,
 * comme le ferait n'importe quel viewer de carte "slippy map".
 *
 * Respect de la politique d'usage des tuiles OSM (User-Agent identifiable,
 * volumétrie faible : quelques tuiles par zone importée, pas de cache
 * bulk/systématique).
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";

const TILE_SIZE = 256;
const OSM_USER_AGENT = "CerfaDrone/1.0 (+https://cerfa-drone.vercel.app; contact via app)";

// Les fonctions serverless de Vercel n'ont AUCUNE police système installée
// (contrairement à un poste de dev) : le texte des <text> SVG passés à
// sharp/librsvg ressortait en carrés vides ("tofu"). On embarque donc une
// police directement dans le SVG en base64 via @font-face -> plus de
// dépendance à fontconfig ni au système, ça marche partout pareil.
let cachedFontFaceCss: string | null = null;
function getFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;
  const dir = path.join(process.cwd(), "public", "fonts");
  const regular = readFileSync(path.join(dir, "DejaVuSans.ttf")).toString("base64");
  const bold = readFileSync(path.join(dir, "DejaVuSans-Bold.ttf")).toString("base64");
  cachedFontFaceCss = `
    @font-face { font-family: 'MapFont'; font-weight: normal; src: url(data:font/ttf;base64,${regular}) format('truetype'); }
    @font-face { font-family: 'MapFont'; font-weight: bold; src: url(data:font/ttf;base64,${bold}) format('truetype'); }
  `;
  return cachedFontFaceCss;
}

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE_SIZE * Math.pow(2, zoom)
  );
}

export type MapPoint = { lat: number; lon: number };

// Distances "rondes" candidates pour l'échelle, en mètres.
const NICE_DISTANCES_M = [
  5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000,
];

/**
 * Choisit une distance ronde dont la barre à l'écran fait entre ~60 et
 * ~160px, à partir de la résolution réelle (mètres/pixel) à la latitude et
 * au zoom du rendu (projection Web Mercator : la résolution dépend de la
 * latitude, cf. formule standard OSM/Google).
 */
function pickScaleBar(metersPerPixel: number): { distanceM: number; widthPx: number } {
  for (const d of NICE_DISTANCES_M) {
    const px = d / metersPerPixel;
    if (px >= 60 && px <= 160) return { distanceM: d, widthPx: px };
  }
  // fallback : la plus proche de 100px parmi les distances candidates
  let best = NICE_DISTANCES_M[0];
  let bestDiff = Infinity;
  for (const d of NICE_DISTANCES_M) {
    const diff = Math.abs(d / metersPerPixel - 100);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = d;
    }
  }
  return { distanceM: best, widthPx: best / metersPerPixel };
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${m / 1000} km` : `${m} m`;
}

export type StaticMapOptions = {
  width?: number;
  height?: number;
  padding?: number; // marge en fraction de la bbox (0.25 = 25% de marge)
};

/**
 * Rend un PNG WxH centré sur `polygon`, avec le polygone tracé en rouge et
 * les `pilots` en points bleus. `polygon` et `pilots` sont en {lat, lon}.
 */
export async function renderZoneMap(
  polygon: MapPoint[],
  pilots: MapPoint[],
  opts: StaticMapOptions = {}
): Promise<Buffer> {
  const width = opts.width ?? 700;
  const height = opts.height ?? 460;
  const padding = opts.padding ?? 0.3;

  const allPoints = [...polygon, ...pilots];
  const lats = allPoints.map((p) => p.lat);
  const lons = allPoints.map((p) => p.lon);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const centerLat = (latMin + latMax) / 2;
  const centerLon = (lonMin + lonMax) / 2;

  // Choisit le zoom le plus élevé où la bbox (+ marge) tient dans le canvas.
  let zoom = 18;
  for (; zoom >= 3; zoom--) {
    const x1 = lonToWorldX(lonMin, zoom);
    const x2 = lonToWorldX(lonMax, zoom);
    const y1 = latToWorldY(latMax, zoom); // latMax -> y plus petit (nord en haut)
    const y2 = latToWorldY(latMin, zoom);
    const bboxW = (x2 - x1) * (1 + padding);
    const bboxH = (y2 - y1) * (1 + padding);
    if (bboxW <= width && bboxH <= height) break;
  }

  const centerWorldX = lonToWorldX(centerLon, zoom);
  const centerWorldY = latToWorldY(centerLat, zoom);
  const originWorldX = centerWorldX - width / 2;
  const originWorldY = centerWorldY - height / 2;

  const tileMinX = Math.floor(originWorldX / TILE_SIZE);
  const tileMaxX = Math.floor((originWorldX + width) / TILE_SIZE);
  const tileMinY = Math.floor(originWorldY / TILE_SIZE);
  const tileMaxY = Math.floor((originWorldY + height) / TILE_SIZE);
  const maxTileIndex = Math.pow(2, zoom) - 1;

  const composites: sharp.OverlayOptions[] = [];
  for (let tx = tileMinX; tx <= tileMaxX; tx++) {
    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
      const wrappedX = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
      if (ty < 0 || ty > maxTileIndex) continue;
      try {
        const res = await fetch(`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`, {
          headers: { "User-Agent": OSM_USER_AGENT },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        composites.push({
          input: buf,
          left: Math.round(tx * TILE_SIZE - originWorldX),
          top: Math.round(ty * TILE_SIZE - originWorldY),
        });
      } catch {
        // tuile manquante : on continue avec un fond blanc à cet endroit
      }
    }
  }

  // Overlay SVG : polygone de la zone + points du(des) télépilote(s).
  const toPx = (p: MapPoint) => ({
    x: lonToWorldX(p.lon, zoom) - originWorldX,
    y: latToWorldY(p.lat, zoom) - originWorldY,
  });
  const polyPts = polygon.map(toPx).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const pilotCircles = pilots
    .map(toPx)
    .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="#1d4ed8" stroke="white" stroke-width="2"/>`)
    .join("");

  // Échelle graphique : résolution réelle (m/px) à la latitude du centre de
  // la carte, formule standard de la projection Web Mercator utilisée par
  // les tuiles OSM. Obligatoire sur le plan fourni à la préfecture.
  const metersPerPixel = (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoom);
  const { distanceM, widthPx } = pickScaleBar(metersPerPixel);
  const barX = 12;
  const barY = height - 28;
  const scaleBar = `
    <g>
      <rect x="${barX - 6}" y="${barY - 16}" width="${widthPx + 12}" height="30" fill="white" fill-opacity="0.75" />
      <line x1="${barX}" y1="${barY}" x2="${barX + widthPx}" y2="${barY}" stroke="#1a1d21" stroke-width="2" />
      <line x1="${barX}" y1="${barY - 5}" x2="${barX}" y2="${barY + 5}" stroke="#1a1d21" stroke-width="2" />
      <line x1="${barX + widthPx}" y1="${barY - 5}" x2="${barX + widthPx}" y2="${barY + 5}" stroke="#1a1d21" stroke-width="2" />
      <text x="${barX + widthPx / 2}" y="${barY - 8}" font-family="MapFont" font-size="11" font-weight="bold" fill="#1a1d21" text-anchor="middle">${formatDistance(distanceM)}</text>
    </g>`;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><style>${getFontFaceCss()}</style></defs>
    <polygon points="${polyPts}" fill="#e05a4e" fill-opacity="0.3" stroke="#e05a4e" stroke-width="3" />
    ${pilotCircles}
    ${scaleBar}
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#94a3b8" stroke-width="1" />
    <text x="${width - 8}" y="${height - 8}" font-family="MapFont" font-size="10" fill="#64748b" text-anchor="end">© OpenStreetMap contributors</text>
  </svg>`;

  return sharp({
    create: { width, height, channels: 3, background: { r: 245, g: 245, b: 245 } },
  })
    .composite([...composites, { input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}

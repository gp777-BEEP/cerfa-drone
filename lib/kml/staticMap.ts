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

const TILE_SIZE = 256;
const OSM_USER_AGENT = "CerfaDrone/1.0 (+https://cerfa-drone.vercel.app; contact via app)";

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

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${polyPts}" fill="#e05a4e" fill-opacity="0.3" stroke="#e05a4e" stroke-width="3" />
    ${pilotCircles}
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#94a3b8" stroke-width="1" />
    <text x="8" y="${height - 8}" font-family="sans-serif" font-size="10" fill="#64748b">© OpenStreetMap contributors</text>
  </svg>`;

  return sharp({
    create: { width, height, channels: 3, background: { r: 245, g: 245, b: 245 } },
  })
    .composite([...composites, { input: Buffer.from(svg) }])
    .png()
    .toBuffer();
}

/**
 * Génère une image de carte (fond satellite + repères + polygone de la zone
 * de vol + position(s) du télépilote) pour illustrer une fiche "zone"
 * importée depuis un KML. Pas de dépendance à une clé API (Google/Mapbox) :
 * on compose l'image nous-mêmes à partir de tuiles raster publiques.
 *
 * Fond "hybride" (vue satellite + noms de rues/lieux par-dessus), demandé
 * pour remplacer le fond plan OSM plat : 3 couches Esri superposées, la
 * combinaison officielle "Imagery Hybrid" d'Esri (vérifiée disponible sans
 * clé API, cf. https://server.arcgisonline.com/.../World_Imagery et
 * https://services.arcgisonline.com/.../Reference/*) :
 *  1. World_Imagery (photo satellite/aérienne)
 *  2. Reference/World_Transportation (routes, en transparence)
 *  3. Reference/World_Boundaries_and_Places (noms de lieux/rues, en
 *     transparence, prévue par Esri spécifiquement pour être posée sur un
 *     fond satellite)
 * Adressage Esri : {z}/{y}/{x} (rangée avant colonne), à l'inverse d'OSM.
 */
import sharp from "sharp";

const TILE_SIZE = 256;
const OSM_USER_AGENT = "CerfaDrone/1.0 (+https://www.cerfadrone.com; contact via app)";
const ESRI_IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";
const ESRI_TRANSPORT_URL = "https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Transportation/MapServer/tile";
const ESRI_PLACES_URL = "https://services.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile";

// Les fonctions serverless de Vercel n'ont AUCUNE police système installée,
// et même une police embarquée en base64 dans le SVG (@font-face) ressort en
// carrés vides ("tofu") une fois en prod : le rendu SVG->PNG (sharp/librsvg)
// ne peut donc pas être utilisé pour du texte fiable. On ne dessine plus
// AUCUN texte dans le SVG (juste les formes vectorielles : polygone, points,
// barre d'échelle) ; le texte (valeur de l'échelle, légendes, attribution
// OSM) est ajouté par-dessus l'image dans le PDF final via pdf-lib, qui lui
// embarque toujours sa police (Helvetica) correctement quel que soit
// l'environnement -> c'est ce qui affiche déjà "Distance max ... m" sans
// problème sur les fiches de zone.

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

export type StaticMapResult = {
  png: Buffer;
  width: number;
  height: number;
  hasPilot: boolean;
  // Position/texte de la barre d'échelle en pixels image (origine en haut à
  // gauche, comme le SVG), à traduire en coordonnées PDF par l'appelant une
  // fois l'image placée sur la page (cf. zoneCards.ts).
  scaleBar: { xPx: number; yPx: number; widthPx: number; label: string };
  attribution: { xPx: number; yPx: number; text: string };
};

/**
 * Rend un PNG WxH centré sur `polygon`, avec le polygone tracé en rouge et
 * les `pilots` en points bleus. `polygon` et `pilots` sont en {lat, lon}.
 * Le texte (échelle, attribution) n'est PAS dans ce PNG : voir StaticMapResult.
 */
export async function renderZoneMap(
  polygon: MapPoint[],
  pilots: MapPoint[],
  opts: StaticMapOptions = {}
): Promise<StaticMapResult> {
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

  async function fetchTile(baseUrl: string): Promise<Buffer | null> {
    try {
      const res = await fetch(baseUrl, {
        headers: { "User-Agent": OSM_USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  // 3 couches par position de tuile (imagerie, routes, lieux), récupérées en
  // parallèle puis empilées dans cet ordre. Une couche manquante (timeout,
  // zoom trop élevé pour la zone, etc.) est simplement sautée plutôt que de
  // faire échouer toute la carte.
  const composites: sharp.OverlayOptions[] = [];
  let imageryOk = 0;
  let imageryAttempted = 0;
  for (let tx = tileMinX; tx <= tileMaxX; tx++) {
    for (let ty = tileMinY; ty <= tileMaxY; ty++) {
      const wrappedX = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
      if (ty < 0 || ty > maxTileIndex) continue;
      const left = Math.round(tx * TILE_SIZE - originWorldX);
      const top = Math.round(ty * TILE_SIZE - originWorldY);
      imageryAttempted++;

      const [imagery, transport, places] = await Promise.all([
        fetchTile(`${ESRI_IMAGERY_URL}/${zoom}/${ty}/${wrappedX}`),
        fetchTile(`${ESRI_TRANSPORT_URL}/${zoom}/${ty}/${wrappedX}`),
        fetchTile(`${ESRI_PLACES_URL}/${zoom}/${ty}/${wrappedX}`),
      ]);
      if (imagery) {
        imageryOk++;
        composites.push({ input: imagery, left, top });
      }
      if (transport) composites.push({ input: transport, left, top });
      if (places) composites.push({ input: places, left, top });
    }
  }

  // Filet de sécurité : si Esri est injoignable (pare-feu, panne...), on ne
  // veut surtout pas livrer une carte vide sur un document officiel. Si
  // AUCUNE tuile satellite n'a pu être récupérée, on retombe entièrement sur
  // l'ancien fond de plan OSM (fiable, déjà utilisé en prod auparavant).
  let usedOsmFallback = false;
  if (imageryAttempted > 0 && imageryOk === 0) {
    usedOsmFallback = true;
    composites.length = 0;
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      for (let ty = tileMinY; ty <= tileMaxY; ty++) {
        const wrappedX = ((tx % (maxTileIndex + 1)) + (maxTileIndex + 1)) % (maxTileIndex + 1);
        if (ty < 0 || ty > maxTileIndex) continue;
        const osm = await fetchTile(`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`);
        if (osm) {
          composites.push({
            input: osm,
            left: Math.round(tx * TILE_SIZE - originWorldX),
            top: Math.round(ty * TILE_SIZE - originWorldY),
          });
        }
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
  // Juste les formes (pas de texte) : le fond blanc derrière la valeur de
  // l'échelle reste utile même si le texte est ajouté par-dessus ensuite.
  const scaleBarShapes = `
    <g>
      <rect x="${barX - 6}" y="${barY - 16}" width="${widthPx + 12}" height="30" fill="white" fill-opacity="0.75" />
      <line x1="${barX}" y1="${barY}" x2="${barX + widthPx}" y2="${barY}" stroke="#1a1d21" stroke-width="2" />
      <line x1="${barX}" y1="${barY - 5}" x2="${barX}" y2="${barY + 5}" stroke="#1a1d21" stroke-width="2" />
      <line x1="${barX + widthPx}" y1="${barY - 5}" x2="${barX + widthPx}" y2="${barY + 5}" stroke="#1a1d21" stroke-width="2" />
    </g>`;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${polyPts}" fill="#e05a4e" fill-opacity="0.3" stroke="#e05a4e" stroke-width="3" />
    ${pilotCircles}
    ${scaleBarShapes}
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#94a3b8" stroke-width="1" />
  </svg>`;

  const png = await sharp({
    create: { width, height, channels: 3, background: { r: 245, g: 245, b: 245 } },
  })
    .composite([...composites, { input: Buffer.from(svg) }])
    .png()
    .toBuffer();

  return {
    png,
    width,
    height,
    hasPilot: pilots.length > 0,
    scaleBar: { xPx: barX + widthPx / 2, yPx: barY - 8, widthPx, label: formatDistance(distanceM) },
    attribution: {
      xPx: width - 8,
      yPx: height - 8,
      text: usedOsmFallback ? "© OpenStreetMap contributors" : "Esri, HERE, Garmin, © OpenStreetMap contributors",
    },
  };
}

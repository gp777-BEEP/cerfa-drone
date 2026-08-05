/**
 * Parseur du KML exporté par DroneKeeper (validé sur un export réel : zones
 * de vol en <Polygon>, marquées par <ExtendedData><Data name="type"><value>
 * FLIGHT_ZONE</value>, et position(s) du télépilote en <Point> marqués
 * PILOT). Les coordonnées KML sont "lon,lat,alt" (attention à l'ordre,
 * inversé par rapport à lat/lon habituel).
 *
 * Parsing par regex plutôt que par un parseur XML complet : le format
 * DroneKeeper est simple et régulier, et ça évite une dépendance XML de plus
 * côté client (ce module tourne aussi bien dans le navigateur que côté
 * serveur).
 */

export type KmlVertex = { lat: number; lon: number; alt: number };

export type KmlZone = {
  name: string;
  vertices: KmlVertex[];
  centroid: { lat: number; lon: number };
  altitude_m: number | null;
};

export type KmlParseResult = {
  documentName: string | null;
  zones: KmlZone[];
  pilots: { lat: number; lon: number }[];
  warnings: string[];
};

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : null;
}

function parseCoordinatesBlock(raw: string): KmlVertex[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tuple) => {
      const [lon, lat, alt] = tuple.split(",").map(Number);
      return { lat, lon, alt: Number.isFinite(alt) ? alt : 0 };
    })
    .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon));
}

function extendedDataType(placemarkXml: string): string | null {
  const m = placemarkXml.match(/<Data\s+name=["']type["']>\s*<value>([^<]+)<\/value>/i);
  return m ? m[1].trim().toUpperCase() : null;
}

export function parseKml(xml: string): KmlParseResult {
  const warnings: string[] = [];
  const documentName = extractTag(xml, "name");

  const placemarks = xml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
  const zones: KmlZone[] = [];
  const pilots: { lat: number; lon: number }[] = [];

  for (const pm of placemarks) {
    const type = extendedDataType(pm);
    const name = extractTag(pm, "name") || "Zone";

    const polygonCoords = pm.match(/<Polygon[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
    const pointCoords = pm.match(/<Point[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);

    if (polygonCoords && (type === "FLIGHT_ZONE" || type === null)) {
      const vertices = parseCoordinatesBlock(polygonCoords[1]);
      if (vertices.length < 3) continue;

      // Le dernier point du LinearRing referme le polygone (= 1er point) :
      // on l'enlève pour ne pas fausser le centroïde.
      const unique =
        vertices.length > 1 &&
        vertices[0].lat === vertices[vertices.length - 1].lat &&
        vertices[0].lon === vertices[vertices.length - 1].lon
          ? vertices.slice(0, -1)
          : vertices;

      const centroid = {
        lat: unique.reduce((s, v) => s + v.lat, 0) / unique.length,
        lon: unique.reduce((s, v) => s + v.lon, 0) / unique.length,
      };

      const altitudes = unique.map((v) => v.alt).filter((a) => a > 0);
      const altitude_m = altitudes.length > 0 ? Math.max(...altitudes) : null;

      zones.push({ name, vertices: unique, centroid, altitude_m });
    } else if (pointCoords && type === "PILOT") {
      const v = parseCoordinatesBlock(pointCoords[1])[0];
      if (v) pilots.push({ lat: v.lat, lon: v.lon });
    }
  }

  if (zones.length === 0) {
    warnings.push("Aucune zone de vol (polygone) trouvée dans ce fichier KML.");
  }

  return { documentName, zones, pilots, warnings };
}

/** Distance en mètres entre deux points GPS (formule de haversine). */
export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Éloignement max estimé entre le(s) télépilote(s) et la zone : pour chaque
 * sommet du polygone, distance au pilote le plus proche, puis on garde le
 * pire cas. Sans point PILOT dans le KML, on retombe sur la distance
 * centre -> sommet le plus éloigné (estimation basse, à vérifier).
 */
export function estimateDistanceMaxM(zone: KmlZone, pilots: { lat: number; lon: number }[]): number {
  if (pilots.length === 0) {
    return Math.round(Math.max(...zone.vertices.map((v) => haversineMeters(zone.centroid, v))));
  }
  const worstCase = Math.max(
    ...zone.vertices.map((v) => Math.min(...pilots.map((p) => haversineMeters(p, v))))
  );
  return Math.round(worstCase);
}

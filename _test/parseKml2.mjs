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
function extractTag(xml, tag) {
    var m = xml.match(new RegExp("<".concat(tag, "[^>]*>([\\s\\S]*?)</").concat(tag, ">"), "i"));
    return m ? m[1].trim() : null;
}
function parseCoordinatesBlock(raw) {
    return raw
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(function (tuple) {
        var _a = tuple.split(",").map(Number), lon = _a[0], lat = _a[1], alt = _a[2];
        return { lat: lat, lon: lon, alt: Number.isFinite(alt) ? alt : 0 };
    })
        .filter(function (v) { return Number.isFinite(v.lat) && Number.isFinite(v.lon); });
}
function extendedDataType(placemarkXml) {
    var m = placemarkXml.match(/<Data\s+name=["']type["']>\s*<value>([^<]+)<\/value>/i);
    return m ? m[1].trim().toUpperCase() : null;
}
export function parseKml(xml) {
    var warnings = [];
    var documentName = extractTag(xml, "name");
    var placemarks = xml.match(/<Placemark[\s\S]*?<\/Placemark>/gi) || [];
    var zones = [];
    var pilots = [];
    for (var _i = 0, placemarks_1 = placemarks; _i < placemarks_1.length; _i++) {
        var pm = placemarks_1[_i];
        var type = extendedDataType(pm);
        var name = extractTag(pm, "name") || "Zone";
        var polygonCoords = pm.match(/<Polygon[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
        var pointCoords = pm.match(/<Point[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i);
        if (polygonCoords && (type === "FLIGHT_ZONE" || type === null)) {
            var vertices = parseCoordinatesBlock(polygonCoords[1]);
            if (vertices.length < 3)
                continue;
            // Le dernier point du LinearRing referme le polygone (= 1er point) :
            // on l'enlève pour ne pas fausser le centroïde.
            var unique = vertices.length > 1 &&
                vertices[0].lat === vertices[vertices.length - 1].lat &&
                vertices[0].lon === vertices[vertices.length - 1].lon
                ? vertices.slice(0, -1)
                : vertices;
            var centroid = {
                lat: unique.reduce(function (s, v) { return s + v.lat; }, 0) / unique.length,
                lon: unique.reduce(function (s, v) { return s + v.lon; }, 0) / unique.length,
            };
            var altitudes = unique.map(function (v) { return v.alt; }).filter(function (a) { return a > 0; });
            var altitude_m = altitudes.length > 0 ? Math.max.apply(Math, altitudes) : null;
            zones.push({ name: name, vertices: unique, centroid: centroid, altitude_m: altitude_m });
        }
        else if (pointCoords && type === "PILOT") {
            var v = parseCoordinatesBlock(pointCoords[1])[0];
            if (v)
                pilots.push({ lat: v.lat, lon: v.lon });
        }
    }
    if (zones.length === 0) {
        warnings.push("Aucune zone de vol (polygone) trouvée dans ce fichier KML.");
    }
    return { documentName: documentName, zones: zones, pilots: pilots, warnings: warnings };
}
/** Distance en mètres entre deux points GPS (formule de haversine). */
export function haversineMeters(a, b) {
    var R = 6371000;
    var toRad = function (d) { return (d * Math.PI) / 180; };
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lon - a.lon);
    var s = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.pow(Math.sin(dLon / 2), 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
/**
 * Éloignement max estimé entre le(s) télépilote(s) et la zone : pour chaque
 * sommet du polygone, distance au pilote le plus proche, puis on garde le
 * pire cas. Sans point PILOT dans le KML, on retombe sur la distance
 * centre -> sommet le plus éloigné (estimation basse, à vérifier).
 */
export function estimateDistanceMaxM(zone, pilots) {
    if (pilots.length === 0) {
        return Math.round(Math.max.apply(Math, zone.vertices.map(function (v) { return haversineMeters(zone.centroid, v); })));
    }
    var worstCase = Math.max.apply(Math, zone.vertices.map(function (v) { return Math.min.apply(Math, pilots.map(function (p) { return haversineMeters(p, v); })); }));
    return Math.round(worstCase);
}

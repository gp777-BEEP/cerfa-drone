import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseKml, estimateDistanceMaxM, haversineMeters } from "@/lib/kml/parseKml";
import { renderZoneMap } from "@/lib/kml/staticMap";

export const runtime = "nodejs";

type ParsedZone = {
  title: string;
  adresse: string;
  code_postal: string;
  localite: string;
  hauteur_max_m: number | null;
  distance_max_m: number | null;
  notes: string;
  image_paths: string[];
  map_meta: Record<string, any> | null;
};

/**
 * Un KML peut avoir plusieurs points "PILOT" (une position par zone en
 * général chez DroneKeeper). Pour l'affichage sur la carte d'UNE zone, on ne
 * garde que le plus proche de son centre : sinon toutes les positions
 * télépilote de tout le fichier s'affichaient sur chaque zone, ce qui n'a
 * pas de sens (jamais plus d'un point par carte).
 */
function nearestPilot(
  centroid: { lat: number; lon: number },
  pilots: { lat: number; lon: number }[]
): { lat: number; lon: number }[] {
  if (pilots.length === 0) return [];
  let best = pilots[0];
  let bestDist = haversineMeters(centroid, best);
  for (const p of pilots.slice(1)) {
    const d = haversineMeters(centroid, p);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return [best];
}

async function reverseGeocode(lat: number, lon: number): Promise<{ adresse: string; code_postal: string; localite: string } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const props = json?.features?.[0]?.properties;
    if (!props) return null;
    return {
      // props.name = rue + numéro seuls (ex: "172 Impasse du Nantillet").
      // props.label = adresse complète avec code postal et ville déjà inclus
      // (ex: "172 Impasse du Nantillet 74970 Marignier") -- comme
      // code_postal/localite sont stockés et affichés séparément à côté de
      // adresse, utiliser label ici doublait le code postal et la ville à
      // l'écran ("...Marignier 74970 Marignier"). props.label garde en
      // secours pour les résultats qui n'ont pas de "name" (rare).
      adresse: props.name || props.label || "",
      code_postal: props.postcode || "",
      localite: props.city || "",
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const missionId = formData.get("missionId") as string | null;
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }
  if (!missionId) {
    return NextResponse.json({ error: "missionId manquant" }, { status: 400 });
  }

  try {
    const text = await file.text();
    const { zones: kmlZones, pilots, warnings } = parseKml(text);
    const admin = createAdminClient();

    const zones: ParsedZone[] = [];
    let i = 0;
    for (const zone of kmlZones) {
      i++;
      const geo = await reverseGeocode(zone.centroid.lat, zone.centroid.lon);
      if (!geo) {
        warnings.push(
          `Adresse introuvable pour "${zone.name}" (coordonnées ${zone.centroid.lat.toFixed(5)}, ${zone.centroid.lon.toFixed(5)}) : à compléter à la main.`
        );
      }

      const image_paths: string[] = [];
      let map_meta: Record<string, any> | null = null;
      const zonePilots = nearestPilot(zone.centroid, pilots);
      try {
        const map = await renderZoneMap(zone.vertices, zonePilots);
        const imgPath = `${user.id}/${missionId}/kml-map-${Date.now()}-${i}.png`;
        const { error: upErr } = await admin.storage.from("zone-images").upload(imgPath, map.png, {
          contentType: "image/png",
          upsert: true,
        });
        if (!upErr) {
          image_paths.push(imgPath);
          map_meta = {
            width: map.width,
            height: map.height,
            hasPilot: map.hasPilot,
            scaleBar: map.scaleBar,
            attribution: map.attribution,
          };
        } else warnings.push(`Carte non générée pour "${zone.name}" : ${upErr.message}`);
      } catch (e: any) {
        warnings.push(`Carte non générée pour "${zone.name}" (${e.message}).`);
      }

      zones.push({
        title: zone.name,
        adresse: geo?.adresse || "",
        code_postal: geo?.code_postal || "",
        localite: geo?.localite || "",
        hauteur_max_m: zone.altitude_m,
        distance_max_m: estimateDistanceMaxM(zone, pilots),
        // Pas de texte auto ici : ce champ finit tel quel dans le Cerfa
        // envoyé à la préfecture, un rappel interne n'a rien à y faire.
        // L'avertissement "à vérifier" reste seulement dans le message
        // affiché à l'écran après l'import (kmlMsg côté client).
        notes: "",
        image_paths,
        map_meta,
      });
    }

    return NextResponse.json({ ok: true, zones, warnings });
  } catch (e: any) {
    console.error("parse-kml error:", e);
    return NextResponse.json(
      { error: "Impossible de lire ce fichier. Vérifie que c'est bien un export KML de zones de vol." },
      { status: 400 }
    );
  }
}

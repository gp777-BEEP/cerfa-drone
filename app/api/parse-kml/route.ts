import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseKml, estimateDistanceMaxM } from "@/lib/kml/parseKml";

export const runtime = "nodejs";

type ParsedZone = {
  title: string;
  adresse: string;
  code_postal: string;
  localite: string;
  hauteur_max_m: number | null;
  distance_max_m: number | null;
  notes: string;
};

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
      adresse: props.label || props.name || "",
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
  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  try {
    const text = await file.text();
    const { zones: kmlZones, pilots, warnings } = parseKml(text);

    const zones: ParsedZone[] = [];
    for (const zone of kmlZones) {
      const geo = await reverseGeocode(zone.centroid.lat, zone.centroid.lon);
      if (!geo) {
        warnings.push(
          `Adresse introuvable pour "${zone.name}" (coordonnées ${zone.centroid.lat.toFixed(5)}, ${zone.centroid.lon.toFixed(5)}) : à compléter à la main.`
        );
      }
      zones.push({
        title: zone.name,
        adresse: geo?.adresse || "",
        code_postal: geo?.code_postal || "",
        localite: geo?.localite || "",
        hauteur_max_m: zone.altitude_m,
        distance_max_m: estimateDistanceMaxM(zone, pilots),
        notes: "Zone importée depuis un fichier KML. Hauteur et éloignement estimés à vérifier.",
      });
    }

    return NextResponse.json({ ok: true, zones, warnings });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Impossible de lire ce fichier. Vérifie que c'est bien un export KML de zones de vol." },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { fillCerfa } from "@/lib/cerfa/fillCerfa";
import { generateZoneCards } from "@/lib/cerfa/zoneCards";
import { buildMissionData } from "@/lib/cerfa/buildMissionData";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    // Filet de sécurité : sans ça, une exception ici renvoie une réponse
    // vide côté client ("Unexpected end of JSON input" au lieu du vrai
    // message d'erreur). On log côté serveur (Vercel > Runtime Logs) et on
    // renvoie un message exploitable.
    console.error("generate-dossier error:", e);
    return NextResponse.json(
      { error: `Erreur inattendue lors de la génération : ${e?.message || "voir les logs serveur"}` },
      { status: 500 }
    );
  }
}

async function handle(req: NextRequest) {
  const { missionId } = await req.json();
  if (!missionId) {
    return NextResponse.json({ error: "missionId manquant" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // RLS garantit que ces requêtes ne retournent que les données de l'utilisateur connecté
  const { data: mission, error: missionErr } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();
  if (missionErr || !mission) {
    return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("mission_id", missionId)
    .order("order_index", { ascending: true });

  const admin = createAdminClient();

  // Télécharge les images de zones (stockage privé -> il faut la clé service)
  const zoneCardInputs = [] as Array<{
    title: string;
    address?: string;
    images: Uint8Array[];
    notes?: string;
    distanceMaxM?: number;
    heightMaxM?: number;
    // Métadonnées de la 1ère image, si c'est une carte qu'on a générée
    // (échelle + attribution à dessiner par-dessus, cf. zoneCards.ts) :
    // absent pour une photo importée manuellement.
    mapMeta?: any;
  }>;

  for (const zone of zones || []) {
    const images: Uint8Array[] = [];
    for (const imgPath of zone.image_paths || []) {
      const { data: imgData } = await admin.storage.from("zone-images").download(imgPath);
      if (imgData) images.push(new Uint8Array(await imgData.arrayBuffer()));
    }
    zoneCardInputs.push({
      title: zone.title || zone.adresse || "Zone de vol",
      address: [zone.adresse, zone.code_postal, zone.localite].filter(Boolean).join(", "),
      images,
      notes: zone.notes || undefined,
      distanceMaxM: zone.distance_max_m || undefined,
      heightMaxM: zone.hauteur_max_m || undefined,
      mapMeta: ((zone as any).map_meta || null) as any,
    });
  }

  // 1. Remplit le Cerfa
  const templatePath = path.join(process.cwd(), "public", "cerfa_template.pdf");
  const templateBytes = await readFile(templatePath);
  const missionData = buildMissionData(profile || {}, mission, zones || []);
  const { bytes: cerfaBytes, unmapped } = await fillCerfa(templateBytes, missionData);

  // 2. Génère les fiches de zone (si des images ont été fournies)
  const hasImages = zoneCardInputs.some((z) => z.images.length > 0);
  let finalBytes: Uint8Array = cerfaBytes;

  if (hasImages || zoneCardInputs.length > 0) {
    const zoneBytes = await generateZoneCards(mission.title, zoneCardInputs);

    // 3. Fusionne Cerfa + fiches de zones
    const merged = await PDFDocument.create();
    const cerfaDoc = await PDFDocument.load(cerfaBytes);
    const zonesDoc = await PDFDocument.load(zoneBytes);

    const cerfaPages = await merged.copyPages(cerfaDoc, cerfaDoc.getPageIndices());
    cerfaPages.forEach((p) => merged.addPage(p));
    const zonePages = await merged.copyPages(zonesDoc, zonesDoc.getPageIndices());
    zonePages.forEach((p) => merged.addPage(p));

    finalBytes = await merged.save();
  }

  // 4. Upload du dossier final dans le stockage privé de l'utilisateur
  const filePath = `${user.id}/${missionId}/dossier_${Date.now()}.pdf`;
  const { error: uploadErr } = await admin.storage.from("dossiers").upload(filePath, finalBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadErr) {
    return NextResponse.json({ error: `Échec de l'enregistrement du PDF: ${uploadErr.message}` }, { status: 500 });
  }

  await supabase.from("documents").insert({ mission_id: missionId, file_path: filePath });
  await supabase.from("missions").update({ status: "dossier_genere" }).eq("id", missionId);

  const { data: signedUrl } = await admin.storage.from("dossiers").createSignedUrl(filePath, 60 * 60);

  return NextResponse.json({
    ok: true,
    downloadUrl: signedUrl?.signedUrl,
    unmapped, // pour debug/QA, jamais montré tel quel à l'utilisateur final
  });
}

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { fillCerfa } from "@/lib/cerfa/fillCerfa";
import { fillAnnexe } from "@/lib/cerfa/fillAnnexe";
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
  const extraZones = (zones || []).slice(2);
  let finalBytes: Uint8Array = cerfaBytes;

  if (hasImages || zoneCardInputs.length > 0 || extraZones.length > 0) {
    // 3. Fusionne Cerfa + fiches de zones + annexe (zones au-delà de 2). Le
    // document "hôte" DOIT être le Cerfa rempli lui-même (pas un
    // PDFDocument.create() tout neuf) : créer un nouveau document et y
    // copier les pages perd le dictionnaire /AcroForm de la source
    // (copyPages copie le contenu visuel des pages, pas la structure de
    // formulaire au niveau du document). Résultat : le dossier final
    // s'affichait très bien, mais redevenait un PDF "plat" sans aucun champ
    // interactif -> impossible de le réimporter ensuite (import Cerfa déjà
    // rempli, "aucune zone trouvée" alors que le PDF a bien les bonnes
    // infos). En gardant le Cerfa comme hôte et en lui ajoutant seulement
    // les pages des fiches de zone / de l'annexe, l'AcroForm reste intact et
    // le PDF final reste réimportable.
    const cerfaDoc = await PDFDocument.load(cerfaBytes);

    if (hasImages || zoneCardInputs.length > 0) {
      const zoneBytes = await generateZoneCards(mission.title, zoneCardInputs);
      const zonesDoc = await PDFDocument.load(zoneBytes);
      const zonePages = await cerfaDoc.copyPages(zonesDoc, zonesDoc.getPageIndices());
      zonePages.forEach((p) => cerfaDoc.addPage(p));
    }

    if (extraZones.length > 0) {
      const annexePath = path.join(process.cwd(), "public", "cerfa_annexe.pdf");
      const annexeTemplateBytes = await readFile(annexePath);
      const answers = (mission as any).answers || {};
      const objetMission = (mission as any).objet_mission || mission.title;
      const commanditaire = (mission as any).commanditaire || answers.commanditaire || "";
      const annexeInput = extraZones.map((zone: any, i: number) => ({
        numero: i + 3,
        code_postal: zone.code_postal || "",
        localite: zone.localite || "",
        adresse: zone.adresse || "",
        en_agglomeration: !!zone.en_agglomeration,
        rassemblement: !!zone.rassemblement,
        rassemblement_description: zone.rassemblement_description || "",
        objet_mission: objetMission,
        commanditaire,
        eloignement_max_m: zone.distance_max_m ?? "",
        hauteur_max_m: zone.hauteur_max_m ?? "",
        descriptif_joint: true,
        autres_infos: zone.notes || "",
      }));
      const annexeBytes = await fillAnnexe(annexeTemplateBytes, annexeInput);
      const annexeDoc = await PDFDocument.load(annexeBytes);
      const annexePages = await cerfaDoc.copyPages(annexeDoc, annexeDoc.getPageIndices());
      annexePages.forEach((p) => cerfaDoc.addPage(p));
    }

    finalBytes = await cerfaDoc.save();
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

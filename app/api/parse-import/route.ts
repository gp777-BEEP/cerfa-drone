import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCerfa } from "@/lib/cerfa/parseCerfa";
import { parseFlyBy } from "@/lib/flyby/parseFlyBy";

export const runtime = "nodejs";

// Point d'entrée unique pour le dépôt d'un PDF pré-rempli (Cerfa ou dossier
// FlyBy), demandé par un bêta-testeur pour remplacer les 2-3 zones de dépôt
// séparées qui donnaient l'impression que tous les documents étaient
// obligatoires. On essaie d'abord le Cerfa (scan des champs de formulaire
// AcroForm) ; s'il n'y a aucun champ reconnu (PDF "plat", cas de FlyBy), on
// retente avec l'extraction de texte + regex FlyBy. Le premier qui trouve
// quelque chose gagne ; sinon on renvoie l'avertissement du Cerfa (format
// attendu par défaut).
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
    const buffer = Buffer.from(await file.arrayBuffer());

    const cerfaResult = await parseCerfa(buffer);
    const cerfaFoundSomething = (cerfaResult.debug?.matched ?? 0) > 0;

    if (cerfaFoundSomething) {
      return NextResponse.json({ ok: true, source: "cerfa", data: cerfaResult.data, warnings: cerfaResult.warnings, debug: cerfaResult.debug });
    }

    // @ts-ignore -- pas de types publiés pour ce sous-chemin du package
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseModule.default as unknown as (buf: Buffer) => Promise<{ text: string }>;
    const { text } = await pdfParse(buffer);
    const flybyResult = parseFlyBy(text);
    const flybyFoundSomething = !!(flybyResult.data.site1 || flybyResult.data.telepilote1 || flybyResult.data.aeronef1);

    if (flybyFoundSomething) {
      return NextResponse.json({ ok: true, source: "flyby", data: flybyResult.data, warnings: flybyResult.warnings });
    }

    // Ni l'un ni l'autre n'a rien trouvé : on remonte l'avertissement le plus
    // parlant (celui du Cerfa, format attendu par défaut).
    return NextResponse.json({
      ok: true,
      source: "cerfa",
      data: cerfaResult.data,
      warnings: cerfaResult.warnings,
      debug: cerfaResult.debug,
    });
  } catch (e: any) {
    console.error("parse-import error:", e);
    return NextResponse.json(
      { error: "Impossible de lire ce PDF. Vérifiez que c'est bien un Cerfa pré-rempli ou un dossier de vol FlyBy." },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseFlyBy } from "@/lib/flyby/parseFlyBy";

export const runtime = "nodejs";

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
    // Même contournement que pour le relevé AlphaTango : importer
    // directement lib/pdf-parse.js évite le bloc de debug du point d'entrée
    // du package qui plante une fois bundlé en fonction serverless.
    // @ts-ignore -- pas de types publiés pour ce sous-chemin du package
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseModule.default as unknown as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buffer);
    const { data, warnings } = parseFlyBy(text);
    return NextResponse.json({ ok: true, data, warnings });
  } catch (e: any) {
    console.error("parse-flyby error:", e);
    return NextResponse.json(
      { error: "Impossible de lire ce PDF. Vérifiez que c'est bien un dossier de vol exporté depuis FlyBy." },
      { status: 400 }
    );
  }
}

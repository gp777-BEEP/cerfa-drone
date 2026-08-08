import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCerfa } from "@/lib/cerfa/parseCerfa";

export const runtime = "nodejs";

// Point d'entrée pour le dépôt d'un Cerfa pré-rempli (scan des champs de
// formulaire AcroForm).
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
      { error: "Impossible de lire ce PDF. Vérifiez que c'est bien un Cerfa pré-rempli." },
      { status: 400 }
    );
  }
}

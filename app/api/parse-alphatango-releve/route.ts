import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseReleveExploitant } from "@/lib/alphatango/parseReleve";

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
    // On importe directement lib/pdf-parse.js et non le point d'entrée du
    // package : ce dernier contient un bloc de code de debug
    // (`isDebugMode = !module.parent`) qui se déclenche à tort une fois
    // bundlé par Next.js en fonction serverless (module.parent y est
    // toujours undefined) et tente de lire un fichier de test inexistant,
    // faisant planter l'import avant même l'appel de la fonction.
    // @ts-ignore -- pas de types publiés pour ce sous-chemin du package
    const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = pdfParseModule.default as unknown as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buffer);
    const { data, warnings } = parseReleveExploitant(text);
    return NextResponse.json({ ok: true, data, warnings });
  } catch (e: any) {
    console.error("parse-alphatango-releve error:", e);
    return NextResponse.json(
      { error: "Impossible de lire ce PDF. Vérifie que c'est bien le relevé de situation d'exploitant AlphaTango." },
      { status: 400 }
    );
  }
}

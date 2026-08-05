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
    // pdf-parse@1 : import CommonJS classique, chargé dynamiquement pour
    // rester hors du bundle client.
    const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await pdfParse(buffer);
    const { data, warnings } = parseReleveExploitant(text);
    return NextResponse.json({ ok: true, data, warnings });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Impossible de lire ce PDF. Vérifie que c'est bien le relevé de situation d'exploitant AlphaTango." },
      { status: 400 }
    );
  }
}

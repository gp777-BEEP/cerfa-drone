import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCerfa } from "@/lib/cerfa/parseCerfa";

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
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Diagnostic temporaire : un même fichier donne 0 valeur lue en
    // production alors qu'il en a bien (vérifié en local avec le même
    // code) -> on capture la taille reçue et les octets de tête/queue pour
    // voir si le fichier arrive tronqué/corrompu côté serveur Vercel.
    const head = Array.from(bytes.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const tail = Array.from(bytes.slice(-16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    const { data, warnings, debug } = await parseCerfa(bytes);
    return NextResponse.json({
      ok: true,
      data,
      warnings,
      debug: { ...debug, bytesReceived: bytes.length, head, tail },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: `Impossible de lire ce PDF (${e?.message || "erreur inconnue"}). Vérifiez que c'est bien un Cerfa 15476*04 (formulaire PDF interactif).`,
      },
      { status: 400 }
    );
  }
}

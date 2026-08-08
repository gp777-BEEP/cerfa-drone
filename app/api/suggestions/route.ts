import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reçoit une suggestion : l'enregistre en base (comme avant), puis tente
// d'envoyer un email de notification via Resend (si RESEND_API_KEY est
// configurée sur Vercel). L'envoi d'email est best-effort : un échec ici ne
// fait jamais échouer l'enregistrement de la suggestion elle-même.
export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message || !String(message).trim()) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { error: insertError } = await supabase
    .from("suggestions")
    .insert({ user_id: user.id, message: String(message).trim() });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Notification email best-effort : configurez RESEND_API_KEY (et
  // optionnellement SUGGESTIONS_NOTIFY_EMAIL) dans les variables
  // d'environnement Vercel pour l'activer. Rien ne casse si absent.
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.SUGGESTIONS_NOTIFY_EMAIL;
  if (apiKey && notifyTo) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Cerfa Drone <onboarding@resend.dev>",
          to: [notifyTo],
          subject: "Nouvelle suggestion — Cerfa Drone",
          text: `De : ${user.email}\n\n${String(message).trim()}`,
        }),
      });
    } catch {
      // best-effort, on ignore silencieusement un échec d'envoi d'email
    }
  }

  return NextResponse.json({ ok: true });
}

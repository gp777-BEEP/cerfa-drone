import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Gère le lien de confirmation d'email (et tout futur lien magique / reset
// mot de passe) : échange le "code" contre une session, puis redirige.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}

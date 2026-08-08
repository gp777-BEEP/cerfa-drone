"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();
  // Contour vert statique (classe CSS), même schéma que NavLink/GuideComplet.
  const spotlight = useSpotlightHoverBgOnly();

  return (
    <button
      onClick={async (e) => {
        spotlight.onClick(e);
        // Retour bêta-testeur : la déconnexion était immédiate, sans
        // confirmation -- trop brutal en cas de clic accidentel (bouton
        // discret, juste une icône). Même schéma que les suppressions
        // (window.confirm) ailleurs dans l'app.
        if (!window.confirm("Se déconnecter de Cerfa Drone ?")) return;
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      aria-label="Se déconnecter"
      title="Se déconnecter"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-brand/50 text-slate-500 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}

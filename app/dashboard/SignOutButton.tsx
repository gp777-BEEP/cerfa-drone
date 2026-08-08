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
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-brand/50 px-2 py-1 text-sm text-slate-500 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
    >
      Se déconnecter
    </button>
  );
}

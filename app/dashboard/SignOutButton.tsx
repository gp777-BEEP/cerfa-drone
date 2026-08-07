"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSpotlightHover } from "@/lib/useSpotlightHover";

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();
  const spotlight = useSpotlightHover();

  return (
    <button
      onClick={async (e) => {
        spotlight.onClick(e);
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="px-2 py-1 text-sm text-slate-500 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
    >
      Se déconnecter
    </button>
  );
}

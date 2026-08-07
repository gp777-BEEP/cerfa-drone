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
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
      className="px-2 py-1 text-sm text-slate-500 transition-colors hover:text-ink"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
    >
      Se déconnecter
    </button>
  );
}

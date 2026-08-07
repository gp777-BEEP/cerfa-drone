"use client";

import Link from "next/link";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

export default function TutorielReminderLink() {
  const spotlight = useSpotlightHoverBgOnly();

  return (
    <Link
      href="/tutoriel"
      className="mb-6 flex items-center justify-between rounded-xl border border-brand/30 bg-brand-light px-4 py-3 text-sm text-ink outline-none transition-colors hover:bg-brand-light/70 focus-visible:ring-2 focus-visible:ring-brand/50"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
      onClick={spotlight.onClick}
    >
      <span>Besoin d'un rappel sur comment utiliser l'app ? Revoir le tutoriel</span>
      <span className="text-brand">→</span>
    </Link>
  );
}

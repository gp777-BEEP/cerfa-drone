"use client";

import Link from "next/link";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

export default function NewMissionLink() {
  const spotlight = useSpotlightHoverBgOnly();
  return (
    <Link
      href="/missions/new"
      className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
      onClick={spotlight.onClick}
    >
      + Nouvelle mission
    </Link>
  );
}

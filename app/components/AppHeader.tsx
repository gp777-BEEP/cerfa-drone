"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import SignOutButton from "../dashboard/SignOutButton";
import DroneIcon from "./DroneIcon";
import { useSpotlightHover } from "@/lib/useSpotlightHover";

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const spotlight = useSpotlightHover();
  return (
    <Link
      href={href}
      className="px-2 py-1 text-slate-500 outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/50"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 nav-glass border-b border-white/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2 font-medium text-ink">
          <DroneIcon
            size={20}
            className="text-brand"
            style={{ filter: "drop-shadow(0 0 6px rgba(65,250,187,0.65))" }}
          />
          Cerfa Drone
        </Link>
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <NavLink href="/dashboard">Missions</NavLink>
          <NavLink href="/profile">Profil</NavLink>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}

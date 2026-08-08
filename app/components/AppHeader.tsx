"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "../dashboard/SignOutButton";
import DroneIcon from "./DroneIcon";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  // Contour vert 100% CSS (classe Tailwind statique), jamais piloté par le
  // JS -- même schéma que le bandeau "Guide complet" du tutoriel, qui n'a
  // jamais eu le problème de contour qui vire au gris signalé plusieurs fois
  // sur ces liens. Seule la lueur qui suit le curseur reste animée en JS
  // (useSpotlightHoverBgOnly ne touche jamais border-color).
  const spotlight = useSpotlightHoverBgOnly();
  const pathname = usePathname();
  // Surligne le lien de la page actuellement affichée (demandé par un beta
  // testeur : difficile de savoir où on se trouve dans le site sinon).
  const isActive = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`rounded-md border border-brand/50 px-2 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50 ${
        isActive ? "font-medium text-brand" : "text-slate-500 hover:text-ink"
      }`}
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
      onClick={spotlight.onClick}
    >
      {children}
    </Link>
  );
}

export default function AppHeader() {
  // Lien "Admin" affiché uniquement pour le compte fondateur : vérifié
  // côté client juste pour l'affichage (la page /admin fait sa propre
  // vérification côté serveur, seule source de vérité pour l'accès réel).
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email && ADMIN_EMAILS.includes(data.user.email)) setIsAdmin(true);
    });
  }, []);

  return (
    <header className="sticky top-0 z-50 nav-glass border-b border-white/10">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/accueil" className="flex items-center gap-2 font-medium text-ink">
          <DroneIcon
            size={20}
            className="text-brand"
            style={{ filter: "drop-shadow(0 0 6px rgba(65,250,187,0.65))" }}
          />
          Cerfa Drone
        </Link>
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <NavLink href="/accueil">Accueil</NavLink>
          <NavLink href="/dashboard">Missions</NavLink>
          <NavLink href="/profile">Profil</NavLink>
          {isAdmin && <NavLink href="/admin">Admin</NavLink>}
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}

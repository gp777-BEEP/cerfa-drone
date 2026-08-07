"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSpotlightHover } from "@/lib/useSpotlightHover";

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const spotlight = useSpotlightHover();
  return (
    <Link
      href={href}
      className="px-1.5 py-1 transition-colors hover:text-ink"
      style={spotlight.style}
      onMouseMove={spotlight.onMouseMove}
      onMouseLeave={spotlight.onMouseLeave}
    >
      {children}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 py-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-6 text-xs text-slate-400 sm:flex-row">
        <span>© {new Date().getFullYear()} Cerfa Drone</span>
        <nav className="flex gap-2">
          <FooterLink href="/tutoriel">Tutoriel</FooterLink>
          <FooterLink href="/contact">Contact</FooterLink>
          <FooterLink href="/suggestions">Suggestions</FooterLink>
          <FooterLink href="/confidentialite">Confidentialité</FooterLink>
          <FooterLink href="/mentions-legales">Mentions légales</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Bulle d'aide contextuelle (option "B" validée par l'utilisateur parmi 4
// propositions pour remplacer le gros tutoriel affiché d'entrée) : plutôt
// qu'une page entière à lire avant de commencer, chaque astuce apparaît
// directement au bon endroit, la première fois que l'utilisateur y arrive
// réellement (première mission, première zone, première génération...).
// Persistance en localStorage par clé (id unique par astuce), pas de
// migration de base nécessaire pour ce nicety UX à faible enjeu.
function storageKey(id: string) {
  return `cerfa_coachmark_${id}`;
}

export default function Coachmark({
  id,
  text,
  linkHref,
  linkLabel,
  className = "",
}: {
  id: string;
  text: string;
  linkHref?: string;
  linkLabel?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(storageKey(id))) {
        setShow(true);
      }
    } catch {
      // localStorage indisponible (navigation privée stricte, etc.) : on
      // n'affiche simplement pas l'astuce plutôt que de planter.
    }
  }, [id]);

  function dismiss() {
    setShow(false);
    try {
      window.localStorage.setItem(storageKey(id), "1");
    } catch {}
  }

  if (!show) return null;

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[14px] border border-brand/30 bg-brand-light px-3.5 py-3 text-sm text-ink ${className}`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 shrink-0 text-brand"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" strokeLinecap="round" />
        <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
      </svg>
      <span className="flex-1 leading-snug">
        {text}
        {linkHref && (
          <>
            {" "}
            <Link href={linkHref} className="font-medium text-brand hover:underline">
              {linkLabel || "En savoir plus"}
            </Link>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer cette astuce"
        className="shrink-0 text-slate-500 hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}

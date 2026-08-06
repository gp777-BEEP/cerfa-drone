"use client";

import { useState } from "react";

// Aide contextuelle repliable (option "D" validée par l'utilisateur parmi 4
// propositions) : une flèche à côté du libellé déplie une courte explication
// de ce qu'attend le Cerfa pour ce champ. Fermé par défaut pour ne pas
// surcharger visuellement, fonctionne aussi bien au clic qu'au clavier
// (contrairement à une simple infobulle au survol, peu pratique sur mobile).
export default function FieldHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="inline align-middle">
      <button
        type="button"
        onClick={(e) => {
          // Empêche le comportement par défaut d'un <label> englobant (qui
          // sinon coche/focus le champ associé en plus d'ouvrir l'aide).
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={open ? "Masquer l'aide" : "Afficher l'aide"}
        aria-expanded={open}
        className="ml-1 inline-flex translate-y-[-1px] items-center text-slate-500 hover:text-brand"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <span className="mt-1 block max-w-md rounded-r-md border-l-2 border-brand bg-brand-light px-2 py-1 text-xs font-normal normal-case text-slate-300">
          {text}
        </span>
      )}
    </span>
  );
}

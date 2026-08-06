"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cerfa_tutorial_opens";
const MAX_AUTO_SHOWS = 5;

// Affiche un rappel vers /tutoriel sur les 5 premières ouvertures du
// tableau de bord (compteur en localStorage, propre à cet appareil/navigateur
// - un compteur en base par utilisateur serait plus précis mais demanderait
// une migration pour un gain marginal ici). Le tutoriel reste accessible
// ensuite via Suggestions et le pied de page, donc rien n'est "perdu" une
// fois les 5 affichages passés.
export default function TutorialBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const count = raw ? parseInt(raw, 10) || 0 : 0;
      if (count < MAX_AUTO_SHOWS) {
        window.localStorage.setItem(STORAGE_KEY, String(count + 1));
        setShow(true);
      }
    } catch {
      // localStorage indisponible (navigation privée stricte, etc.) : on
      // n'affiche simplement pas le rappel automatique, le lien reste
      // disponible ailleurs.
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand-light px-4 py-3 text-sm">
      <span className="text-ink">
        Nouveau ici ? <Link href="/tutoriel" className="font-medium text-brand hover:underline">Découvrez comment ça marche</Link> (import Cerfa/KML, zones, génération du dossier...).
      </span>
      <button
        onClick={() => setShow(false)}
        aria-label="Fermer"
        className="shrink-0 text-slate-500 hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}

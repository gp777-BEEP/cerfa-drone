"use client";

import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

// Effet de survol "projecteur qui suit le curseur" + contour progressif
// (option "A" validée par l'utilisateur parmi 4 propositions, testées en
// direct dans le chat avant d'être intégrées). Une lueur douce apparaît
// exactement sous le curseur plutôt que sur tout le lien d'un coup, et un
// contour arrondi se dessine en fondu autour de l'élément survolé.
const BASE_STYLE: CSSProperties = {
  transition: "background 0.15s ease, border-color 0.35s ease, color 0.25s ease",
  borderRadius: 8,
  border: "1px solid transparent",
};

export function useSpotlightHover() {
  const [dynamic, setDynamic] = useState<CSSProperties>({});

  function onMouseMove(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setDynamic({
      background: `radial-gradient(60px circle at ${x}px ${y}px, rgba(65,250,187,0.28), transparent 70%)`,
      borderColor: "rgba(65,250,187,0.5)",
    });
  }

  function onMouseLeave() {
    setDynamic({});
  }

  return { style: { ...BASE_STYLE, ...dynamic }, onMouseMove, onMouseLeave };
}

// Variante pour les boutons pleins (fond de couleur, ex. "Générer le dossier
// PDF") : le fond Tailwind (bg-brand) reste visible au repos, et seul le
// survol bascule sur un dégradé qui superpose une lueur blanche suivant le
// curseur par-dessus une couleur de fond assombrie (remplace l'effet
// hover:bg-brand-dark habituel, qu'un style inline écraserait sinon).
const BASE_STYLE_FILLED: CSSProperties = {
  transition: "background 0.15s ease, border-color 0.35s ease",
  border: "1px solid transparent",
};

export function useSpotlightHoverFilled(hoverBg: string, borderRadius = 6) {
  const [dynamic, setDynamic] = useState<CSSProperties>({});

  function onMouseMove(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setDynamic({
      background: `radial-gradient(70px circle at ${x}px ${y}px, rgba(255,255,255,0.32), transparent 70%), ${hoverBg}`,
      borderColor: "rgba(255,255,255,0.35)",
    });
  }

  function onMouseLeave() {
    setDynamic({});
  }

  return {
    style: { ...BASE_STYLE_FILLED, borderRadius, ...dynamic },
    onMouseMove,
    onMouseLeave,
  };
}

// Variante pour les éléments qui ont déjà une bordure visible au repos gérée
// par des classes Tailwind (ex. le cadre en pointillés "+ Ajouter une zone
// de vol") : seule la lueur de fond suit le curseur, la couleur de la
// bordure reste pilotée par le hover: Tailwind existant plutôt que d'être
// écrasée par un style inline.
const BASE_STYLE_BG_ONLY: CSSProperties = {
  transition: "background 0.15s ease",
};

export function useSpotlightHoverBgOnly() {
  const [dynamic, setDynamic] = useState<CSSProperties>({});

  function onMouseMove(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setDynamic({
      background: `radial-gradient(60px circle at ${x}px ${y}px, rgba(65,250,187,0.16), transparent 70%)`,
    });
  }

  function onMouseLeave() {
    setDynamic({});
  }

  return { style: { ...BASE_STYLE_BG_ONLY, ...dynamic }, onMouseMove, onMouseLeave };
}

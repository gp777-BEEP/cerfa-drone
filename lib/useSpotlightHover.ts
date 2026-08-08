"use client";

import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

// Effet de survol "projecteur qui suit le curseur" + contour progressif
// (option "A" validée par l'utilisateur parmi 4 propositions, testées en
// direct dans le chat avant d'être intégrées). Une lueur douce apparaît
// exactement sous le curseur plutôt que sur tout le lien d'un coup, et un
// contour arrondi se dessine en fondu autour de l'élément survolé.
//
// onClick réinitialise l'effet ET retire le focus de l'élément (blur) :
// double filet de sécurité contre le contour qui restait visible après un
// clic. Le reset de state gère le cas où c'est notre halo/bordure inline qui
// restait figé (mouseleave qui ne se déclenche jamais si le clic navigue
// sans que la souris ne bouge d'un pixel) ; le blur() gère le cas où c'est
// l'anneau de focus par défaut du navigateur qui reste affiché après un
// clic sur un lien/bouton, indépendamment de notre propre style.
// Le contour passait de transparent à vert au survol, et restait parfois
// "coincé" visuellement après un clic malgré plusieurs correctifs (reset au
// clic, blur, tap-highlight désactivé). Plutôt que de continuer à chasser
// la cause exacte : le contour est maintenant TOUJOURS visible, fin et
// discret au repos -> il n'y a plus d'état "transparent" dans lequel rester
// coincé, juste une transition entre deux verts (fin -> plus marqué) au
// survol, parfaitement réversible.
// Alpha du contour au repos relevé de 0.28 à 0.5 (et le contour au survol de
// 0.5 à 0.7 ci-dessous) : signalé à nouveau comme "vert avant / gris après
// survol" malgré la bordure permanente. Le code ne permet plus d'état
// réellement transparent ou différent avant/après (même style exact des deux
// côtés), donc l'explication la plus probable est perceptuelle -- à 0.28
// d'opacité sur un fond sombre semi-transparent, le vert peut se lire comme
// gris terne par contraste avec l'état survolé, plus vif. On rend donc le
// contour au repos nettement et sans ambiguïté vert.
const BASE_STYLE: CSSProperties = {
  transition: "background 0.15s ease, border-color 0.35s ease, color 0.25s ease",
  borderRadius: 8,
  border: "1px solid rgba(65,250,187,0.5)",
};

function makeReset(setDynamic: (v: CSSProperties) => void) {
  return function reset(e?: MouseEvent<HTMLElement>) {
    setDynamic({});
    e?.currentTarget?.blur();
  };
}

export function useSpotlightHover() {
  const [dynamic, setDynamic] = useState<CSSProperties>({});

  function onMouseMove(e: MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setDynamic({
      background: `radial-gradient(60px circle at ${x}px ${y}px, rgba(65,250,187,0.28), transparent 70%)`,
      borderColor: "rgba(65,250,187,0.7)",
    });
  }

  const reset = makeReset(setDynamic);

  return { style: { ...BASE_STYLE, ...dynamic }, onMouseMove, onMouseLeave: reset, onClick: reset };
}

// Variante pour les boutons pleins (fond de couleur, ex. "Générer le dossier
// PDF") : le fond Tailwind (bg-brand) reste visible au repos, et seul le
// survol bascule sur un dégradé qui superpose une lueur blanche suivant le
// curseur par-dessus une couleur de fond assombrie (remplace l'effet
// hover:bg-brand-dark habituel, qu'un style inline écraserait sinon).
const BASE_STYLE_FILLED: CSSProperties = {
  transition: "background 0.15s ease, border-color 0.35s ease",
  border: "1px solid rgba(255,255,255,0.12)",
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

  const reset = makeReset(setDynamic);

  return {
    style: { ...BASE_STYLE_FILLED, borderRadius, ...dynamic },
    onMouseMove,
    onMouseLeave: reset,
    onClick: reset,
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

  const reset = makeReset(setDynamic);

  return { style: { ...BASE_STYLE_BG_ONLY, ...dynamic }, onMouseMove, onMouseLeave: reset, onClick: reset };
}

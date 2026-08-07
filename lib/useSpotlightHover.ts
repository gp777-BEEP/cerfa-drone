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

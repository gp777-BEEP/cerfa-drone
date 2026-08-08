"use client";

import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

// Textarea qui s'agrandit automatiquement vers le bas au fur et à mesure de
// la saisie (au lieu de rester à hauteur fixe avec un scroll interne, ou de
// nécessiter un redimensionnement manuel à la souris) -- retour bêta-testeur :
// certains textes (contexte de prise de vue, description de site...) sont
// parfois bien plus longs que d'autres. Le useEffect sur `value` gère aussi
// le cas d'un remplissage programmatique (import Cerfa/KML), pas seulement
// la frappe au clavier.
export default function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
      style={{ overflow: "hidden", resize: "none", ...props.style }}
    />
  );
}

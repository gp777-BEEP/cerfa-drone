import type { CSSProperties } from "react";

// Icône de marque (refonte 2026) : croix de 4 barres inclinée à 45°, chaque
// barre terminée par un rond -- les 4 hélices d'un drone vues du dessus.
// Remplace l'ancienne icône (X + ligne verticale). currentColor pour
// s'adapter au contexte (accent clair en-tête, gris foncé sur fond clair).
export default function DroneIcon({
  size = 20,
  className = "",
  style = {},
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      className={className}
      style={{ transform: "rotate(45deg)", ...style }}
      aria-hidden="true"
    >
      <line x1="32" y1="10" x2="32" y2="26" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="38" x2="32" y2="54" strokeWidth="4" strokeLinecap="round" />
      <line x1="10" y1="32" x2="26" y2="32" strokeWidth="4" strokeLinecap="round" />
      <line x1="38" y1="32" x2="54" y2="32" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="8" r="4.5" fill="currentColor" stroke="none" />
      <circle cx="32" cy="56" r="4.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="32" r="4.5" fill="currentColor" stroke="none" />
      <circle cx="56" cy="32" r="4.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

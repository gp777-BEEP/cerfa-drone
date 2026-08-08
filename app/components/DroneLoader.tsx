import type { CSSProperties } from "react";

// Loader de marque : reprend la silhouette du logo (DroneIcon) mais chaque
// bras se trace du centre vers le point qui représente le moteur, plutôt
// qu'une simple rotation. Les 4 bras et leurs points moteur animent en
// boucle via les keyframes drone-loader-draw / drone-loader-motor définies
// dans globals.css (mutualisées pour ne pas dupliquer les @keyframes à
// chaque usage). currentColor pour s'adapter au contexte, comme DroneIcon.
export default function DroneLoader({
  size = 40,
  className = "",
  style = {},
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const armStyle: CSSProperties = {
    strokeDasharray: 16,
    animation: "drone-loader-draw 2.2s ease-in-out infinite",
  };
  const motorStyle = (originX: number, originY: number): CSSProperties => ({
    transformOrigin: `${originX}px ${originY}px`,
    animation: "drone-loader-motor 2.2s ease-in-out infinite",
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <g
        style={{ transform: "rotate(45deg)", transformOrigin: "32px 32px" }}
        stroke="currentColor"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      >
        {/* Chaque ligne part du centre (proche de 32,32) vers l'extérieur :
            l'ordre x1,y1 -> x2,y2 détermine le sens de tracé de l'animation
            stroke-dashoffset (toujours du premier point vers le second). */}
        <line x1="32" y1="26" x2="32" y2="10" style={armStyle} />
        <line x1="32" y1="38" x2="32" y2="54" style={armStyle} />
        <line x1="26" y1="32" x2="10" y2="32" style={armStyle} />
        <line x1="38" y1="32" x2="54" y2="32" style={armStyle} />
      </g>
      <g
        style={{ transform: "rotate(45deg)", transformOrigin: "32px 32px" }}
        fill="currentColor"
      >
        <circle cx="32" cy="8" r="4.5" style={motorStyle(32, 8)} />
        <circle cx="32" cy="56" r="4.5" style={motorStyle(32, 56)} />
        <circle cx="8" cy="32" r="4.5" style={motorStyle(8, 32)} />
        <circle cx="56" cy="32" r="4.5" style={motorStyle(56, 32)} />
      </g>
    </svg>
  );
}

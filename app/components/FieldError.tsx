"use client";

// Message de champ obligatoire manquant, dans le même esprit visuel que
// FieldHint (petite bulle avec pointe), mais toujours visible (pas au
// survol) et teintée rouge/orange plutôt que verte : remplace l'infobulle
// native du navigateur ("Veuillez renseigner ce champ"), hors charte et non
// personnalisable, signalée confuse par un beta testeur.
export default function FieldError({ text = "Veuillez renseigner ce champ." }: { text?: string }) {
  return (
    <span className="relative mt-1.5 inline-block">
      <span className="flex items-center gap-1.5 rounded-lg border border-danger/40 bg-[#1a0e0d] px-2.5 py-1.5 text-xs text-danger-text shadow-lg">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        {text}
      </span>
    </span>
  );
}

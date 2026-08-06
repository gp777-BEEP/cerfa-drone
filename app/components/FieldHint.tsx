"use client";

// Aide contextuelle en bulle au survol (option "B" validée par l'utilisateur
// parmi 4 propositions) : une icône "?" à côté du libellé fait apparaître une
// courte explication de ce qu'attend le Cerfa pour ce champ, teintée en vert
// accent. group-focus-within couvre aussi la navigation clavier (Tab).
export default function FieldHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        tabIndex={0}
        aria-label="Aide"
        onClick={(e) => {
          // Empêche le comportement par défaut d'un <label> englobant (qui
          // sinon coche/focus le champ associé au clic sur l'icône).
          e.preventDefault();
          e.stopPropagation();
        }}
        className="ml-1 inline-flex translate-y-[-1px] items-center text-slate-500 hover:text-brand focus:text-brand focus:outline-none"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-brand/40 bg-[#0d1512] px-2.5 py-2 text-xs font-normal normal-case leading-snug text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

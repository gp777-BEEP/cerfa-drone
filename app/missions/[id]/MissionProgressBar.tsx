"use client";

// Barre de progression sticky (option "B" validée par l'utilisateur parmi 4
// propositions pour réorganiser la page mission) : repère visuel de l'état
// d'avancement du dossier (dates, zones, drones, génération), avec des
// ancres cliquables pour sauter directement à la section concernée. La page
// reste en un seul défilement (pas d'onglets qui cacheraient du contenu),
// juste un fil d'ariane au-dessus.
export default function MissionProgressBar({
  steps,
}: {
  steps: { id: string; label: string; done: boolean }[];
}) {
  return (
    <div className="sticky top-14 z-40 -mx-6 mb-6 border-b border-white/10 bg-[#0a0f11]/95 px-6 py-2.5 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border sm:px-4">
      <div className="mb-1.5 flex gap-1.5">
        {steps.map((s) => (
          <div
            key={s.id}
            className={`h-[3px] flex-1 rounded-full ${s.done ? "bg-brand" : "bg-white/10"}`}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {steps.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`flex items-center gap-1 text-xs font-medium ${
              s.done ? "text-brand" : "text-slate-400 hover:text-ink"
            }`}
          >
            {s.done && <span aria-hidden="true">✓</span>}
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

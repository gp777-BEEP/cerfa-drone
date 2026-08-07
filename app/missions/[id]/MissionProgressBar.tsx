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
    <div className="sticky top-14 z-40 -mx-6 mb-6 border-b border-white/10 bg-[#050706]/95 px-6 py-2.5 backdrop-blur-sm sm:mx-0 sm:rounded-lg sm:border sm:px-4">
      <div className="flex justify-between gap-1.5">
        {steps.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="group flex-1">
            <div
              className={`h-[3px] rounded-full transition-all duration-200 ease-out group-hover:h-[5px] ${
                s.done
                  ? "bg-brand group-hover:shadow-[0_0_8px_rgba(65,250,187,0.7)]"
                  : "bg-white/10 group-hover:bg-white/25"
              }`}
            />
            <div
              className={`mt-1.5 flex items-center gap-1 text-xs font-medium transition-all duration-200 ease-out group-hover:translate-x-0.5 ${
                s.done ? "text-brand" : "text-slate-400 group-hover:text-ink"
              }`}
            >
              {s.done && <span aria-hidden="true">✓</span>}
              <span className="border-b border-transparent transition-colors duration-200 group-hover:border-current">
                {s.label}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { WarningBanner } from "../../components/Banner";

// Navigation latérale persistante (option "D" validée par l'utilisateur
// parmi 4 propositions pour retravailler Infos/Zones/Drones/Génération) :
// remplace l'ancienne barre de progression à ancres (qui faisait défiler une
// longue page) par un vrai panneau de réglages -- une section à la fois,
// sélectionnée dans le menu. Sur mobile, le menu devient une rangée de
// puces horizontales scrollables plutôt qu'une colonne (pas assez de
// largeur pour une vraie sidebar).
export type MissionSection = {
  id: string;
  label: string;
  done: boolean;
  content: ReactNode;
};

export type MissingItem = {
  label: string;
  href: string;
  // Si renseigné, cliquer sur l'item bascule directement sur cette section
  // (au lieu de faire défiler une ancre qui n'existe plus dans le DOM tant
  // que la section n'est pas active).
  sectionId?: string;
};

export default function MissionSectionsLayout({
  sections,
  missingItems,
}: {
  sections: MissionSection[];
  missingItems: MissingItem[];
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const current = sections.find((s) => s.id === active) || sections[0];

  function goTo(item: MissingItem) {
    if (item.sectionId) {
      // Le hash reste utile : ZoneManager relit window.location.hash à son
      // montage pour ouvrir directement la bonne zone en édition.
      if (item.href.startsWith("#")) window.location.hash = item.href;
      setActive(item.sectionId);
    }
  }

  return (
    <div className="mt-6">
      {missingItems.length > 0 && (
        <WarningBanner className="mb-4">
          <p className="mb-1 font-medium">Il manque des informations pour un dossier complet :</p>
          <ul className="ml-4 list-disc">
            {missingItems.map((item, i) => (
              <li key={i}>
                {item.sectionId ? (
                  <button type="button" onClick={() => goTo(item)} className="underline hover:text-warning-text">
                    {item.label}
                  </button>
                ) : (
                  <a href={item.href} className="underline hover:text-warning-text">
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-80">
            Vous pouvez quand même générer maintenant, mais la préfecture risque de vous demander de compléter.
          </p>
        </WarningBanner>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <nav className="flex gap-1.5 overflow-x-auto pb-1 sm:w-40 sm:shrink-0 sm:flex-col sm:gap-1 sm:overflow-visible sm:pb-0">
          {sections.map((s) => {
            const isActive = s.id === current?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`flex shrink-0 items-center justify-between gap-2 rounded-lg border-l-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "border-brand bg-brand-light font-medium text-ink"
                    : "border-transparent text-slate-400 hover:bg-white/5 hover:text-ink"
                }`}
              >
                <span>{s.label}</span>
                {s.done && (
                  <span className="text-brand" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="min-w-0 flex-1">{current?.content}</div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import AppHeader from "../components/AppHeader";

// Version "digest" du tutoriel (l'ancienne page, très complète, avait été
// jugée trop dense pour un premier coup d'œil) : l'essentiel en une ligne
// grasse par étape, un visuel qui respire, et un renvoi en bas vers le guide
// complet pour qui veut tous les détails.
function IconMission() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}
function IconZone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 21c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </svg>
  );
}
function IconGenerate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M12 12v5M9.5 14.5 12 17l2.5-2.5" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function Step({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3.5 bg-glass p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
        <div className="h-5 w-5">{icon}</div>
      </div>
      <div className="pt-0.5">
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-slate-500">{children}</p>
      </div>
    </div>
  );
}

export default function TutorielPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-medium text-ink">Tutoriel</h1>
        <p className="mb-6 text-sm text-slate-500">L'essentiel pour générer un dossier, en 5 étapes.</p>

        <div className="space-y-3">
          <Step icon={<IconMission />} title="1. Créez une mission">
            <strong className="text-ink">"+ Nouvelle mission"</strong>, un titre et des dates. Le reste peut
            être complété plus tard.
          </Step>
          <Step icon={<IconZone />} title="2. Décrivez la zone de vol">
            <strong className="text-ink">Cerfa déjà rempli</strong>,{" "}
            <strong className="text-ink">fichier KML</strong>, ou{" "}
            <strong className="text-ink">simple capture d'écran</strong> : les trois fonctionnent, à
            combiner librement.
          </Step>
          <Step icon={<IconProfile />} title="3. Complétez profil et drones">
            Une seule fois : <strong className="text-ink">identité</strong> et{" "}
            <strong className="text-ink">drones</strong> se réutilisent automatiquement sur toutes vos
            missions.
          </Step>
          <Step icon={<IconGenerate />} title="4. Générez le dossier PDF">
            Un aperçu s'affiche avant le téléchargement.{" "}
            <strong className="text-ink">N'oubliez pas de le signer.</strong>
          </Step>
          <Step icon={<IconMail />} title="5. Envoyez-le à la préfecture">
            Bouton d'email pré-rempli en bas de la mission, destinataire{" "}
            <strong className="text-ink">détecté automatiquement</strong>. Pensez à joindre le PDF.
          </Step>
        </div>

        <Link
          href="/tutoriel/detail"
          className="mt-6 flex items-center justify-between rounded-xl border border-brand/30 bg-brand-light px-4 py-3 text-sm text-ink hover:bg-brand-light/70"
        >
          <span>Besoin de plus de détails, cas par cas ?</span>
          <span className="text-brand">Guide complet →</span>
        </Link>

        <p className="mt-6 text-xs text-slate-500">
          Une question ou une idée qui manque ?{" "}
          <a href="/suggestions" className="text-brand hover:underline">
            Dites-le sur la page Suggestions
          </a>
          .
        </p>
      </main>
    </>
  );
}

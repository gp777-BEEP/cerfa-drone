"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBanner, WarningBanner } from "../../components/Banner";
import Coachmark from "../../components/Coachmark";
import { useSpotlightHoverFilled } from "@/lib/useSpotlightHover";
import SendToPrefectureButton from "./SendToPrefectureButton";
import DroneLoader from "../../components/DroneLoader";

type Zone = {
  id: string;
  title: string | null;
  adresse: string | null;
  code_postal: string | null;
  localite: string | null;
};

// Fusionne "Générer le dossier" et "Envoyer à la préfecture" en un seul flux
// à 2 étapes numérotées plutôt que deux blocs indépendants l'un sous l'autre
// -- retour bêta-testeur : pas clair qu'il fallait générer avant d'envoyer.
// L'étape 2 reste visible mais verrouillée (texte grisé + message) tant
// qu'aucun dossier n'existe pour cette mission (ni déjà généré avant, ni
// généré à l'instant dans cette session).
export default function GenerateAndSendFlow({
  missionId,
  hasExistingDocument,
  missionTitle,
  dateDebut,
  dateFin,
  pilotName,
  zones,
}: {
  missionId: string;
  hasExistingDocument: boolean;
  missionTitle: string;
  dateDebut?: string | null;
  dateFin?: string | null;
  pilotName?: string | null;
  zones: Zone[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [justGenerated, setJustGenerated] = useState(false);
  const spotlightMain = useSpotlightHoverFilled("#005333");
  const spotlightDownload = useSpotlightHoverFilled("#005333");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!previewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

  const generated = hasExistingDocument || justGenerated;

  // Même correctif que DocumentsList.tsx : un <a href target="_blank"> vers
  // l'URL signée Supabase Storage ouvre le PDF dans un onglet/visionneuse au
  // lieu de le télécharger (l'attribut download est ignoré cross-origin).
  // C'est LE bouton "Télécharger" que la plupart des utilisateurs
  // rencontrent en premier (celui de l'aperçu, juste après génération) --
  // corrigé ici en plus des deux autres endroits déjà traités.
  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "dossier-cerfa-drone.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleClick() {
    setLoading(true);
    setError("");
    setUrl("");
    try {
      const res = await fetch("/api/generate-dossier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          `Le serveur n'a pas répondu correctement (code ${res.status}). Réessayez dans quelques secondes.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      setUrl(data.downloadUrl);
      setJustGenerated(true);
      setPreviewOpen(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <StepBadge n={1} done={generated} />
          <h3 className="text-sm font-medium text-ink">Générer le dossier PDF</h3>
        </div>
        <Coachmark
          id="apercu-avant-generation"
          text="Le dossier s'affichera d'abord dans un aperçu, avant le téléchargement, pour vérifier que tout est correct."
          className="mb-3 ml-7"
        />
        <div className="ml-7">
          <button
            onClick={(e) => {
              spotlightMain.onClick(e);
              handleClick();
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-brand px-6 py-2.5 font-medium text-brand-ink outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
            style={spotlightMain.style}
            onMouseMove={spotlightMain.onMouseMove}
            onMouseLeave={spotlightMain.onMouseLeave}
          >
            {loading && <DroneLoader size={16} className="text-brand-ink" />}
            {loading ? "Génération en cours..." : generated ? "Régénérer le dossier PDF" : "Générer le dossier PDF"}
          </button>
          {error && <ErrorBanner className="mt-2">{error}</ErrorBanner>}
          {url && !previewOpen && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="mt-3 block text-sm font-medium text-brand hover:underline"
            >
              Revoir l'aperçu du dossier →
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="mb-2 flex items-center gap-2">
          <StepBadge n={2} done={false} disabled={!generated} />
          <h3 className={`text-sm font-medium ${generated ? "text-ink" : "text-slate-500"}`}>
            Envoyer le dossier à la préfecture
          </h3>
        </div>
        {generated ? (
          <div className="ml-7">
            <SendToPrefectureButton
              missionTitle={missionTitle}
              dateDebut={dateDebut}
              dateFin={dateFin}
              pilotName={pilotName}
              zones={zones}
            />
          </div>
        ) : (
          <p className="ml-7 text-xs text-slate-500">Générez d'abord le dossier PDF ci-dessus.</p>
        )}
      </div>

      {mounted &&
        previewOpen &&
        url &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="flex h-full max-h-[900px] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1512] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-medium text-ink">Aperçu du dossier</span>
                <button
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Fermer l'aperçu"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-ink"
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 flex-1 bg-slate-900">
                <iframe src={url} title="Aperçu du dossier PDF" className="h-full w-full border-0" />
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
                <WarningBanner className="flex-1">
                  Avant de l'envoyer à la préfecture, n'oubliez pas de signer le document.
                </WarningBanner>
                <button
                  onClick={(e) => {
                    spotlightDownload.onClick(e);
                    handleDownload();
                  }}
                  disabled={downloading}
                  className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
                  style={spotlightDownload.style}
                  onMouseMove={spotlightDownload.onMouseMove}
                  onMouseLeave={spotlightDownload.onMouseLeave}
                >
                  {downloading ? "Téléchargement..." : "Télécharger"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function StepBadge({ n, done, disabled }: { n: number; done: boolean; disabled?: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        done
          ? "bg-brand text-brand-ink"
          : disabled
          ? "border border-white/10 text-slate-600"
          : "border border-brand/40 text-brand"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

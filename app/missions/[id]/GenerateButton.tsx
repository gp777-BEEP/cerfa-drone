"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBanner, WarningBanner } from "../../components/Banner";
import Coachmark from "../../components/Coachmark";
import { useSpotlightHoverFilled } from "@/lib/useSpotlightHover";

export default function GenerateButton({ missionId }: { missionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const spotlightMain = useSpotlightHoverFilled("#005333");
  const spotlightDownload = useSpotlightHoverFilled("#005333");
  // Visionneuse plein écran (option "C" validée par l'utilisateur parmi 4
  // propositions) : avant de télécharger/envoyer le dossier, on l'affiche
  // dans une modale (l'iframe utilise le lecteur PDF natif du navigateur,
  // qui gère déjà pagination/zoom/impression sans code supplémentaire).
  const [previewOpen, setPreviewOpen] = useState(false);
  // Ce bouton est rendu à l'intérieur d'une carte .bg-glass (backdrop-filter),
  // qui crée un nouveau "containing block" pour tout descendant en
  // position:fixed (comportement CSS standard) : la modale se retrouvait donc
  // coincée dans les limites de la carte au lieu de couvrir tout l'écran.
  // On la sort du DOM de la carte via un portail directement dans <body>.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!previewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewOpen]);

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
      setPreviewOpen(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Coachmark
        id="apercu-avant-generation"
        text="Le dossier s'affichera d'abord dans un aperçu, avant le téléchargement, pour vérifier que tout est correct."
        className="mb-3"
      />
      <button
        onClick={(e) => {
          spotlightMain.onClick(e);
          handleClick();
        }}
        disabled={loading}
        className="rounded-md bg-brand px-6 py-2.5 font-medium text-brand-ink outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
        style={spotlightMain.style}
        onMouseMove={spotlightMain.onMouseMove}
        onMouseLeave={spotlightMain.onMouseLeave}
      >
        {loading ? "Génération en cours..." : "Générer le dossier PDF"}
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
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-brand/50"
                  style={spotlightDownload.style}
                  onMouseMove={spotlightDownload.onMouseMove}
                  onMouseLeave={spotlightDownload.onMouseLeave}
                  onClick={spotlightDownload.onClick}
                >
                  Télécharger
                </a>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

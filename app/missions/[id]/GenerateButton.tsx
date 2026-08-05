"use client";

import { useState } from "react";
import { ErrorBanner, WarningBanner } from "../../components/Banner";

export default function GenerateButton({ missionId }: { missionId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

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
          `Le serveur n'a pas répondu correctement (code ${res.status}). Réessaie dans quelques secondes.`
        );
      }
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      setUrl(data.downloadUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-brand px-6 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {loading ? "Génération en cours..." : "Générer le dossier PDF"}
      </button>
      {error && <ErrorBanner className="mt-2">{error}</ErrorBanner>}
      {url && (
        <div className="mt-3">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block text-sm font-medium text-brand hover:underline"
          >
            Télécharger le dossier généré →
          </a>
          <WarningBanner className="mt-2">
            Avant de l'envoyer à la préfecture, n'oublie pas de signer le document.
          </WarningBanner>
        </div>
      )}
    </div>
  );
}

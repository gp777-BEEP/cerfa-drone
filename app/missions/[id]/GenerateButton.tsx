"use client";

import { useState } from "react";

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
      const data = await res.json();
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-sm font-medium text-brand hover:underline"
        >
          Télécharger le dossier généré →
        </a>
      )}
    </div>
  );
}

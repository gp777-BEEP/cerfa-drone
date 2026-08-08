"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorBanner } from "../components/Banner";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

export default function SuggestionForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spotlight = useSpotlightHoverBgOnly();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    setError(null);

    // Passe par une route API (plutôt qu'un insert direct) pour pouvoir
    // déclencher une notification email côté serveur (clé Resend jamais
    // exposée au navigateur) en plus de l'enregistrement en base.
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });
    const data = await res.json().catch(() => ({}));

    setSaving(false);
    if (!res.ok) {
      setError("Erreur lors de l'envoi : " + (data.error || "erreur inconnue"));
      return;
    }

    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-glass p-4">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        placeholder="Ex : pouvoir importer un fichier KML pour générer la carte automatiquement..."
        className="w-full resize-none rounded-md border border-slate-300 p-2.5 text-sm text-ink focus:border-brand focus:outline-none"
      />
      {error && <ErrorBanner className="mt-2">{error}</ErrorBanner>}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={saving || !message.trim()}
          className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
          style={spotlight.style}
          onMouseMove={spotlight.onMouseMove}
          onMouseLeave={spotlight.onMouseLeave}
        >
          {saving ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}

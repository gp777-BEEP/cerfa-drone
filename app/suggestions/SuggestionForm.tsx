"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "../components/Banner";

export default function SuggestionForm() {
  const router = useRouter();
  const supabase = createClient();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Vous devez être connecté(e).");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("suggestions")
      .insert({ user_id: user.id, message: message.trim() });

    setSaving(false);
    if (insertError) {
      setError("Erreur lors de l'envoi : " + insertError.message);
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
          className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}

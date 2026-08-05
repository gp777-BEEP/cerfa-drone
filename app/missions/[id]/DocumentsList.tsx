"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Doc = { id: string; file_path: string; created_at: string };

export default function DocumentsList({ documents }: { documents: Doc[] }) {
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  if (documents.length === 0) return null;

  async function handleDownload(doc: Doc) {
    setLoadingId(doc.id);
    setErrorId(null);
    // Les URL signées expirent au bout d'1h : on en régénère une à chaque
    // clic plutôt que de garder celle du moment de la génération.
    const { data, error } = await supabase.storage.from("dossiers").createSignedUrl(doc.file_path, 3600);
    setLoadingId(null);
    if (error || !data) {
      setErrorId(doc.id);
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const latest = documents[0];
  const older = documents.slice(1);

  return (
    <div className="mt-4 text-sm">
      <p className="mb-1 text-slate-500">Dernier dossier généré :</p>
      <button
        onClick={() => handleDownload(latest)}
        disabled={loadingId === latest.id}
        className="font-medium text-brand hover:underline disabled:opacity-50"
      >
        {loadingId === latest.id
          ? "Préparation du lien..."
          : `Télécharger (${new Date(latest.created_at).toLocaleString("fr-FR")})`}
      </button>
      {errorId === latest.id && <p className="mt-1 text-xs text-red-400">Lien indisponible, réessaie.</p>}

      {older.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-slate-500 hover:text-ink">
            Historique ({older.length} version{older.length > 1 ? "s" : ""} précédente
            {older.length > 1 ? "s" : ""})
          </summary>
          <div className="mt-2 space-y-1">
            {older.map((d) => (
              <div key={d.id}>
                <button
                  onClick={() => handleDownload(d)}
                  disabled={loadingId === d.id}
                  className="text-slate-500 hover:text-brand hover:underline disabled:opacity-50"
                >
                  {loadingId === d.id ? "Préparation..." : new Date(d.created_at).toLocaleString("fr-FR")}
                </button>
                {errorId === d.id && <span className="ml-2 text-xs text-red-400">Lien indisponible</span>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

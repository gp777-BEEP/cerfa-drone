"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mission = {
  id: string;
  title: string;
  mission_type: string;
  status: string;
  date_debut: string | null;
  archived: boolean | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prête",
  dossier_genere: "Dossier généré",
};

const STATUS_COLOR: Record<string, [string, string]> = {
  draft: ["border-slate-300", "text-slate-400"],
  ready: ["border-warning", "text-warning-text"],
  dossier_genere: ["border-brand", "text-brand"],
};

export default function MissionList({
  initialMissions,
  emptyProfile,
  latestDocByMission,
}: {
  initialMissions: Mission[];
  emptyProfile?: boolean;
  latestDocByMission?: Record<string, string>;
}) {
  const supabase = createClient();
  const [missions, setMissions] = useState(initialMissions);
  const [showArchived, setShowArchived] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const archivedCount = missions.filter((m) => m.archived).length;
  const visible = missions.filter((m) => showArchived || !m.archived);

  async function toggleArchive(id: string, archived: boolean) {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, archived: !archived } : m)));
    await supabase.from("missions").update({ archived: !archived }).eq("id", id);
  }

  async function deleteMission(id: string, title: string) {
    if (!confirm(`Supprimer définitivement la mission "${title}" ? Cette action est irréversible.`)) return;
    setMissions((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("missions").delete().eq("id", id);
  }

  // Aperçu du dernier dossier généré, directement depuis la liste (demandé
  // par un beta testeur : le statut "Dossier généré" ne menait nulle part
  // au clic auparavant).
  async function previewDoc(missionId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const path = latestDocByMission?.[missionId];
    if (!path) return;
    setPreviewLoadingId(missionId);
    const { data, error } = await supabase.storage.from("dossiers").createSignedUrl(path, 3600);
    setPreviewLoadingId(null);
    if (!error && data) window.open(data.signedUrl, "_blank");
  }

  return (
    <div>
      {archivedCount > 0 && (
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Afficher les missions archivées ({archivedCount})
        </label>
      )}

      <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
        {visible.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            {emptyProfile
              ? "Une fois votre profil rempli, créez votre première mission avec le bouton ci-dessus : elle apparaîtra ici."
              : "Aucune mission pour l'instant. Créez la première !"}
          </p>
        )}
        {visible.map((m) => {
          const [borderColor, textColor] = STATUS_COLOR[m.status] || ["border-slate-300", "text-slate-400"];
          const hasDoc = m.status === "dossier_genere" && !!latestDocByMission?.[m.id];
          return (
            <div
              key={m.id}
              className={`flex items-center justify-between border-l-2 px-5 py-3.5 hover:bg-white/[0.04] ${
                m.archived ? "opacity-60" : ""
              } ${borderColor}`}
            >
              <Link href={`/missions/${m.id}`} className="flex min-w-0 flex-1 items-baseline gap-2">
                {m.status === "draft" && (
                  <span className="shrink-0 text-xs font-semibold text-slate-400" title="Pas encore de dossier généré">
                    Brouillon
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    {m.mission_type} {m.date_debut ? `· ${m.date_debut}` : ""} {m.archived ? "· Archivée" : ""}
                  </p>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-3 pl-3">
                {m.status !== "draft" &&
                  (hasDoc ? (
                    <button
                      onClick={(e) => previewDoc(m.id, e)}
                      disabled={previewLoadingId === m.id}
                      className={`text-xs font-medium hover:underline disabled:opacity-50 ${textColor}`}
                    >
                      {previewLoadingId === m.id ? "Préparation..." : STATUS_LABEL[m.status] || m.status}
                    </button>
                  ) : (
                    <span className={`text-xs font-medium ${textColor}`}>{STATUS_LABEL[m.status] || m.status}</span>
                  ))}
                <button
                  onClick={() => toggleArchive(m.id, !!m.archived)}
                  className="text-xs text-slate-400 hover:text-brand hover:underline"
                >
                  {m.archived ? "Désarchiver" : "Archiver"}
                </button>
                <button
                  onClick={() => deleteMission(m.id, m.title)}
                  className="text-xs text-slate-400 hover:text-red-600 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  // Sélection multiple (retour bêta-testeur) : cocher plusieurs missions pour
  // les archiver ou les supprimer en une seule action plutôt qu'une par une.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const archivedCount = missions.filter((m) => m.archived).length;
  const visible = missions.filter((m) => showArchived || !m.archived);
  // Retour bêta-testeur : "Archiver" et "Désarchiver" apparaissaient tous
  // les deux même quand la sélection ne contenait que des missions déjà
  // dans l'état correspondant (ex. proposer "Désarchiver" une mission qui
  // n'est pas archivée). On n'affiche que l'action pertinente pour la
  // sélection actuelle.
  const selectedMissions = missions.filter((m) => selected.has(m.id));
  const canArchive = selectedMissions.some((m) => !m.archived);
  const canUnarchive = selectedMissions.some((m) => m.archived);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleArchive(id: string, archived: boolean) {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, archived: !archived } : m)));
    await supabase.from("missions").update({ archived: !archived }).eq("id", id);
  }

  async function deleteMission(id: string, title: string) {
    if (!confirm(`Supprimer définitivement la mission "${title}" ? Cette action est irréversible.`)) return;
    setMissions((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("missions").delete().eq("id", id);
  }

  async function bulkArchive(archived: boolean) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    setMissions((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, archived } : m)));
    await supabase.from("missions").update({ archived }).in("id", ids);
    setSelected(new Set());
    setBulkBusy(false);
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (
      !confirm(
        `Supprimer définitivement ${ids.length} mission${ids.length > 1 ? "s" : ""} ? Cette action est irréversible.`
      )
    )
      return;
    setBulkBusy(true);
    setMissions((prev) => prev.filter((m) => !ids.includes(m.id)));
    await supabase.from("missions").delete().in("id", ids);
    setSelected(new Set());
    setBulkBusy(false);
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

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand/30 bg-brand-light px-3 py-2 text-sm">
          <span className="text-ink">
            {selected.size} mission{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            {canArchive && (
              <button
                onClick={() => bulkArchive(true)}
                disabled={bulkBusy}
                className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
              >
                Archiver
              </button>
            )}
            {canUnarchive && (
              <button
                onClick={() => bulkArchive(false)}
                disabled={bulkBusy}
                className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
              >
                Désarchiver
              </button>
            )}
            <button
              onClick={bulkDelete}
              disabled={bulkBusy}
              className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
            >
              Supprimer
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:underline">
              Annuler
            </button>
          </div>
        </div>
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
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggleSelect(m.id)}
                onClick={(e) => e.stopPropagation()}
                className="mr-3 shrink-0"
                aria-label={`Sélectionner ${m.title}`}
              />
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

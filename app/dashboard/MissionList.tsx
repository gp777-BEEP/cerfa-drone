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
  ready: ["border-amber-400", "text-amber-700"],
  dossier_genere: ["border-brand", "text-brand"],
};

export default function MissionList({ initialMissions }: { initialMissions: Mission[] }) {
  const supabase = createClient();
  const [missions, setMissions] = useState(initialMissions);
  const [showArchived, setShowArchived] = useState(false);

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

  return (
    <div>
      {archivedCount > 0 && (
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Afficher les missions archivées ({archivedCount})
        </label>
      )}

      <div className="divide-y divide-slate-200 border border-slate-200">
        {visible.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aucune mission pour l'instant. Crée la première !</p>
        )}
        {visible.map((m) => {
          const [borderColor, textColor] = STATUS_COLOR[m.status] || ["border-slate-300", "text-slate-400"];
          return (
            <div
              key={m.id}
              className={`flex items-center justify-between border-l-2 bg-white px-5 py-3.5 hover:bg-slate-50 ${
                m.archived ? "opacity-60" : ""
              } ${borderColor}`}
            >
              <Link href={`/missions/${m.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-slate-500">
                  {m.mission_type} {m.date_debut ? `· ${m.date_debut}` : ""} {m.archived ? "· Archivée" : ""}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-3 pl-3">
                <span className={`text-xs font-medium ${textColor}`}>{STATUS_LABEL[m.status] || m.status}</span>
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

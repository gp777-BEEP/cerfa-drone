"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DroneChecklist from "../../components/DroneChecklist";
import { Drone, droneKey, mergeDroneLists } from "@/lib/drones";

export default function MissionDrones({
  missionId,
  profileDrones,
  initialSelected,
}: {
  missionId: string;
  profileDrones: Drone[];
  // null/undefined = mission créée avant cette fonctionnalité (ou jamais
  // touchée) -> on retombe sur "tous les drones du profil cochés", même
  // comportement qu'avant l'ajout de la sélection par mission.
  initialSelected: Drone[] | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const allDrones = useMemo(
    () => mergeDroneLists(profileDrones, initialSelected || []),
    [profileDrones, initialSelected]
  );

  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(
    () =>
      new Set(
        initialSelected && initialSelected.length > 0
          ? initialSelected.map(droneKey)
          : profileDrones.map(droneKey)
      )
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Liste longue (tous les drones du profil), souvent réduite à 1-2 par
  // mission : une fois la sélection déjà enregistrée, on replie la liste
  // pour ne montrer que les drones cochés, avec une flèche pour tout
  // ré-afficher (édition, ajout d'un autre drone...).
  const [collapsed, setCollapsed] = useState(
    () => !!initialSelected && initialSelected.length > 0 && initialSelected.length < allDrones.length
  );

  function toggle(key: string) {
    setSaved(false);
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const selected = allDrones.filter((d) => checkedKeys.has(droneKey(d)));
    const { error } = await supabase.from("missions").update({ drones: selected }).eq("id", missionId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      if (checkedKeys.size > 0 && checkedKeys.size < allDrones.length) setCollapsed(true);
      router.refresh();
    }
  }

  const visibleDrones = collapsed ? allDrones.filter((d) => checkedKeys.has(droneKey(d))) : allDrones;

  return (
    <div>
      <DroneChecklist drones={visibleDrones} checkedKeys={checkedKeys} onToggle={toggle} />
      {collapsed && checkedKeys.size < allDrones.length && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-brand"
        >
          <span aria-hidden="true">▾</span> Afficher tous les drones ({allDrones.length})
        </button>
      )}
      {!collapsed && checkedKeys.size > 0 && checkedKeys.size < allDrones.length && (
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 hover:text-brand"
        >
          <span aria-hidden="true">▴</span> Réduire aux drones sélectionnés
        </button>
      )}
      {allDrones.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {saved && <span className="text-sm text-brand">Enregistré ✓</span>}
        </div>
      )}
    </div>
  );
}

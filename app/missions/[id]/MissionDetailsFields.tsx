"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FieldHint from "../../components/FieldHint";

// Édition de "objet précis de la mission" / "commanditaire", séparés du
// titre interne de la mission (cf. NewMissionForm.tsx pour la création) :
// utile pour compléter après import Cerfa/KML, ou simplement corriger sans
// tout recréer.
export default function MissionDetailsFields({
  missionId,
  initialObjetMission,
  initialCommanditaire,
}: {
  missionId: string;
  initialObjetMission: string | null;
  initialCommanditaire: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [objetMission, setObjetMission] = useState(initialObjetMission || "");
  const [commanditaire, setCommanditaire] = useState(initialCommanditaire || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    const changed = objetMission !== (initialObjetMission || "") || commanditaire !== (initialCommanditaire || "");
    if (!changed) return;
    setSaving(true);
    const { error } = await supabase
      .from("missions")
      .update({ objet_mission: objetMission || null, commanditaire: commanditaire || null })
      .eq("id", missionId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="mt-6 bg-glass p-5">
      <h2 className="mb-1 font-medium text-ink">Objet et commanditaire</h2>
      <p className="mb-3 text-xs text-slate-400">
        Renseignés sur le Cerfa pour chaque zone de vol. Laissez "Objet précis" vide pour reprendre le
        titre de la mission.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">
            Objet précis de la mission
            <FieldHint text="Décrit ce que fait le vol (ex : inspection de toiture, prise de vue publicitaire...). Apparaît tel quel sur le Cerfa." />
          </span>
          <input
            value={objetMission}
            onChange={(e) => setObjetMission(e.target.value)}
            onBlur={save}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">
            Commanditaire de la mission
            <FieldHint text="Qui a demandé cette mission : un client, une entreprise, une administration, ou vous-même si vous volez pour votre compte." />
          </span>
          <input
            value={commanditaire}
            onChange={(e) => setCommanditaire(e.target.value)}
            onBlur={save}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {saving && <p className="mt-2 text-xs text-slate-500">Enregistrement...</p>}
      {saved && <p className="mt-2 text-xs text-brand">Enregistré ✓</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DroneLoader from "../../components/DroneLoader";
import AutoTextarea from "../../components/AutoTextarea";
import { Pilot, EMPTY_PILOT } from "@/lib/pilots";

// Colonne "Accompagnant / Observateur" du Cerfa (case n°2, à droite des
// télépilotes 1-4) : une personne présente sur le vol sans être elle-même
// télépilote -- jamais proposée avant (retour bêta-testeur). Même forme
// qu'un télépilote (nom, naissance, adresse, statut salarié/indépendant),
// une case à cocher déplie le mini-formulaire ; si décochée, accompagnant
// est enregistré à null (colonne laissée vide sur le PDF généré).
export default function MissionContactGeneral({
  missionId,
  initialAccompagnant,
}: {
  missionId: string;
  initialAccompagnant: Pilot | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [enabled, setEnabled] = useState(!!initialAccompagnant);
  const [accompagnant, setAccompagnant] = useState<Pilot>(initialAccompagnant || { ...EMPTY_PILOT });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(patch: Partial<Pilot>) {
    setSaved(false);
    setAccompagnant((prev) => ({ ...prev, ...patch }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("missions")
      .update({ accompagnant: enabled ? accompagnant : null })
      .eq("id", missionId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="mt-6 bg-glass p-5">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
        />
        Un accompagnant ou observateur est présent sur ce vol
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Correspond à la colonne "Accompagnant / Observateur" du Cerfa. Facultatif : laissez décoché si vous
        êtes seul (ou uniquement avec les télépilotes déjà déclarés ci-dessus).
      </p>

      {enabled && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MiniField label="Prénom" value={accompagnant.prenom} onChange={(v) => update({ prenom: v })} />
          <MiniField label="Nom" value={accompagnant.nom} onChange={(v) => update({ nom: v })} />
          <MiniField
            label="Date de naissance"
            type="date"
            value={accompagnant.date_naissance}
            onChange={(v) => update({ date_naissance: v })}
          />
          <MiniField
            label="Ville de naissance"
            value={accompagnant.naissance_ville}
            onChange={(v) => update({ naissance_ville: v })}
          />
          <MiniField
            label="Pays de naissance"
            value={accompagnant.naissance_pays}
            onChange={(v) => update({ naissance_pays: v })}
          />
          <MiniField
            label="Adresse"
            value={accompagnant.adresse}
            onChange={(v) => update({ adresse: v })}
            className="sm:col-span-2"
          />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Statut</span>
            <select
              value={accompagnant.statut}
              onChange={(e) => update({ statut: e.target.value as Pilot["statut"] })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
            >
              <option value="independant">Indépendant</option>
              <option value="salarie">Salarié</option>
            </select>
          </label>
          {accompagnant.statut === "salarie" && (
            <MiniField label="Employeur" value={accompagnant.employeur} onChange={(v) => update({ employeur: v })} />
          )}
          <MiniField
            label="Téléphone portable"
            value={accompagnant.telephone_portable}
            onChange={(v) => update({ telephone_portable: v })}
          />
          <MiniField label="Email" type="email" value={accompagnant.courriel} onChange={(v) => update({ courriel: v })} />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-md border border-brand px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
        >
          {saving && <DroneLoader size={14} className="text-brand" />}
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-brand">Enregistré ✓</span>}
      </div>
    </div>
  );
}

function MiniField({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  if (type === "text") {
    return (
      <label className={`block text-sm ${className}`}>
        <span className="mb-1 block text-slate-600">{label}</span>
        <AutoTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
        />
      </label>
    );
  }

  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
      />
    </label>
  );
}

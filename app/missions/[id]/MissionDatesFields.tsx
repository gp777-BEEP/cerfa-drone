"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DateRangePicker from "../../components/DateRangePicker";

// Dates/horaires n'étaient modifiables qu'à la création de la mission (ou en
// réimportant un Cerfa/KML) : ce composant les rend éditables directement
// sur la page mission, avec le même sélecteur que sur "Nouvelle mission".
export default function MissionDatesFields({
  missionId,
  initialDateDebut,
  initialHeureDebut,
  initialDateFin,
  initialHeureFin,
}: {
  missionId: string;
  initialDateDebut: string | null;
  initialHeureDebut: string | null;
  initialDateFin: string | null;
  initialHeureFin: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [dateDebut, setDateDebut] = useState(initialDateDebut || "");
  const [heureDebut, setHeureDebut] = useState(initialHeureDebut || "09:00");
  const [dateFin, setDateFin] = useState(initialDateFin || "");
  const [heureFin, setHeureFin] = useState(initialHeureFin || "18:00");
  const [saving, setSaving] = useState(false);

  // Format lisible "JJ/MM/AAAA à HH:MM" plutôt que l'ISO brut affiché avant
  // (ex. "2026-08-12 09:00"), signalé confus par un beta testeur.
  function fmt(dateIso: string | null, heure: string | null): string {
    if (!dateIso) return "Non renseignée";
    const [y, m, d] = dateIso.split("-");
    return `${d}/${m}/${y} à ${heure || "?"}`;
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("missions")
      .update({
        date_debut: dateDebut || null,
        heure_debut: heureDebut,
        date_fin: dateFin || null,
        heure_fin: heureFin,
      })
      .eq("id", missionId);
    setSaving(false);
    if (!error) {
      setEditing(false);
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group mb-6 flex items-start gap-2.5 text-left text-sm text-slate-500 hover:text-brand"
        title="Modifier les dates et horaires"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="mt-0.5 shrink-0"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
        <span>
          <span className="block">
            <span className="text-ink">Début</span> : {fmt(initialDateDebut, initialHeureDebut)}
          </span>
          <span className="block">
            <span className="text-ink">Fin</span> : {fmt(initialDateFin, initialHeureFin)}
          </span>
        </span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <path d="M12 20h9" strokeLinecap="round" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <div className="mb-6 bg-glass p-5">
      <h2 className="mb-3 font-medium text-ink">Dates et horaires de vol</h2>
      <DateRangePicker
        dateDebut={dateDebut}
        setDateDebut={setDateDebut}
        heureDebut={heureDebut}
        setHeureDebut={setHeureDebut}
        dateFin={dateFin}
        setDateFin={setDateFin}
        heureFin={heureFin}
        setHeureFin={setHeureFin}
      />
      <div className="mt-3 flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../../components/FileDropzone";
import StatusMessage from "../../components/StatusMessage";
import { Pilot, EMPTY_PILOT, MAX_PILOTS, parsePilotFile, RosterPilot } from "@/lib/pilots";
import DroneLoader from "../../components/DroneLoader";

// Case n°2 du Cerfa ("Télépilote(s)") : jusqu'à 4 télépilotes déclarés sur
// une même mission. Par défaut, seul le profil connecté est proposé (repris
// tel quel ici pour que ce qu'on voit corresponde à ce qui sera utilisé si
// la section n'est jamais ouverte/modifiée) ; on peut en ajouter d'autres à
// la main, les sélectionner depuis le roster de pilotes enregistré sur le
// profil (retour bêta-testeur), ou importer le fichier exporté par un
// collègue depuis sa propre page Profil, pour lui éviter de tout ressaisir.
export default function MissionPilots({
  missionId,
  profileAsPilot,
  initialPilots,
  savedPilots,
}: {
  missionId: string;
  profileAsPilot: Pilot;
  initialPilots: Pilot[] | null;
  savedPilots?: RosterPilot[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [pilots, setPilots] = useState<Pilot[]>(
    initialPilots && initialPilots.length > 0 ? initialPilots : [profileAsPilot]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importing, setImporting] = useState(false);

  function update(i: number, patch: Partial<Pilot>) {
    setSaved(false);
    setPilots((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function addPilot() {
    setSaved(false);
    setPilots((prev) => (prev.length >= MAX_PILOTS ? prev : [...prev, { ...EMPTY_PILOT }]));
  }

  function addPilotFromRoster(id: string) {
    const rosterPilot = (savedPilots || []).find((p) => p.id === id);
    if (!rosterPilot || pilots.length >= MAX_PILOTS) return;
    setSaved(false);
    const { id: _drop, ...pilotFields } = rosterPilot;
    setPilots((prev) => [...prev, pilotFields]);
  }

  function removePilot(i: number) {
    setSaved(false);
    setPilots((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportMsg("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const pilot = parsePilotFile(json);
      if (!pilot) {
        setImportMsg(`"${file.name}" n'est pas un fichier pilote valide (exporté depuis la page Profil).`);
        return;
      }
      if (pilots.length >= MAX_PILOTS) {
        setImportMsg(`Déjà ${MAX_PILOTS} télépilotes sur cette mission, le maximum du Cerfa.`);
        return;
      }
      setSaved(false);
      setPilots((prev) => [...prev, pilot]);
      setImportMsg(`Télépilote ${[pilot.prenom, pilot.nom].filter(Boolean).join(" ") || "(sans nom)"} importé, pensez à Enregistrer.`);
    } catch {
      setImportMsg(`"${file.name}" : fichier illisible (JSON invalide).`);
    } finally {
      setImporting(false);
    }
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("missions").update({ pilots }).eq("id", missionId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div>
      <div className="space-y-4">
        {pilots.map((p, i) => (
          <div key={i} className="border-l-2 border-slate-300 bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
              <span>
                {p.prenom || p.nom ? `${p.prenom} ${p.nom}`.trim() : `Télépilote ${i + 1}`}
                {i === 0 && <span className="ml-1 text-xs text-slate-400">(vous, par défaut)</span>}
              </span>
              {pilots.length > 1 && (
                <button type="button" onClick={() => removePilot(i)} className="text-red-500 hover:underline">
                  Retirer
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MiniField label="Prénom" value={p.prenom} onChange={(v) => update(i, { prenom: v })} />
              <MiniField label="Nom" value={p.nom} onChange={(v) => update(i, { nom: v })} />
              <MiniField
                label="Date de naissance"
                type="date"
                value={p.date_naissance}
                onChange={(v) => update(i, { date_naissance: v })}
              />
              <MiniField
                label="Lieu de naissance (ville, pays)"
                value={p.lieu_naissance}
                onChange={(v) => update(i, { lieu_naissance: v })}
              />
              <MiniField label="Adresse" value={p.adresse} onChange={(v) => update(i, { adresse: v })} className="sm:col-span-2" />
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Statut</span>
                <select
                  value={p.statut}
                  onChange={(e) => update(i, { statut: e.target.value as Pilot["statut"] })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
                >
                  <option value="independant">Indépendant</option>
                  <option value="salarie">Salarié</option>
                </select>
              </label>
              <MiniField label="Téléphone" value={p.telephone_portable} onChange={(v) => update(i, { telephone_portable: v })} />
              <MiniField label="Email" type="email" value={p.courriel} onChange={(v) => update(i, { courriel: v })} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addPilot}
          disabled={pilots.length >= MAX_PILOTS}
          className="text-sm text-brand hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
        >
          + Ajouter un télépilote
        </button>
        {savedPilots && savedPilots.length > 0 && pilots.length < MAX_PILOTS && (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span>ou depuis vos pilotes enregistrés :</span>
            <select
              value=""
              onChange={(e) => e.target.value && addPilotFromRoster(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Choisir...</option>
              {savedPilots.map((p) => (
                <option key={p.id} value={p.id}>
                  {[p.prenom, p.nom].filter(Boolean).join(" ") || "(sans nom)"}
                </option>
              ))}
            </select>
          </label>
        )}
        {pilots.length >= MAX_PILOTS && (
          <span className="text-xs text-slate-400">Maximum {MAX_PILOTS} télépilotes (limite du Cerfa)</span>
        )}
      </div>

      {pilots.length < MAX_PILOTS && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            Un collègue peut exporter ses infos depuis sa page Profil ("Exporter mes infos") et vous envoyer le
            fichier : déposez-le ici pour l'ajouter sans tout ressaisir.
          </p>
          <FileDropzone
            label="Fichier pilote partagé (JSON)"
            hint="Exporté depuis la page Profil d'un collègue"
            accept="application/json,.json"
            disabled={importing}
            onFiles={(files) => handleImportFile(files[0])}
          />
          {importing && <p className="mt-2 text-sm text-slate-500">Lecture du fichier...</p>}
          <StatusMessage text={importMsg} />
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

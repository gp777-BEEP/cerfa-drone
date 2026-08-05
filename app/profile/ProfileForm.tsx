"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../components/FileDropzone";
import { parseAeronefsCsv } from "@/lib/alphatango/parseAeronefs";

type Drone = {
  constructeur: string;
  modele: string;
  type: string;
  numero_serie: string;
  masse_kg: string;
  classe_c5: "oui" | "non";
  captif: "oui" | "non";
  numero_enregistrement: string;
  numero_signalement: string;
};

const EMPTY_DRONE: Drone = {
  constructeur: "",
  modele: "",
  type: "Drone",
  numero_serie: "",
  masse_kg: "",
  classe_c5: "non",
  captif: "non",
  numero_enregistrement: "",
  numero_signalement: "",
};

export default function ProfileForm({ initialProfile }: { initialProfile: any }) {
  const supabase = createClient();
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile?.full_name || "");
  const [address, setAddress] = useState(initialProfile?.address || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [email, setEmail] = useState(initialProfile?.email || "");
  const [qualite, setQualite] = useState(initialProfile?.qualite || "Télépilote");
  const [drones, setDrones] = useState<Drone[]>(initialProfile?.drones?.length ? initialProfile.drones : [EMPTY_DRONE]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [importingReleve, setImportingReleve] = useState(false);
  const [importingAeronefs, setImportingAeronefs] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  function updateDrone(i: number, patch: Partial<Drone>) {
    setDrones((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function mergeDrones(imported: Drone[]) {
    setDrones((prev) => {
      const isUntouched = prev.length === 1 && !prev[0].constructeur && !prev[0].modele;
      if (isUntouched) return imported;
      const byReg = new Map(prev.map((d) => [d.numero_enregistrement, d]));
      for (const d of imported) byReg.set(d.numero_enregistrement || `${d.constructeur}-${d.modele}-${Math.random()}`, d);
      return Array.from(byReg.values());
    });
  }

  async function handleImportReleve(file: File) {
    setImportingReleve(true);
    setImportMsg("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-alphatango-releve", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");
      if (json.data.full_name) setFullName(json.data.full_name);
      setImportMsg(
        json.data.full_name
          ? `Nom importé : ${json.data.full_name}.`
          : "Le relevé a été lu mais aucun nom n'a été trouvé dedans."
      );
    } catch (e: any) {
      setImportMsg(`Erreur : ${e.message}`);
    } finally {
      setImportingReleve(false);
    }
  }

  async function handleImportAeronefs(file: File) {
    setImportingAeronefs(true);
    setImportMsg("");
    try {
      const text = await file.text();
      const { drones: imported, warnings } = parseAeronefsCsv(text);
      if (imported.length === 0) {
        setImportMsg(warnings[0] || "Aucun aéronef trouvé dans ce fichier.");
        return;
      }
      mergeDrones(imported);
      setImportMsg(`${imported.length} aéronef(s) importé(s) depuis AlphaTango.`);
    } catch {
      setImportMsg("Erreur : impossible de lire ce fichier CSV.");
    } finally {
      setImportingAeronefs(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        address,
        phone,
        email,
        qualite,
        drones: drones.filter((d) => d.constructeur || d.modele),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-medium text-ink">Importer depuis AlphaTango</h2>
        <p className="mb-3 text-xs text-slate-500">
          Depuis "Mon activité d'exploitant" sur AlphaTango, télécharge ton relevé de situation (pour ton
          nom) et ta liste des aéronefs (pour tes drones), puis dépose-les ici.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FileDropzone
            label="Relevé de situation d'exploitant"
            hint="PDF · pour ton nom"
            accept="application/pdf"
            disabled={importingReleve}
            onFiles={(files) => handleImportReleve(files[0])}
          />
          <FileDropzone
            label="Liste des aéronefs"
            hint="CSV · pour tes drones"
            accept=".csv,text/csv"
            disabled={importingAeronefs}
            onFiles={(files) => handleImportAeronefs(files[0])}
          />
        </div>
        {(importingReleve || importingAeronefs) && <p className="mt-2 text-sm text-slate-500">Lecture du fichier...</p>}
        {importMsg && <p className="mt-2 text-sm text-brand">{importMsg}</p>}
      </div>

      <div className="border border-slate-200 bg-white p-5">
        <h2 className="mb-4 font-medium text-ink">Toi</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom complet" value={fullName} onChange={setFullName} />
          <Field label="Qualité" value={qualite} onChange={setQualite} />
          <Field label="Adresse" value={address} onChange={setAddress} className="sm:col-span-2" />
          <Field label="Téléphone" value={phone} onChange={setPhone} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
        </div>
      </div>

      <div className="border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium text-ink">Mes drones</h2>
          <button
            type="button"
            onClick={() => setDrones((prev) => [...prev, { ...EMPTY_DRONE }])}
            className="text-sm text-brand hover:underline"
            disabled={drones.length >= 5}
          >
            + Ajouter un drone
          </button>
        </div>
        <div className="space-y-4">
          {drones.map((d, i) => (
            <div key={i} className="border-l-2 border-slate-300 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>Drone {i + 1}</span>
                {drones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDrones((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:underline"
                  >
                    Retirer
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Constructeur" value={d.constructeur} onChange={(v) => updateDrone(i, { constructeur: v })} />
                <Field label="Modèle" value={d.modele} onChange={(v) => updateDrone(i, { modele: v })} />
                <Field label="N° de série" value={d.numero_serie} onChange={(v) => updateDrone(i, { numero_serie: v })} />
                <Field label="Masse (kg)" value={d.masse_kg} onChange={(v) => updateDrone(i, { masse_kg: v })} />
                <Field
                  label="N° enregistrement UAS"
                  value={d.numero_enregistrement}
                  onChange={(v) => updateDrone(i, { numero_enregistrement: v })}
                />
                <Field
                  label="N° signalement électronique"
                  value={d.numero_signalement}
                  onChange={(v) => updateDrone(i, { numero_signalement: v })}
                />
                <Select
                  label="Classe C5"
                  value={d.classe_c5}
                  onChange={(v) => updateDrone(i, { classe_c5: v as "oui" | "non" })}
                />
                <Select
                  label="Aéronef captif"
                  value={d.captif}
                  onChange={(v) => updateDrone(i, { captif: v as "oui" | "non" })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md border border-brand px-6 py-2.5 font-medium text-brand hover:bg-brand-light disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
      {saved && <span className="ml-3 text-sm text-green-600">Enregistré ✓</span>}
    </form>
  );
}

function Field({
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

function Select({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none"
      >
        <option value="non">Non</option>
        <option value="oui">Oui</option>
      </select>
    </label>
  );
}

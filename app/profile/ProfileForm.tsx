"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../components/FileDropzone";
import { parseAeronefsCsv } from "@/lib/alphatango/parseAeronefs";
import { ErrorBanner } from "../components/Banner";
import StatusMessage from "../components/StatusMessage";

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
  const [tab, setTab] = useState<"infos" | "drones">("infos");

  const [fullName, setFullName] = useState(initialProfile?.full_name || "");
  const [address, setAddress] = useState(initialProfile?.address || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [email, setEmail] = useState(initialProfile?.email || "");
  const [qualite, setQualite] = useState(initialProfile?.qualite || "Télépilote");
  const [numeroExploitant, setNumeroExploitant] = useState(initialProfile?.numero_exploitant || "");
  const [exploitantType, setExploitantType] = useState<"physique" | "morale">(
    initialProfile?.exploitant_type === "morale" ? "morale" : "physique"
  );
  const [raisonSociale, setRaisonSociale] = useState(initialProfile?.raison_sociale || "");
  const [siegeSocial, setSiegeSocial] = useState(initialProfile?.siege_social || "");
  const [sirenSiret, setSirenSiret] = useState(initialProfile?.siren_siret || "");
  const [mandataireQualite, setMandataireQualite] = useState(initialProfile?.mandataire_qualite || "Gérant");
  const [drones, setDrones] = useState<Drone[]>(initialProfile?.drones?.length ? initialProfile.drones : [EMPTY_DRONE]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [importingReleve, setImportingReleve] = useState(false);
  const [importingAeronefs, setImportingAeronefs] = useState(false);
  const [importMsgInfos, setImportMsgInfos] = useState("");
  const [importMsgDrones, setImportMsgDrones] = useState("");

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
    setImportMsgInfos("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-alphatango-releve", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");
      if (json.data.full_name) setFullName(json.data.full_name);
      if (json.data.numero_exploitant) setNumeroExploitant(json.data.numero_exploitant);
      setImportMsgInfos(
        json.data.full_name
          ? `Nom importé : ${json.data.full_name}.`
          : "Le relevé a été lu mais aucun nom n'a été trouvé dedans."
      );
    } catch (e: any) {
      setImportMsgInfos(`Erreur : ${e.message}`);
    } finally {
      setImportingReleve(false);
    }
  }

  async function handleImportAeronefs(file: File) {
    setImportingAeronefs(true);
    setImportMsgDrones("");
    try {
      const text = await file.text();
      const { drones: imported, warnings } = parseAeronefsCsv(text);
      if (imported.length === 0) {
        setImportMsgDrones(warnings[0] || "Aucun aéronef trouvé dans ce fichier.");
        return;
      }
      mergeDrones(imported);
      setImportMsgDrones(`${imported.length} aéronef(s) importé(s) depuis AlphaTango. Pense à Enregistrer en bas de page.`);
    } catch {
      setImportMsgDrones("Erreur : impossible de lire ce fichier CSV.");
    } finally {
      setImportingAeronefs(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setSaveError("Session expirée, reconnecte-toi.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        address,
        phone,
        email,
        qualite,
        numero_exploitant: numeroExploitant,
        exploitant_type: exploitantType,
        raison_sociale: exploitantType === "morale" ? raisonSociale : null,
        siege_social: exploitantType === "morale" ? siegeSocial : null,
        siren_siret: exploitantType === "morale" ? sirenSiret : null,
        mandataire_qualite: exploitantType === "morale" ? mandataireQualite : null,
        drones: drones.filter((d) => d.constructeur || d.modele),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setSaveError("Erreur lors de l'enregistrement : " + error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const dronesCount = drones.filter((d) => d.constructeur || d.modele).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "infos"} onClick={() => setTab("infos")}>
          Informations
        </TabButton>
        <TabButton active={tab === "drones"} onClick={() => setTab("drones")}>
          Mes drones{dronesCount > 0 ? ` (${dronesCount})` : ""}
        </TabButton>
      </div>

      <div className={tab === "infos" ? "space-y-6" : "hidden"}>
        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Importer depuis AlphaTango</h2>
          <p className="mb-3 text-xs text-slate-500">
            Depuis "Mon activité d'exploitant" sur AlphaTango, télécharge ton relevé de situation
            d'exploitant et dépose-le ici pour préremplir ton nom.
          </p>
          <FileDropzone
            label="Relevé de situation d'exploitant"
            hint="PDF · pour ton nom"
            accept="application/pdf"
            disabled={importingReleve}
            onFiles={(files) => handleImportReleve(files[0])}
          />
          {importingReleve && <p className="mt-2 text-sm text-slate-500">Lecture du fichier...</p>}
          <StatusMessage text={importMsgInfos} />
        </div>

        <div className="bg-glass p-5">
          <h2 className="mb-4 font-medium text-ink">Toi</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom complet" value={fullName} onChange={setFullName} />
            <Field label="Qualité" value={qualite} onChange={setQualite} />
            <Field label="Adresse" value={address} onChange={setAddress} className="sm:col-span-2" />
            <Field label="Téléphone" value={phone} onChange={setPhone} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field
              label="Numéro d'exploitant"
              value={numeroExploitant}
              onChange={setNumeroExploitant}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Numéro d'enregistrement AlphaTango (format FRA...), pas de case dédiée sur le Cerfa mais
            la préfecture le demande parfois en complément : garde-le sous la main. C'est un identifiant
            professionnel, du même ordre que ton SIREN/SIRET (pas un mot de passe), stocké comme le
            reste de ton profil.
          </p>
        </div>

        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Exploitant</h2>
          <p className="mb-3 text-xs text-slate-500">
            Le Cerfa a deux colonnes différentes selon que l'exploitant (celui qui déclare le vol) est
            toi-même ou une société. Choisis la bonne pour que le bon bloc soit rempli.
          </p>
          <div className="mb-4 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exploitant_type"
                checked={exploitantType === "physique"}
                onChange={() => setExploitantType("physique")}
              />
              Personne physique (toi)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exploitant_type"
                checked={exploitantType === "morale"}
                onChange={() => setExploitantType("morale")}
              />
              Personne morale (société)
            </label>
          </div>

          {exploitantType === "morale" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Raison sociale / dénomination"
                value={raisonSociale}
                onChange={setRaisonSociale}
                className="sm:col-span-2"
              />
              <Field
                label="Adresse du siège social"
                value={siegeSocial}
                onChange={setSiegeSocial}
                className="sm:col-span-2"
              />
              <Field label="Identifiant SIREN/SIRET/RCS/RNE" value={sirenSiret} onChange={setSirenSiret} />
              <Field
                label="Qualité du mandataire (ex : Gérant, Président)"
                value={mandataireQualite}
                onChange={setMandataireQualite}
              />
              <p className="text-xs text-slate-500 sm:col-span-2">
                Le mandataire (représentant légal) déclaré sur le Cerfa sera toi, avec les infos "Toi"
                ci-dessus (nom, adresse, téléphone, email).
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={tab === "drones" ? "space-y-6" : "hidden"}>
        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Importer depuis AlphaTango</h2>
          <p className="mb-3 text-xs text-slate-500">
            Depuis "Mon activité d'exploitant" sur AlphaTango, télécharge ta liste des aéronefs (CSV) et
            dépose-la ici pour ajouter tes drones automatiquement.
          </p>
          <FileDropzone
            label="Liste des aéronefs"
            hint="CSV · pour tes drones"
            accept=".csv,text/csv"
            disabled={importingAeronefs}
            onFiles={(files) => handleImportAeronefs(files[0])}
          />
          {importingAeronefs && <p className="mt-2 text-sm text-slate-500">Lecture du fichier...</p>}
          <StatusMessage text={importMsgDrones} />
        </div>

        <div className="bg-glass p-5">
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
                  <span>{d.constructeur || d.modele ? `${d.constructeur} ${d.modele}`.trim() : `Drone ${i + 1}`}</span>
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
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-brand px-6 py-2.5 font-medium text-brand hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        {saved && <span className="text-sm text-brand">Enregistré ✓</span>}
      </div>
      {saveError && <ErrorBanner className="mt-3">{saveError}</ErrorBanner>}
    </form>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-ink"
      }`}
    >
      {children}
    </button>
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

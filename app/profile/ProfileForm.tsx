"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../components/FileDropzone";
import { parseAeronefsCsv } from "@/lib/alphatango/parseAeronefs";
import { ErrorBanner } from "../components/Banner";
import StatusMessage from "../components/StatusMessage";
import FieldHint from "../components/FieldHint";
import DroneIcon from "../components/DroneIcon";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

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
  const spotlightSave = useSpotlightHoverBgOnly();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Personnalisation du dossier généré (filigrane discret sur les fiches de
  // zone et la page de garde -- jamais sur le Cerfa officiel lui-même,
  // option "C" validée par l'utilisateur parmi 4 propositions).
  const [logoPath, setLogoPath] = useState<string | null>(initialProfile?.logo_path || null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initialProfile?.logo_signed_url || null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState("");
  const BRAND_PRESETS = ["#41fabb", "#378ADD", "#D85A30", "#7F77DD", "#BA7517"];
  const [brandColor, setBrandColor] = useState<string>(initialProfile?.brand_color || BRAND_PRESETS[0]);
  const DOSSIER_STYLES: { id: "bandeau" | "garde" | "filigrane" | "combine"; label: string; description: string }[] = [
    { id: "bandeau", label: "Bandeau discret", description: "Petit logo en coin + filet de couleur sous le titre de chaque page." },
    { id: "garde", label: "Page de garde brandée", description: "Bandeau coloré et logo en grand sur la page de garde, fiches neutres." },
    { id: "filigrane", label: "Filigrane discret", description: "Logo et couleur relégués en petit, dans un coin. Le plus sobre." },
    { id: "combine", label: "Bandeau + page de garde", description: "Petite page de garde marquée, puis le même bandeau sur chaque fiche." },
  ];
  const [dossierStyle, setDossierStyle] = useState<"bandeau" | "garde" | "filigrane" | "combine">(
    initialProfile?.dossier_style || "filigrane"
  );

  function handleLogoFile(file: File) {
    setLogoError("");
    if (!file.type.startsWith("image/")) {
      setLogoError("Le logo doit être une image (PNG ou JPG).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image trop lourde (2 Mo maximum).");
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  }

  // Emplacement du logo dans l'aperçu : si aucun logo n'est encore importé,
  // affiche un cadre en pointillés à sa place plutôt que de le faire
  // disparaître complètement (sinon on ne voit pas où il apparaîtrait une
  // fois ajouté, cf. retour utilisateur "pas clair où est le logo").
  function logoSlot(size: number) {
    if (logoPreviewUrl) {
      return <img src={logoPreviewUrl} alt="" style={{ height: size, width: size }} className="shrink-0 object-contain" />;
    }
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-sm border border-dashed border-slate-400"
        style={{ height: size, width: size }}
        title="Emplacement du logo"
      >
        <DroneIcon size={Math.round(size * 0.62)} className="text-slate-500" />
      </div>
    );
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoPath(null);
  }

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
      setImportMsgDrones(`${imported.length} aéronef(s) importé(s) depuis AlphaTango. Pensez à Enregistrer en bas de page.`);
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
      setSaveError("Session expirée, reconnectez-vous.");
      return;
    }

    // Upload du logo si un nouveau fichier a été choisi (chemin scopé au
    // dossier de l'utilisateur, même schéma que zone-images/dossiers pour
    // que les policies RLS du bucket "logos" s'appliquent).
    let finalLogoPath = logoPath;
    if (logoFile) {
      const path = `${user.id}/logo_${Date.now()}_${logoFile.name}`;
      const { error: uploadErr } = await supabase.storage.from("logos").upload(path, logoFile, { upsert: true });
      if (uploadErr) {
        setSaving(false);
        setSaveError("Erreur lors de l'envoi du logo : " + uploadErr.message);
        return;
      }
      finalLogoPath = path;
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
        logo_path: finalLogoPath,
        brand_color: brandColor,
        dossier_style: dossierStyle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setSaveError("Erreur lors de l'enregistrement : " + error.message);
      return;
    }
    setLogoPath(finalLogoPath);
    setLogoFile(null);
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
            Depuis "Mon activité d'exploitant" sur AlphaTango, téléchargez votre relevé de situation
            d'exploitant et déposez-le ici pour préremplir votre nom.
          </p>
          <FileDropzone
            label="Relevé de situation d'exploitant"
            hint="PDF · pour votre nom"
            accept="application/pdf"
            disabled={importingReleve}
            onFiles={(files) => handleImportReleve(files[0])}
          />
          {importingReleve && <p className="mt-2 text-sm text-slate-500">Lecture du fichier...</p>}
          <StatusMessage text={importMsgInfos} />
        </div>

        <div className="bg-glass p-5">
          <h2 className="mb-4 font-medium text-ink">Vous</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nom complet" value={fullName} onChange={setFullName} />
            <Field
              label="Qualité"
              value={qualite}
              onChange={setQualite}
              hint="Votre fonction ou profession : « Télépilote », mais aussi « Gérant », « Salarié », « Étudiant »... selon le contexte de vos vols."
            />
            <Field label="Adresse" value={address} onChange={setAddress} className="sm:col-span-2" />
            <Field label="Téléphone" value={phone} onChange={setPhone} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field
              label="Numéro d'exploitant"
              value={numeroExploitant}
              onChange={setNumeroExploitant}
              hint="Numéro d'enregistrement AlphaTango (format FRA...). Pas de case dédiée sur le Cerfa, mais la préfecture le demande parfois en complément."
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Numéro d'enregistrement AlphaTango (format FRA...), pas de case dédiée sur le Cerfa mais
            la préfecture le demande parfois en complément : garde-le sous la main. C'est un identifiant
            professionnel, du même ordre que votre SIREN/SIRET (pas un mot de passe), stocké comme le
            reste de votre profil.
          </p>
        </div>

        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Exploitant</h2>
          <p className="mb-3 text-xs text-slate-500">
            Le Cerfa a deux colonnes différentes selon que l'exploitant (celui qui déclare le vol) est
            vous-même ou une société. Choisissez la bonne pour que le bon bloc soit rempli.
          </p>
          <div className="mb-4 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exploitant_type"
                checked={exploitantType === "physique"}
                onChange={() => setExploitantType("physique")}
              />
              Personne physique (vous)
              <FieldHint text="Choisissez cette option si vous volez en votre nom propre, sans société. C'est le cas le plus courant pour un usage loisir ou en freelance non constitué en société." />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exploitant_type"
                checked={exploitantType === "morale"}
                onChange={() => setExploitantType("morale")}
              />
              Personne morale (société)
              <FieldHint text="Choisissez cette option si c'est une société (SARL, SAS, auto-entreprise inscrite au RCS...) qui est déclarée comme exploitant, avec vous comme représentant légal ou mandataire." />
            </label>
          </div>

          {exploitantType === "morale" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Raison sociale / dénomination"
                value={raisonSociale}
                onChange={setRaisonSociale}
                className="sm:col-span-2"
                hint="Le nom légal de la société, tel qu'inscrit au RCS (registre du commerce et des sociétés) ou équivalent."
              />
              <Field
                label="Adresse du siège social"
                value={siegeSocial}
                onChange={setSiegeSocial}
                className="sm:col-span-2"
                hint="L'adresse officielle du siège social de la société, pas forcément celle où vous volez."
              />
              <Field
                label="Identifiant SIREN/SIRET/RCS/RNE"
                value={sirenSiret}
                onChange={setSirenSiret}
                hint="SIREN (9 chiffres) ou SIRET (14 chiffres) de la société, ou identifiant RCS/RNE pour certaines structures."
              />
              <Field
                label="Qualité du mandataire (ex : Gérant, Président)"
                value={mandataireQualite}
                onChange={setMandataireQualite}
                hint="Votre fonction dans la société : Gérant, Président, Directeur général... C'est ce qui apparaît sur le Cerfa à côté de votre nom, dans le bloc « Mandataire social ou principal dirigeant »."
              />
              <p className="text-xs text-slate-500 sm:col-span-2">
                Le mandataire (représentant légal) déclaré sur le Cerfa sera vous, avec les infos "Vous"
                ci-dessus (nom, adresse, téléphone, email).
              </p>
            </div>
          )}
        </div>

        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Personnalisation du dossier</h2>
          <p className="mb-4 text-xs text-slate-500">
            Un logo et une couleur d'accent, affichés sur la page de garde et les fiches de zone que l'app
            génère, selon le style choisi ci-dessous. Le Cerfa officiel, lui, reste toujours le formulaire
            standard, inchangé.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span className="mb-2 block text-sm font-medium text-ink">Logo</span>
              {logoPreviewUrl ? (
                <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <img src={logoPreviewUrl} alt="Logo" className="h-12 w-12 rounded-md object-contain bg-white/5" />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Retirer
                  </button>
                </div>
              ) : (
                <FileDropzone
                  label="Glisser un logo ici, ou cliquer pour parcourir"
                  hint="PNG ou JPG · 2 Mo maximum"
                  accept="image/*"
                  onFiles={(files) => handleLogoFile(files[0])}
                />
              )}
              {logoError && <p className="mt-2 text-sm text-red-500">{logoError}</p>}
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-ink">Couleur d'accent</span>
              <div className="flex flex-wrap items-center gap-2">
                {BRAND_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBrandColor(c)}
                    aria-label={`Couleur ${c}`}
                    className="h-7 w-7 rounded-full"
                    style={{
                      backgroundColor: c,
                      outline: brandColor.toLowerCase() === c.toLowerCase() ? "2px solid #f2f4f7" : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
                <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-slate-400 text-xs text-slate-400">
                  +
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <span className="mb-2 block text-sm font-medium text-ink">Style d'intégration</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {DOSSIER_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setDossierStyle(s.id)}
                  className={`rounded-lg border p-2.5 text-center text-xs font-medium transition-colors ${
                    dossierStyle === s.id
                      ? "border-brand bg-brand-light text-brand"
                      : "border-white/10 bg-white/[0.02] text-ink hover:border-white/20"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <span className="mb-2 block text-sm font-medium text-ink">Aperçu</span>
            <p className="mb-3 text-xs text-slate-500">
              Ce à quoi ressemblera le dossier généré, avec ce logo, cette couleur et ce style.
            </p>
            {dossierStyle === "filigrane" && (
              <div className="relative h-40 w-28 rounded-md bg-white">
                <div className="absolute left-3 top-3 h-1 w-12 rounded-full bg-slate-800/70" />
                <div className="absolute left-3 top-6 right-3 bottom-9 rounded-sm bg-slate-100" />
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
                  {logoSlot(12)}
                  <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: brandColor, opacity: 0.55 }} />
                </div>
              </div>
            )}
            {dossierStyle === "bandeau" && (
              <div className="relative h-40 w-28 rounded-md bg-white p-2.5">
                {logoSlot(16)}
                <div className="mt-2 h-[3px] w-full rounded-full" style={{ backgroundColor: brandColor }} />
                <div className="mt-2 h-24 rounded-sm bg-slate-100" />
              </div>
            )}
            {dossierStyle === "garde" && (
              <div className="relative h-40 w-28 overflow-hidden rounded-md bg-white">
                <div className="flex h-9 items-center justify-center" style={{ backgroundColor: brandColor }}>
                  {logoSlot(20)}
                </div>
                <div className="p-2.5">
                  <div className="mx-auto h-1 w-14 rounded-full bg-slate-800/60" />
                  <div className="mt-2 h-20 rounded-sm bg-slate-100" />
                </div>
              </div>
            )}
            {dossierStyle === "combine" && (
              <div className="relative h-40 w-28 overflow-hidden rounded-md bg-white">
                <div className="flex h-6 items-center justify-center" style={{ backgroundColor: brandColor }}>
                  {logoSlot(14)}
                </div>
                <div className="p-2.5">
                  <div className="h-1 w-12 rounded-full bg-slate-800/60" />
                  <div className="mt-2 h-24 rounded-sm bg-slate-100" />
                </div>
              </div>
            )}
            {!logoPreviewUrl && (
              <p className="mt-2 max-w-[224px] text-[11px] text-slate-500">
                Le cadre en pointillés indique l'emplacement du logo, une fois importé.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={tab === "drones" ? "space-y-6" : "hidden"}>
        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Importer depuis AlphaTango</h2>
          <p className="mb-3 text-xs text-slate-500">
            Depuis "Mon activité d'exploitant" sur AlphaTango, téléchargez votre liste des aéronefs (CSV) et
            déposez-la ici pour ajouter vos drones automatiquement.
          </p>
          <FileDropzone
            label="Liste des aéronefs"
            hint="CSV · pour vos drones"
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
                  <Field
                    label="Masse (kg)"
                    value={d.masse_kg}
                    onChange={(v) => updateDrone(i, { masse_kg: v })}
                    hint="Masse maximale au décollage (MTOM), batterie comprise. Indiquée sur l'étiquette de classe ou la notice du drone."
                  />
                  <Field
                    label="N° enregistrement UAS"
                    value={d.numero_enregistrement}
                    onChange={(v) => updateDrone(i, { numero_enregistrement: v })}
                    hint="Numéro d'enregistrement exploitant UAS (format FRA... ou UAS-FR...), obtenu sur AlphaTango. C'est le numéro à coller sur le drone."
                  />
                  <Field
                    label="N° signalement électronique"
                    value={d.numero_signalement}
                    onChange={(v) => updateDrone(i, { numero_signalement: v })}
                    hint="Identifiant de l'émetteur de signalement électronique embarqué sur le drone, si votre modèle en est équipé (obligatoire pour la plupart des drones de plus de 800g)."
                  />
                  <Select
                    label="Classe C5"
                    value={d.classe_c5}
                    onChange={(v) => updateDrone(i, { classe_c5: v as "oui" | "non" })}
                    hint="Votre drone porte-t-il le marquage de classe C5 (ou C6) ? Cette classe autorise certains vols en agglomération avec des règles allégées. Vérifiez l'étiquette ou la notice du drone."
                  />
                  <Select
                    label="Aéronef captif"
                    value={d.captif}
                    onChange={(v) => updateDrone(i, { captif: v as "oui" | "non" })}
                    hint="Un drone « captif » est relié au sol par un câble ou une longe qui limite sa distance de vol. La plupart des drones grand public ne le sont pas : laissez « Non » si vous ne savez pas."
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
          className="rounded-md border border-brand px-6 py-2.5 font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
          style={spotlightSave.style}
          onMouseMove={spotlightSave.onMouseMove}
          onMouseLeave={spotlightSave.onMouseLeave}
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-slate-600">
        {label}
        {hint && <FieldHint text={hint} />}
      </span>
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">
        {label}
        {hint && <FieldHint text={hint} />}
      </span>
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

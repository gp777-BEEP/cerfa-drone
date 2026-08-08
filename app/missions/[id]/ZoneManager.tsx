"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../../components/FileDropzone";
import StatusMessage from "../../components/StatusMessage";
import FieldHint from "../../components/FieldHint";
import AutoTextarea from "../../components/AutoTextarea";
import Coachmark from "../../components/Coachmark";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";

function frToIso(dmy?: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
}

type Zone = {
  id: string;
  title: string | null;
  adresse: string | null;
  code_postal: string | null;
  localite: string | null;
  en_agglomeration: boolean | null;
  rassemblement: boolean | null;
  distance_max_m: number | null;
  hauteur_max_m: number | null;
  notes: string | null;
  description_site: string | null;
  image_paths: string[] | null;
  map_meta: Record<string, any> | null;
};

const EMPTY = {
  title: "",
  adresse: "",
  code_postal: "",
  localite: "",
  en_agglomeration: false,
  rassemblement: false,
  distance_max_m: "",
  hauteur_max_m: "",
  notes: "",
  description_site: "",
};

// Champ numérique avec l'unité affichée en permanence dans la case (opacité
// réduite), pas juste dans le placeholder qui disparaît une fois rempli :
// sinon un "71" tout seul ne veut plus rien dire une fois la valeur saisie.
function NumberFieldWithUnit({
  placeholder,
  unit,
  value,
  onChange,
  hint,
}: {
  placeholder: string;
  unit: string;
  value: string | number;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      {hint && (
        <span className="mb-1 block text-xs text-slate-500">
          {placeholder}
          <FieldHint text={hint} />
        </span>
      )}
      <div className="relative">
        <input
          placeholder={placeholder}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 pr-9 text-sm"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          {unit}
        </span>
      </div>
    </div>
  );
}

// Remplace l'ancienne pastille jaune/verte (peu claire, signalée par un beta
// testeur : impossible de deviner ce qu'elle voulait dire sans survol) par un
// badge texte explicite listant ce qui manque, ou confirmant que la zone est
// complète.
function ZoneCompletenessBadge({ zone }: { zone: Zone }) {
  const missing: string[] = [];
  if (!zone.description_site) missing.push("description");
  if (zone.hauteur_max_m == null || zone.distance_max_m == null) missing.push("hauteur/éloignement");
  if (!zone.image_paths || zone.image_paths.length === 0) missing.push("image");

  if (missing.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-light px-2 py-0.5 text-[11px] font-normal text-brand">
        Zone complète
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-normal text-warning"
      title={`Manque : ${missing.join(", ")}`}
    >
      {missing.length === 1 ? `${missing[0]} manquant` : `${missing.length} infos manquantes`}
    </span>
  );
}

export default function ZoneManager({ missionId, initialZones }: { missionId: string; initialZones: Zone[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [importingKml, setImportingKml] = useState(false);
  const [kmlMsg, setKmlMsg] = useState("");
  const [importingCerfa, setImportingCerfa] = useState(false);
  const [cerfaMsg, setCerfaMsg] = useState("");
  const [merging, setMerging] = useState(false);
  const spotlightMerge = useSpotlightHoverBgOnly();
  const spotlightAddZoneSubmit = useSpotlightHoverBgOnly();
  const spotlightAddZoneToggle = useSpotlightHoverBgOnly();
  // Fusion en mode sélection : on coche les zones à combiner, une barre
  // récapitule le choix et confirme (validé avec l'utilisateur en option D
  // d'une proposition à 4 designs).
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  // La zone d'ajout (import + saisie manuelle) prend beaucoup de place :
  // repliée dès qu'il y a déjà au moins une zone, pour ne pas laisser deux
  // grosses zones de dépôt bien visibles alors qu'elles ne servent qu'à
  // ajouter une zone SUPPLÉMENTAIRE.
  const [showAddZone, setShowAddZone] = useState(initialZones.length === 0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [savingEdit, setSavingEdit] = useState(false);
  // Le formulaire d'AJOUT permettait déjà d'attacher des captures d'écran,
  // mais pas celui d'ÉDITION : impossible d'ajouter une capture après coup
  // sur une zone déjà créée (ex: zone créée sans image, ou utilisateur qui
  // n'a qu'un screenshot à ajouter plus tard). Réplique le même mécanisme ici.
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  // Aperçu (option "A" validée par l'utilisateur parmi 2 propositions) :
  // vraies vignettes des images déjà attachées plutôt qu'un simple compteur
  // texte, avec une croix au survol pour retirer individuellement et un clic
  // pour agrandir en plein écran.
  const [editImageUrls, setEditImageUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    async function loadThumbs() {
      const missing = editExistingImages.filter((p) => !editImageUrls[p]);
      if (missing.length === 0) return;
      const entries: [string, string][] = [];
      for (const path of missing) {
        const { data } = await supabase.storage.from("zone-images").createSignedUrl(path, 3600);
        if (data?.signedUrl) entries.push([path, data.signedUrl]);
      }
      if (!cancelled && entries.length > 0) {
        setEditImageUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    }
    loadThumbs();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editExistingImages]);

  // Arrivée via un lien "#zone-xxx" (ex: depuis le récap "il manque des
  // informations") -> ouvre directement l'édition de cette zone.
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#zone-(.+)$/);
    if (match) {
      const zone = zones.find((z) => z.id === match[1]);
      if (zone) startEdit(zone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(z: Zone) {
    setEditingId(z.id);
    setEditForm({
      title: z.title || "",
      adresse: z.adresse || "",
      code_postal: z.code_postal || "",
      localite: z.localite || "",
      en_agglomeration: !!z.en_agglomeration,
      rassemblement: !!z.rassemblement,
      distance_max_m: z.distance_max_m?.toString() || "",
      hauteur_max_m: z.hauteur_max_m?.toString() || "",
      notes: z.notes || "",
      description_site: z.description_site || "",
    });
    setEditExistingImages(z.image_paths || []);
    setEditNewFiles([]);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);

    const newPaths: string[] = [];
    if (editNewFiles.length > 0) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        for (const file of editNewFiles) {
          const path = `${user.id}/${missionId}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage.from("zone-images").upload(path, file);
          if (!uploadErr) newPaths.push(path);
        }
      }
    }

    const patch = {
      title: editForm.title || null,
      adresse: editForm.adresse || null,
      code_postal: editForm.code_postal || null,
      localite: editForm.localite || null,
      en_agglomeration: editForm.en_agglomeration,
      rassemblement: editForm.rassemblement,
      distance_max_m: editForm.distance_max_m ? Number(editForm.distance_max_m) : null,
      hauteur_max_m: editForm.hauteur_max_m ? Number(editForm.hauteur_max_m) : null,
      notes: editForm.notes || null,
      description_site: editForm.description_site || null,
      image_paths: [...editExistingImages, ...newPaths],
    };
    const { data, error } = await supabase.from("zones").update(patch).eq("id", id).select().single();
    setSavingEdit(false);
    if (!error && data) {
      setZones((prev) => prev.map((z) => (z.id === id ? data : z)));
      setEditingId(null);
      router.refresh();
    }
  }

  async function insertZones(
    toInsert: Array<{
      title: string | null;
      adresse: string | null;
      code_postal: string | null;
      localite: string | null;
      en_agglomeration?: boolean;
      rassemblement?: boolean;
      distance_max_m: number | null;
      hauteur_max_m: number | null;
      notes: string | null;
      image_paths: string[];
      map_meta?: Record<string, any> | null;
    }>
  ) {
    let imported = 0;
    let lastError = "";
    for (const z of toInsert) {
      const { data, error } = await supabase
        .from("zones")
        .insert({ mission_id: missionId, order_index: zones.length + imported, ...z })
        .select()
        .single();
      if (!error && data) {
        setZones((prev) => [...prev, data]);
        imported++;
      } else if (error) {
        // Erreur enregistrée mais pas d'arrêt : on tente quand même les
        // zones suivantes, et on remonte le vrai message au lieu de laisser
        // croire silencieusement qu'aucune zone n'a été trouvée dans le
        // fichier importé.
        lastError = error.message;
      }
    }
    if (imported > 0) router.refresh();
    return { imported, lastError };
  }

  // Logique de préremplissage à partir d'un Cerfa importé sur une mission
  // déjà créée.
  async function applyImportedFile(json: any, sourceLabel: string, setMsg: (m: string) => void) {
    // Dates et régime de vol : importés indépendamment des zones (même si
    // aucune zone n'est détectée, ces infos-là restent récupérables).
    const missionUpdate: Record<string, any> = {};
    const d = json.data.dates;
    if (d?.debut_date) missionUpdate.date_debut = frToIso(d.debut_date);
    if (d?.debut_heure) missionUpdate.heure_debut = `${d.debut_heure}:${d.debut_min || "00"}`;
    if (d?.fin_date) missionUpdate.date_fin = frToIso(d.fin_date);
    if (d?.fin_heure) missionUpdate.heure_fin = `${d.fin_heure}:${d.fin_min || "00"}`;
    const r = json.data.regime;
    if (r) {
      missionUpdate.regime = {
        categorie_ouverte: !!r.categorie_ouverte,
        sous_categorie_a1: !!r.sous_categorie_a1,
        sous_categorie_a2: !!r.sous_categorie_a2,
        sous_categorie_a3: !!r.sous_categorie_a3,
        sts01: !!r.sts01,
        s3: !!r.s3,
      };
    }
    // Drones : un fichier importé sur une mission déjà créée remplace la
    // sélection de drones de CETTE mission par ceux qu'il décrit (visible
    // et modifiable ensuite dans "Drones utilisés", cf. MissionDrones.tsx)
    // plutôt que de les ajouter au profil global.
    const importedDrones = [1, 2, 3, 4, 5]
      .map((i) => json.data[`aeronef${i}`])
      .filter((dr: any) => dr && dr.constructeur)
      .map((dr: any) => ({
        constructeur: dr.constructeur || "",
        modele: dr.modele || "",
        type: dr.type || "Drone",
        numero_serie: dr.numero_serie || "",
        masse_kg: dr.masse_kg || "",
        classe_c5: dr.classe_c5 || "non",
        captif: dr.captif || "non",
        numero_enregistrement: dr.numero_enregistrement || "",
        numero_signalement: dr.numero_signalement || "",
      }));
    if (importedDrones.length > 0) missionUpdate.drones = importedDrones;

    if (Object.keys(missionUpdate).length > 0) {
      await supabase.from("missions").update(missionUpdate).eq("id", missionId);
      router.refresh();
    }

    // La source ne décrit que 2 sites max (limite du Cerfa page 1, pas de
    // notre app) ; ils s'ajoutent à la liste existante, quelle que soit sa
    // taille (les zones au-delà de 2 partent sur l'annexe à la génération
    // du dossier).
    const sites = [json.data.site1, json.data.site2].filter(Boolean);
    if (sites.length === 0) {
      // On inclut le détail technique (champs détectés/remplis) dans le
      // message : ça évite un aller-retour pour comprendre pourquoi rien
      // n'est ressorti (PDF sans formulaire, ou champs qui ne correspondent
      // pas à la structure attendue).
      const dbg = json.debug;
      const detail = dbg
        ? ` (${dbg.totalFields} champ(s) détecté(s), ${dbg.textFieldsWithValue} rempli(s), ${dbg.matched} reconnu(s), secours utilisé ${dbg.usedRawFallback} fois, ${dbg.bytesReceived} octets reçus)`
        : "";
      const w = json.warnings?.length ? ` ${json.warnings.join(" ")}` : "";
      const droneNote = importedDrones.length > 0 ? ` ${importedDrones.length} drone(s) importé(s) (voir "Drones utilisés" plus bas).` : "";
      const gotMissionInfo = Object.keys(missionUpdate).length > 0 ? ` Les dates et le régime de vol ont été importés.${droneNote}` : droneNote;
      setMsg(`Aucune zone trouvée dans ce ${sourceLabel}.${detail}${w}${gotMissionInfo}`);
      return;
    }

    const { imported, lastError } = await insertZones(
      sites.map((s: any) => ({
        title: s.adresse || null,
        adresse: s.adresse || null,
        code_postal: s.code_postal || null,
        localite: s.localite || null,
        en_agglomeration: !!s.en_agglomeration,
        rassemblement: !!s.rassemblement,
        distance_max_m: s.eloignement_max_m ? Number(s.eloignement_max_m) : null,
        hauteur_max_m: s.hauteur_max_m ? Number(s.hauteur_max_m) : null,
        notes: s.autres_infos || null,
        image_paths: [],
      }))
    );
    const droneNote2 = importedDrones.length > 0 ? ` ${importedDrones.length} drone(s) importé(s) (voir "Drones utilisés" plus bas).` : "";
    const gotMissionInfo2 = Object.keys(missionUpdate).length > 0 ? ` Dates et régime de vol importés aussi.${droneNote2}` : droneNote2;
    setMsg(
      imported > 0
        ? `${imported} zone(s) importée(s) depuis le ${sourceLabel}.${gotMissionInfo2} Pensez à ajouter une carte (via KML ou une capture) si besoin.`
        : `Aucune zone importée.${lastError ? ` Erreur : ${lastError}` : ""}${gotMissionInfo2}`
    );
    // Referme automatiquement le panneau d'import une fois une zone ajoutée
    // (retour bêta-testeur : la zone déjà créée et le panneau d'import
    // restaient affichés ensemble, place inutilement encombrée).
    if (imported > 0) setShowAddZone(false);
  }

  async function handleImportPdf(file: File) {
    setImportingCerfa(true);
    setCerfaMsg("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");
      await applyImportedFile(json, "Cerfa", setCerfaMsg);
    } catch (e: any) {
      setCerfaMsg(`Erreur : ${e.message}`);
    } finally {
      setImportingCerfa(false);
    }
  }

  function handleImportFiles(files: File[]) {
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".kml")) {
        handleImportKml(file);
      } else {
        handleImportPdf(file);
      }
    }
  }

  async function handleImportKml(file: File) {
    setImportingKml(true);
    setKmlMsg("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("missionId", missionId);
      const res = await fetch("/api/parse-kml", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");

      const toImport = json.zones || [];
      if (toImport.length === 0) {
        setKmlMsg("Aucune zone trouvée dans ce fichier KML.");
        return;
      }

      const { imported, lastError } = await insertZones(
        toImport.map((z: any) => ({
          title: z.title || null,
          adresse: z.adresse || null,
          code_postal: z.code_postal || null,
          localite: z.localite || null,
          distance_max_m: z.distance_max_m,
          hauteur_max_m: z.hauteur_max_m,
          notes: z.notes || null,
          image_paths: z.image_paths || [],
          map_meta: z.map_meta || null,
        }))
      );

      const warnings = json.warnings?.length ? ` ${json.warnings.join(" ")}` : "";
      setKmlMsg(
        imported > 0
          ? `${imported} zone(s) importée(s) depuis le KML. Vérifiez l'adresse, la hauteur et l'éloignement avant de générer le dossier.${warnings}`
          : `Aucune zone importée.${lastError ? ` Erreur : ${lastError}` : ""}${warnings}`
      );
      // Referme automatiquement le panneau d'import une fois une zone
      // ajoutée (cf. applyImportedFile ci-dessus, même logique).
      if (imported > 0) setShowAddZone(false);
    } catch (e: any) {
      setKmlMsg(`Erreur : ${e.message}`);
    } finally {
      setImportingKml(false);
    }
  }

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const imagePaths: string[] = [];
    for (const file of files) {
      const path = `${user.id}/${missionId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("zone-images").upload(path, file);
      if (!error) imagePaths.push(path);
    }

    const { data, error } = await supabase
      .from("zones")
      .insert({
        mission_id: missionId,
        order_index: zones.length,
        title: form.title || null,
        adresse: form.adresse || null,
        code_postal: form.code_postal || null,
        localite: form.localite || null,
        en_agglomeration: form.en_agglomeration,
        rassemblement: form.rassemblement,
        distance_max_m: form.distance_max_m ? Number(form.distance_max_m) : null,
        hauteur_max_m: form.hauteur_max_m ? Number(form.hauteur_max_m) : null,
        notes: form.notes || null,
        description_site: form.description_site || null,
        image_paths: imagePaths,
      })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setZones((prev) => [...prev, data]);
      setForm(EMPTY);
      setFiles([]);
      router.refresh();
    }
  }

  async function removeZone(id: string) {
    await supabase.from("zones").delete().eq("id", id);
    setZones((prev) => {
      const next = prev.filter((z) => z.id !== id);
      if (next.length === 0) setShowAddZone(true);
      return next;
    });
    if (editingId === id) setEditingId(null);
    setSelectedForMerge((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    router.refresh();
  }

  // Cas fréquent : le KML et le Cerfa décrivent en fait le même lieu de vol
  // (importés séparément, donc créés comme 2 zones distinctes). Plutôt que
  // de forcer à choisir laquelle garder et ressaisir ce qui manque, on
  // combine les deux en une seule : on garde la 1ère zone, on complète ses
  // champs vides avec ceux de la 2nde, on prend le maximum des hauteurs et
  // éloignements (jamais sous-estimer dans une déclaration), et l'image/la
  // carte de l'une ou l'autre si l'une des deux n'en a pas.
  // Fusionne un nombre quelconque de zones (au moins deux) dans une seule :
  // généralisé depuis une fusion strictement paire à paire (retour
  // bêta-testeur : parfois plus de 2 zones décrivent le même endroit, par
  // exemple une importée par KML, une par Cerfa, une par capture d'écran).
  async function mergeZones(idKeep: string, dropIds: string[]) {
    const zKeep = zones.find((z) => z.id === idKeep);
    const dropZones = dropIds.map((id) => zones.find((z) => z.id === id)).filter((z): z is Zone => !!z);
    if (!zKeep || dropZones.length === 0) return;

    const all = [zKeep, ...dropZones];
    const maxOrNull = (vals: (number | null | undefined)[]) => {
      const nums = vals.filter((v): v is number => v != null);
      return nums.length ? Math.max(...nums) : null;
    };
    const firstTruthy = <T,>(vals: (T | null | undefined)[]): T | null =>
      vals.find((v) => v !== null && v !== undefined && v !== "") ?? null;

    setMerging(true);
    const merged = {
      title: firstTruthy(all.map((z) => z.title)),
      adresse: firstTruthy(all.map((z) => z.adresse)),
      code_postal: firstTruthy(all.map((z) => z.code_postal)),
      localite: firstTruthy(all.map((z) => z.localite)),
      en_agglomeration: all.some((z) => !!z.en_agglomeration),
      rassemblement: all.some((z) => !!z.rassemblement),
      distance_max_m: maxOrNull(all.map((z) => z.distance_max_m)),
      hauteur_max_m: maxOrNull(all.map((z) => z.hauteur_max_m)),
      notes: all.map((z) => z.notes).filter(Boolean).join(" / ") || null,
      description_site: all.map((z) => z.description_site).filter(Boolean).join(" / ") || null,
      image_paths: firstTruthy(all.map((z) => (z.image_paths?.length ? z.image_paths : null))) || [],
      map_meta: firstTruthy(all.map((z) => z.map_meta)),
    };

    const { data, error } = await supabase.from("zones").update(merged).eq("id", idKeep).select().single();
    if (!error && data) {
      for (const idDrop of dropIds) {
        await supabase.from("zones").delete().eq("id", idDrop);
      }
      setZones((prev) => prev.filter((z) => !dropIds.includes(z.id)).map((z) => (z.id === idKeep ? data : z)));
      setEditingId(null);
      setSelectedForMerge(new Set());
      router.refresh();
    }
    setMerging(false);
  }

  function toggleMergeSelect(id: string) {
    setSelectedForMerge((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmMerge() {
    const selected = Array.from(selectedForMerge);
    if (selected.length < 2) return;
    // On garde la zone apparue en premier dans la liste (généralement la
    // plus ancienne / la plus complète) et on fusionne toutes les autres
    // sélectionnées dedans.
    const sorted = [...selected].sort(
      (a, b) => zones.findIndex((z) => z.id === a) - zones.findIndex((z) => z.id === b)
    );
    const [idKeep, ...dropIds] = sorted;
    mergeZones(idKeep, dropIds);
  }

  return (
    <div id="zones-de-vol" className="bg-glass p-5">
      <h2 className="mb-1 font-medium text-ink">Zones de vol</h2>
      <p className="mb-4 text-xs text-slate-400">
        Nombre de zones illimité : les 2 premières vont sur la page principale du Cerfa, les suivantes sur
        l'annexe officielle jointe automatiquement au dossier.
      </p>

      {zones.length >= 2 && (
        <Coachmark
          id="fusion-zones"
          text="Deux zones qui décrivent le même endroit (une importée par KML, l'autre par Cerfa, par exemple) ? Cliquez sur leurs cases à cocher puis sur « Fusionner »."
          className="mb-3"
        />
      )}

      <div className="mb-4 space-y-3">
        {zones.map((z) =>
          editingId === z.id ? (
            <div key={z.id} id={`zone-${z.id}`} className="scroll-mt-4 border-l-2 border-brand bg-slate-50 p-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Nom de la zone"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Adresse"
                  value={editForm.adresse}
                  onChange={(e) => setEditForm((f) => ({ ...f, adresse: e.target.value }))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Code postal"
                  value={editForm.code_postal}
                  onChange={(e) => setEditForm((f) => ({ ...f, code_postal: e.target.value }))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Localité"
                  value={editForm.localite}
                  onChange={(e) => setEditForm((f) => ({ ...f, localite: e.target.value }))}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <NumberFieldWithUnit
                  placeholder="Distance max"
                  unit="m"
                  value={editForm.distance_max_m}
                  onChange={(v) => setEditForm((f) => ({ ...f, distance_max_m: v }))}
                  hint="Distance maximale, en mètres, entre le télépilote et le drone pendant le vol."
                />
                <NumberFieldWithUnit
                  placeholder="Hauteur max"
                  unit="m"
                  value={editForm.hauteur_max_m}
                  onChange={(v) => setEditForm((f) => ({ ...f, hauteur_max_m: v }))}
                  hint="Hauteur maximale de vol au-dessus du sol, en mètres."
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.en_agglomeration}
                  onChange={(e) => setEditForm((f) => ({ ...f, en_agglomeration: e.target.checked }))}
                />
                En agglomération
                <FieldHint text="Cochez si la zone de vol se situe en agglomération (zone urbanisée)." />
              </label>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.rassemblement}
                  onChange={(e) => setEditForm((f) => ({ ...f, rassemblement: e.target.checked }))}
                />
                À proximité d'un rassemblement de personnes
                <FieldHint text="Cochez s'il y a un rassemblement de personnes (événement, marché, foule...) à proximité de la zone de vol." />
              </label>
              <span className="mt-3 block text-xs text-slate-500">
                Description du site
                <FieldHint text="Décrit le lieu de vol (nature du site, environnement, obstacles, accès...). Le Cerfa n'a qu'une case à cocher « descriptif joint séparément », sans champ de texte : ce descriptif est donc ajouté comme page dédiée dans le dossier PDF généré." />
              </span>
              <AutoTextarea
                placeholder="Description du site"
                value={editForm.description_site}
                onChange={(e) => setEditForm((f) => ({ ...f, description_site: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <span className="mt-3 block text-xs text-slate-500">
                Autres informations utiles
                <FieldHint text="Horaires particuliers, zone aéronautique à statut particulier, ou toute autre précision sur les opérations à proximité. Reprend le champ « Autres informations utiles » du Cerfa." />
              </span>
              <AutoTextarea
                placeholder="Autres informations utiles"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />

              <div className="mt-3">
                <span className="mb-1 block text-xs text-slate-500">
                  Capture(s) de la zone
                  <FieldHint text="Carte, capture d'écran ou export de zone de vol. Un fichier KML donne une bien meilleure carte (avec échelle) : s'il en importe un ici, il sera ajouté comme nouvelle zone, à fusionner ensuite avec celle-ci si besoin (cases à cocher plus haut)." />
                </span>
                {editExistingImages.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {editExistingImages.length} image{editExistingImages.length > 1 ? "s" : ""} déjà attachée
                        {editExistingImages.length > 1 ? "s" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditExistingImages([])}
                        className="text-red-500 hover:underline"
                      >
                        Tout retirer
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {editExistingImages.map((path) => (
                        <div
                          key={path}
                          className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                          onClick={() => editImageUrls[path] && setLightboxUrl(editImageUrls[path])}
                        >
                          {editImageUrls[path] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={editImageUrls[path]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full animate-pulse bg-slate-200" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditExistingImages((prev) => prev.filter((p) => p !== path));
                            }}
                            title="Retirer cette image"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-xs text-red-300 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <FileDropzone
                  label={
                    editNewFiles.length > 0
                      ? `${editNewFiles.length} nouvelle(s) image(s) sélectionnée(s)`
                      : "Glisser un fichier KML ici, ou une image en complément"
                  }
                  hint="KML : génère la carte avec échelle (recommandé), importé comme nouvelle zone. Image : ajoutée en plus, en complément."
                  accept="image/*,.kml"
                  multiple
                  onFiles={(fs) => {
                    const kmlFiles = fs.filter((f) => f.name.toLowerCase().endsWith(".kml"));
                    const imageFiles = fs.filter((f) => !f.name.toLowerCase().endsWith(".kml"));
                    if (imageFiles.length > 0) setEditNewFiles(imageFiles);
                    kmlFiles.forEach((f) => handleImportKml(f));
                  }}
                />
                {importingKml && <p className="mt-2 text-xs text-slate-500">Lecture et géolocalisation en cours...</p>}
              </div>

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => saveEdit(z.id)}
                  disabled={savingEdit}
                  className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
                >
                  {savingEdit ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div
              key={z.id}
              id={`zone-${z.id}`}
              onClick={() => {
                // Toute la bande sélectionne (sauf Modifier/Retirer, qui
                // stoppent la propagation) : plus facile à cibler que la
                // seule petite case à cocher.
                if (zones.length >= 2) toggleMergeSelect(z.id);
              }}
              onDoubleClick={() => startEdit(z)}
              title="Double-clic pour modifier"
              className={`scroll-mt-4 flex items-center justify-between border-l-2 border-brand p-3 text-sm transition-colors ${
                zones.length >= 2 ? "cursor-pointer" : ""
              } ${selectedForMerge.has(z.id) ? "bg-brand-light" : "bg-slate-50 hover:bg-slate-100"}`}
            >
              <div className="flex items-center gap-3">
                {zones.length >= 2 && (
                  <input
                    type="checkbox"
                    checked={selectedForMerge.has(z.id)}
                    onChange={() => toggleMergeSelect(z.id)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title="Sélectionner pour fusionner"
                    className="shrink-0"
                  />
                )}
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {z.title || z.adresse}
                    <ZoneCompletenessBadge zone={z} />
                  </p>
                  <p className="text-slate-500">
                    {z.adresse} {z.code_postal} {z.localite}
                  </p>
                  <p className="text-xs text-slate-400">
                    {z.hauteur_max_m != null ? `Hauteur max ${z.hauteur_max_m} m` : "Hauteur max non renseignée"} ·{" "}
                    {z.distance_max_m != null ? `Éloignement max ${z.distance_max_m} m` : "Éloignement max non renseigné"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(z);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="text-brand hover:underline"
                >
                  Modifier
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeZone(z.id);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="text-red-500 hover:underline"
                >
                  Retirer
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {selectedForMerge.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-brand/30 bg-brand-light px-3 py-2 text-sm">
          <span className="text-ink">
            {selectedForMerge.size} zone{selectedForMerge.size > 1 ? "s" : ""} sélectionnée
            {selectedForMerge.size > 1 ? "s" : ""}
            {selectedForMerge.size < 2 && (
              <span className="ml-2 text-xs text-slate-400">sélectionnez au moins deux zones pour fusionner</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={confirmMerge}
              disabled={merging || selectedForMerge.size < 2}
              className="rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-40"
              style={spotlightMerge.style}
              onMouseMove={spotlightMerge.onMouseMove}
              onMouseLeave={spotlightMerge.onMouseLeave}
            >
              {merging ? "Fusion..." : "Fusionner"}
            </button>
            <button onClick={() => setSelectedForMerge(new Set())} className="text-xs text-slate-400 hover:underline">
              Annuler
            </button>
          </div>
        </div>
      )}

      {showAddZone ? (
        <>
          <div className="mb-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="block text-sm font-medium text-ink">Importer</span>
              {zones.length > 0 && (
                <button onClick={() => setShowAddZone(false)} className="text-xs text-slate-400 hover:underline">
                  Fermer
                </button>
              )}
            </div>
            <FileDropzone
              label="Glisser un fichier KML ici (recommandé), ou un Cerfa pré-rempli"
              hint="Le type est détecté automatiquement : KML pour la carte, Cerfa pour préremplir vos infos."
              accept="application/pdf,.kml"
              multiple
              disabled={importingCerfa || importingKml}
              onFiles={handleImportFiles}
            />
            {(importingCerfa || importingKml) && (
              <p className="mt-2 text-sm text-slate-500">
                {importingKml ? "Lecture et géolocalisation en cours..." : "Lecture du fichier..."}
              </p>
            )}
            <StatusMessage text={cerfaMsg} />
            <StatusMessage text={kmlMsg} />
          </div>

          <form onSubmit={addZone} className="space-y-3 border-t border-slate-100 pt-4">
          <span className="block text-sm font-medium text-ink">Ou saisir une zone manuellement</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nom de la zone"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Adresse"
              value={form.adresse}
              onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Code postal"
              value={form.code_postal}
              onChange={(e) => setForm((f) => ({ ...f, code_postal: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Localité"
              value={form.localite}
              onChange={(e) => setForm((f) => ({ ...f, localite: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <NumberFieldWithUnit
              placeholder="Distance max"
              unit="m"
              value={form.distance_max_m}
              onChange={(v) => setForm((f) => ({ ...f, distance_max_m: v }))}
              hint="Distance maximale, en mètres, entre le télépilote et le drone pendant le vol."
            />
            <NumberFieldWithUnit
              placeholder="Hauteur max"
              unit="m"
              value={form.hauteur_max_m}
              onChange={(v) => setForm((f) => ({ ...f, hauteur_max_m: v }))}
              hint="Hauteur maximale de vol au-dessus du sol, en mètres."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.en_agglomeration}
              onChange={(e) => setForm((f) => ({ ...f, en_agglomeration: e.target.checked }))}
            />
            En agglomération
            <FieldHint text="Cochez si la zone de vol se situe en agglomération (zone urbanisée)." />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.rassemblement}
              onChange={(e) => setForm((f) => ({ ...f, rassemblement: e.target.checked }))}
            />
            À proximité d'un rassemblement de personnes
            <FieldHint text="Cochez s'il y a un rassemblement de personnes (événement, marché, foule...) à proximité de la zone de vol." />
          </label>
          <span className="block text-xs text-slate-500">
            Description du site
            <FieldHint text="Décrit le lieu de vol (nature du site, environnement, obstacles, accès...). Le Cerfa n'a qu'une case à cocher « descriptif joint séparément », sans champ de texte : ce descriptif est donc ajouté comme page dédiée dans le dossier PDF généré." />
          </span>
          <AutoTextarea
            placeholder="Description du site"
            value={form.description_site}
            onChange={(e) => setForm((f) => ({ ...f, description_site: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="block text-xs text-slate-500">
            Autres informations utiles
            <FieldHint text="Horaires particuliers, zone aéronautique à statut particulier, ou toute autre précision sur les opérations à proximité. Reprend le champ « Autres informations utiles » du Cerfa." />
          </span>
          <AutoTextarea
            placeholder="Autres informations utiles"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div>
            <span className="mb-1 block text-sm text-slate-600">
              Capture(s) de la zone
              <FieldHint text="Un fichier KML donne une bien meilleure carte (avec échelle) qu'une simple capture d'écran -- préférez-le si vous l'avez. Sinon, une carte, une capture d'écran ou un export DroneKeeper fonctionne aussi, en complément ou à la place." />
            </span>
            <FileDropzone
              label={files.length > 0 ? `${files.length} image(s) sélectionnée(s)` : "Glisser un fichier KML ici, ou des images en complément"}
              hint="KML : génère la carte avec échelle (recommandé). Images : simplement jointes en complément."
              accept="image/*,.kml"
              multiple
              onFiles={(fs) => {
                const kmlFiles = fs.filter((f) => f.name.toLowerCase().endsWith(".kml"));
                const imageFiles = fs.filter((f) => !f.name.toLowerCase().endsWith(".kml"));
                if (imageFiles.length > 0) setFiles(imageFiles);
                kmlFiles.forEach((f) => handleImportKml(f));
              }}
            />
            {importingKml && <p className="mt-2 text-sm text-slate-500">Lecture et géolocalisation en cours...</p>}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
            style={spotlightAddZoneSubmit.style}
            onMouseMove={spotlightAddZoneSubmit.onMouseMove}
            onMouseLeave={spotlightAddZoneSubmit.onMouseLeave}
          >
            {saving ? "Ajout..." : "+ Ajouter la zone"}
          </button>
          </form>
        </>
      ) : (
        <button
          onClick={(e) => {
            spotlightAddZoneToggle.onClick(e);
            setShowAddZone(true);
          }}
          className="w-full rounded-md border border-dashed border-slate-300 py-2.5 text-sm text-slate-400 outline-none transition-colors hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/50"
          style={spotlightAddZoneToggle.style}
          onMouseMove={spotlightAddZoneToggle.onMouseMove}
          onMouseLeave={spotlightAddZoneToggle.onMouseLeave}
        >
          + Ajouter une zone de vol
        </button>
      )}

      {mounted &&
        lightboxUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxUrl(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
            <button
              onClick={() => setLightboxUrl(null)}
              aria-label="Fermer"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/80"
            >
              ✕
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../../components/FileDropzone";
import DateRangePicker from "../../components/DateRangePicker";
import DroneChecklist from "../../components/DroneChecklist";
import FieldHint from "../../components/FieldHint";
import FieldError from "../../components/FieldError";
import Coachmark from "../../components/Coachmark";
import { ErrorBanner, WarningBanner } from "../../components/Banner";
import StatusMessage from "../../components/StatusMessage";
import { Drone, droneKey, mergeDroneLists } from "@/lib/drones";
import { Question, QUESTION_HINTS } from "@/lib/missionQuestions";
import { useSpotlightHoverBgOnly } from "@/lib/useSpotlightHover";
import UnsavedChangesGuard from "../../components/UnsavedChangesGuard";
import DroneLoader from "../../components/DroneLoader";

type MissionType = { slug: string; label: string; description: string; question_schema: Question[] };

function frToIso(dmy?: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
}

// Jours ouvrés (lun-ven, hors jours fériés) entre aujourd'hui et une date de
// début : certaines préfectures demandent jusqu'à 10 jours ouvrés de délai,
// d'autres seulement 5 -> avertissement non bloquant plutôt qu'un blocage.
function businessDaysUntil(dateIso: string): number {
  const target = new Date(dateIso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (target <= today) return 0;
  let count = 0;
  const d = new Date(today);
  while (d < target) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export default function NewMissionForm({
  missionTypes,
  initialProfileDrones = [],
}: {
  missionTypes: MissionType[];
  initialProfileDrones?: Drone[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [typeSlug, setTypeSlug] = useState(missionTypes[0]?.slug || "");
  const [title, setTitle] = useState("");
  const [objetMission, setObjetMission] = useState("");
  const [commanditaire, setCommanditaire] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [dateFin, setDateFin] = useState("");
  const [heureFin, setHeureFin] = useState("18:00");
  const [sousCategorie, setSousCategorie] = useState<"a1" | "a2" | "a3">("a3");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  // Nouvelle 1re étape (retour bêta-testeur) : demande d'abord si un Cerfa
  // pré-rempli existe déjà, avant même d'afficher le reste du formulaire
  // (qui, lui, ne change pas selon la réponse -- juste une étape en plus au
  // tout début, pour orienter directement vers le bon geste : importer, ou
  // saisir à la main).
  const [hasCerfa, setHasCerfa] = useState<"oui" | "non" | null>(null);
  const spotlightHasCerfaOui = useSpotlightHoverBgOnly();
  const spotlightHasCerfaNon = useSpotlightHoverBgOnly();
  const spotlightSubmit = useSpotlightHoverBgOnly();
  const [errorMsg, setErrorMsg] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  // Remonte automatiquement vers le champ en cause quand la soumission
  // échoue (titre ou dates manquants) -- retour bêta-testeur : le message
  // d'erreur en bas de page ne disait pas où était le problème plus haut.
  const titleRef = useRef<HTMLInputElement>(null);
  const datesRef = useRef<HTMLDivElement>(null);
  const [redirecting, setRedirecting] = useState(false);
  // Avertissement avant de quitter la page en pleine saisie (clic sur un
  // lien de nav par erreur) : pas de "enregistrer et quitter" ici, une
  // mission en cours de création ne peut pas être sauvegardée à moitié --
  // seule l'option "quitter sans enregistrer" a du sens.
  const [dirty, setDirty] = useState(false);
  const [raisonsHoraires, setRaisonsHoraires] = useState("");
  const [prescriptionsRestrictives, setPrescriptionsRestrictives] = useState("");

  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importedData, setImportedData] = useState<any | null>(null);


  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [kmlMsg, setKmlMsg] = useState("");

  // Drones pour CETTE mission : tous les drones du profil sont cochés par
  // défaut (comportement historique), mais si un Cerfa est importé et en
  // détecte un sous-ensemble précis (ex: seulement le Mavic 3 Pro), la
  // sélection bascule sur uniquement ceux-là plutôt que de garder tout le
  // profil coché en plus de ce qui vient d'être importé.
  const [extraDrones, setExtraDrones] = useState<Drone[]>([]);
  const [checkedDroneKeys, setCheckedDroneKeys] = useState<Set<string>>(
    () => new Set(initialProfileDrones.map(droneKey))
  );
  const allDrones = useMemo(
    () => mergeDroneLists(initialProfileDrones, extraDrones),
    [initialProfileDrones, extraDrones]
  );

  const selectedType = useMemo(() => missionTypes.find((t) => t.slug === typeSlug), [typeSlug, missionTypes]);

  function toggleDrone(key: string) {
    setCheckedDroneKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSelectKml(file: File) {
    setKmlFile(file);
    setKmlMsg(`"${file.name}" prêt. Les zones seront importées (avec carte) une fois la mission créée.`);
  }

  // Logique commune de préremplissage : partagée entre l'import Cerfa et
  // l'import FlyBy, puisque les deux endpoints renvoient exactement la même
  // forme de données (site1/dates/regime/aeronefN/telepilote1).
  function applyImportedData(data: any): { nbZones: number; nbDrones: number } {
    setImportedData((prev: any) => ({ ...prev, ...data }));

    if (data.site1?.objet_mission) {
      setTitle((prev) => prev || data.site1.objet_mission);
      setObjetMission((prev) => prev || data.site1.objet_mission);
    } else if (data.site1?.adresse) {
      setTitle((prev) => prev || `Mission · ${data.site1.adresse}`);
    }
    if (data.site1?.commanditaire) setCommanditaire((prev) => prev || data.site1.commanditaire);

    // Préremplit aussi "Hauteur maximale de vol envisagée" / "Éloignement
    // maximal du télépilote" (les questions du type de mission) depuis la
    // zone 1 du fichier importé, si l'utilisateur n'a rien saisi lui-même :
    // évite de redemander une info déjà présente dans le fichier.
    setAnswers((prev) => ({
      ...prev,
      hauteur_max: prev.hauteur_max || data.site1?.hauteur_max_m || "",
      eloignement_max: prev.eloignement_max || data.site1?.eloignement_max_m || "",
    }));

    if (data.dates?.debut_date) setDateDebut((prev) => prev || frToIso(data.dates.debut_date));
    if (data.dates?.debut_heure)
      setHeureDebut((prev) => (prev && prev !== "09:00" ? prev : `${data.dates.debut_heure}:${data.dates.debut_min || "00"}`));
    if (data.dates?.fin_date) setDateFin((prev) => prev || frToIso(data.dates.fin_date));
    if (data.dates?.fin_heure)
      setHeureFin((prev) => (prev && prev !== "18:00" ? prev : `${data.dates.fin_heure}:${data.dates.fin_min || "00"}`));

    if (data.regime?.sous_categorie_a1) setSousCategorie("a1");
    else if (data.regime?.sous_categorie_a2) setSousCategorie("a2");
    else if (data.regime?.sous_categorie_a3) setSousCategorie("a3");

    const nbZones = [data.site1, data.site2].filter(Boolean).length;
    const importedDrones: Drone[] = [1, 2, 3, 4, 5]
      .map((i) => data[`aeronef${i}`])
      .filter((d) => d && d.constructeur)
      .map((d) => ({
        constructeur: d.constructeur || "",
        modele: d.modele || "",
        type: d.type || "Drone",
        numero_serie: d.numero_serie || "",
        masse_kg: d.masse_kg || "",
        classe_c5: d.classe_c5 || "non",
        captif: d.captif || "non",
        numero_enregistrement: d.numero_enregistrement || "",
        numero_signalement: d.numero_signalement || "",
      }));
    const nbDrones = importedDrones.length;
    if (nbDrones > 0) {
      // On ajoute ceux qui ne sont pas déjà dans le profil, et on ne coche
      // QUE les drones importés (pas "tous les drones du profil + ceux
      // importés") : c'est précisément ce qu'un fichier importé décrit.
      setExtraDrones((prev) => mergeDroneLists(prev, importedDrones));
      setCheckedDroneKeys(new Set(importedDrones.map(droneKey)));
    }
    return { nbZones, nbDrones };
  }

  // Import unifié (retour bêta-testeur : 2-3 zones de dépôt séparées
  // donnaient l'impression que tous les documents étaient obligatoires) :
  // une seule dropzone accepte PDF (Cerfa ou dossier FlyBy, détecté
  // automatiquement côté serveur) et KML, chaque fichier déposé est routé
  // vers le bon traitement selon son extension.
  async function handleImportPdf(file: File) {
    setImporting(true);
    setImportMsg("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-import", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");

      const { nbZones, nbDrones } = applyImportedData(json.data);
      const sourceLabel = json.source === "flyby" ? "dossier FlyBy" : "Cerfa";
      const w = json.warnings?.length ? ` ${json.warnings.join(" ")}` : "";
      if (nbZones === 0 && nbDrones === 0) {
        setImportMsg(`"${file.name}" : rien d'exploitable trouvé dans ce fichier.${w}`);
      } else {
        setImportMsg(
          `Importé depuis ${sourceLabel} : ${nbZones} zone(s) et ${nbDrones} drone(s) détectés. Ils seront ajoutés automatiquement à la mission.${w}`
        );
      }
    } catch (e: any) {
      setImportMsg(`Erreur : ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  function handleImportFiles(files: File[]) {
    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".kml")) {
        handleSelectKml(file);
      } else {
        handleImportPdf(file);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setTitleTouched(true);

    if (!title.trim()) {
      titleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      titleRef.current?.focus();
      return;
    }

    if (!dateDebut || !dateFin) {
      setErrorMsg("Renseignez une date de début et une date de fin.");
      datesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { data: mission, error } = await supabase
      .from("missions")
      .insert({
        user_id: user.id,
        mission_type: typeSlug,
        title,
        objet_mission: objetMission || title,
        commanditaire,
        answers,
        raisons_horaires: raisonsHoraires || null,
        prescriptions_restrictives: prescriptionsRestrictives || null,
        date_debut: dateDebut || null,
        heure_debut: heureDebut,
        date_fin: dateFin || null,
        heure_fin: heureFin,
        regime: {
          categorie_ouverte: true,
          sous_categorie_a1: sousCategorie === "a1",
          sous_categorie_a2: sousCategorie === "a2",
          sous_categorie_a3: sousCategorie === "a3",
        },
        drones: allDrones.filter((d) => checkedDroneKeys.has(droneKey(d))),
      })
      .select()
      .single();

    if (error || !mission) {
      setSaving(false);
      setErrorMsg(error?.message || "Erreur inconnue");
      return;
    }

    // Nombre de zones illimité (les 2 premières vont sur la page 1 du Cerfa,
    // les suivantes sur l'annexe officielle - cf. fillAnnexe.ts). Le KML
    // (plus précis : carte, adresse géolocalisée, hauteur/éloignement
    // calculés) passe en premier, le Cerfa comble les emplacements restants
    // s'il y en a.
    let slotsUsed = 0;
    // Zone 1 importée (KML en priorité, sinon Cerfa) : sert à compléter
    // "Hauteur maximale de vol envisagée" / "Éloignement maximal du
    // télépilote" si l'utilisateur ne les a pas renseignées lui-même. Le KML
    // n'est parsé qu'ici (après création de la mission), donc ce prérempli
    // ne peut se faire qu'après coup, contrairement au Cerfa (cf.
    // handleImportCerfa, prérempli en direct pendant la saisie).
    let firstZoneHeights: { hauteur_max_m?: number | null; distance_max_m?: number | null } | null = null;

    if (kmlFile) {
      try {
        const body = new FormData();
        body.append("file", kmlFile);
        body.append("missionId", mission.id);
        const res = await fetch("/api/parse-kml", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erreur d'import KML");

        const toInsert = (json.zones || []).map((z: any, i: number) => ({
          mission_id: mission.id,
          order_index: i,
          title: z.title || null,
          adresse: z.adresse || null,
          code_postal: z.code_postal || null,
          localite: z.localite || null,
          distance_max_m: z.distance_max_m,
          hauteur_max_m: z.hauteur_max_m,
          notes: z.notes || null,
          image_paths: z.image_paths || [],
          map_meta: z.map_meta || null,
        }));
        if (toInsert.length > 0) {
          const { error: insertErr } = await supabase.from("zones").insert(toInsert);
          if (insertErr) {
            setKmlMsg(`Erreur en enregistrant les zones importées : ${insertErr.message} (la mission a quand même été créée)`);
          } else {
            slotsUsed = toInsert.length;
            firstZoneHeights = { hauteur_max_m: toInsert[0].hauteur_max_m, distance_max_m: toInsert[0].distance_max_m };
          }
        }
      } catch (e: any) {
        setKmlMsg(`Erreur d'import KML : ${e.message} (la mission a quand même été créée)`);
      }
    }

    // Zones importées depuis le Cerfa -> complètent les emplacements
    // restants (sans image, à compléter ensuite avec une capture de carte)
    if (importedData) {
      // Le Cerfa source ne décrit que 2 sites max sur sa page 1 (site1/site2) ;
      // c'est une limite du formulaire importé, pas de notre app.
      const zonesToInsert = [importedData.site1, importedData.site2]
        .filter(Boolean)
        .map((s: any, i: number) => ({
          mission_id: mission.id,
          order_index: slotsUsed + i,
          title: s.adresse || `Zone ${slotsUsed + i + 1}`,
          code_postal: s.code_postal || null,
          localite: s.localite || null,
          adresse: s.adresse || null,
          en_agglomeration: !!s.en_agglomeration,
          rassemblement: !!s.rassemblement,
          rassemblement_description: s.rassemblement_description || null,
          distance_max_m: s.eloignement_max_m ? Number(s.eloignement_max_m) : null,
          hauteur_max_m: s.hauteur_max_m ? Number(s.hauteur_max_m) : null,
          notes: s.autres_infos || null,
          image_paths: [],
        }));
      if (zonesToInsert.length > 0) {
        const { error: insertErr } = await supabase.from("zones").insert(zonesToInsert);
        if (insertErr) {
          setImportMsg(`Erreur en enregistrant les zones du Cerfa : ${insertErr.message} (la mission a quand même été créée)`);
        } else if (!firstZoneHeights) {
          firstZoneHeights = {
            hauteur_max_m: zonesToInsert[0].hauteur_max_m,
            distance_max_m: zonesToInsert[0].distance_max_m,
          };
        }
      }

      // Complète le profil si vide (nom/adresse/drones), sans écraser ce qui existe déjà
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile && !profile.full_name && importedData.telepilote1?.nom) {
        const drones = [1, 2, 3, 4, 5]
          .map((i) => importedData[`aeronef${i}`])
          .filter((d) => d && d.constructeur)
          .map((d) => ({
            constructeur: d.constructeur || "",
            modele: d.modele || "",
            type: d.type || "Drone",
            numero_serie: d.numero_serie || "",
            masse_kg: d.masse_kg || "",
            classe_c5: d.classe_c5 || "non",
            captif: d.captif || "non",
            numero_enregistrement: d.numero_enregistrement || "",
            numero_signalement: d.numero_signalement || "",
          }));

        await supabase
          .from("profiles")
          .update({
            full_name: `${importedData.telepilote1.prenom || ""} ${importedData.telepilote1.nom || ""}`.trim(),
            address: importedData.telepilote1.adresse || profile.address,
            phone: importedData.telepilote1.telephone_portable || profile.phone,
            drones: profile.drones?.length ? profile.drones : drones,
          })
          .eq("id", user.id);
      }
    }

    // Si une zone importée (KML ou Cerfa) a une hauteur/éloignement et que
    // les questions du type de mission ne les ont pas déjà (ni saisies à la
    // main, ni préremplies pendant l'import Cerfa ci-dessus), on complète
    // maintenant : la mission existe déjà à ce stade (id nécessaire).
    if (firstZoneHeights && (firstZoneHeights.hauteur_max_m != null || firstZoneHeights.distance_max_m != null)) {
      const patch: Record<string, any> = {};
      if (!answers.hauteur_max && firstZoneHeights.hauteur_max_m != null) patch.hauteur_max = firstZoneHeights.hauteur_max_m;
      if (!answers.eloignement_max && firstZoneHeights.distance_max_m != null) patch.eloignement_max = firstZoneHeights.distance_max_m;
      if (Object.keys(patch).length > 0) {
        await supabase
          .from("missions")
          .update({ answers: { ...answers, ...patch } })
          .eq("id", mission.id);
      }
    }

    // On ne repasse pas saving à false ici : le bouton reste désactivé
    // (spinner) jusqu'à ce que la navigation charge la page mission, plutôt
    // que de redevenir cliquable un court instant avant que la page suivante
    // n'apparaisse (petit flash déroutant signalé par un beta testeur).
    setDirty(false);
    setRedirecting(true);
    router.push(`/missions/${mission.id}`);
  }

  if (hasCerfa === null) {
    return (
      <div className="bg-glass p-6">
        <h2 className="mb-2 text-lg font-medium text-ink">Avez-vous déjà un Cerfa pré-rempli pour cette mission ?</h2>
        <p className="mb-5 text-sm text-slate-500">
          Un fichier PDF déjà rempli (DroneKeeper ou un autre outil) permet de préremplir automatiquement vos
          infos, vos drones et les dates. Sans Cerfa, pas de problème : vous pourrez tout saisir à la main juste
          après (et importer un fichier KML pour la carte).
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={(e) => {
              spotlightHasCerfaOui.onClick(e);
              setHasCerfa("oui");
            }}
            className="rounded-md bg-brand px-6 py-2.5 font-medium text-brand-ink outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-brand/50"
            style={spotlightHasCerfaOui.style}
            onMouseMove={spotlightHasCerfaOui.onMouseMove}
            onMouseLeave={spotlightHasCerfaOui.onMouseLeave}
          >
            Oui, je l'ai
          </button>
          <button
            type="button"
            onClick={(e) => {
              spotlightHasCerfaNon.onClick(e);
              setHasCerfa("non");
            }}
            className="rounded-md border border-brand px-6 py-2.5 font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50"
            style={spotlightHasCerfaNon.style}
            onMouseMove={spotlightHasCerfaNon.onMouseMove}
            onMouseLeave={spotlightHasCerfaNon.onMouseLeave}
          >
            Non
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <UnsavedChangesGuard dirty={dirty} />
      <form
        onSubmit={handleSubmit}
        onChangeCapture={() => setDirty(true)}
        onClickCapture={() => setDirty(true)}
        noValidate
        className="space-y-6"
      >
      <button
        type="button"
        onClick={() => setHasCerfa(null)}
        className="text-xs text-slate-400 hover:text-brand hover:underline"
      >
        ← Revenir en arrière
      </button>
      <div className="bg-glass p-5">
        <h2 className="mb-1 font-medium text-ink">Imports optionnels</h2>
        <p className="mb-3 text-xs text-slate-500">
          Déposez ce que vous avez, ce n'est jamais obligatoire : un Cerfa pré-rempli ou un dossier de vol FlyBy
          préremplissent vos infos, vos drones et les dates ; un fichier KML apporte en plus la carte des zones
          (avec échelle) et calcule hauteur/éloignement.
        </p>
        <Coachmark
          id="import-optionnel-mission"
          text="Rien sous la main ? Pas de problème, vous pourrez tout saisir à la main juste après (et ajouter une simple capture d'écran pour la zone, une fois la mission créée)."
          className="mb-3"
        />
        <FileDropzone
          label="Glisser un Cerfa, un dossier FlyBy ou un fichier KML ici, ou cliquer pour parcourir"
          hint="PDF pré-rempli (DroneKeeper, FlyBy...) ou export KML (carte des zones) -- le type est détecté automatiquement"
          accept="application/pdf,.kml"
          multiple
          disabled={importing}
          onFiles={handleImportFiles}
        />
        {importing && <p className="mt-2 text-sm text-slate-500">Lecture du fichier...</p>}
        <StatusMessage text={importMsg} />
        <StatusMessage text={kmlMsg} />
        <p className="mt-2 text-xs text-slate-500">
          <a href="/tutoriel/flyby" target="_blank" className="text-brand hover:underline">
            Comment récupérer un dossier de vol FlyBy ?
          </a>{" "}
          ·{" "}
          <a href="/tutoriel#pas-de-carte" target="_blank" className="text-brand hover:underline">
            Pas de fichier sous la main ?
          </a>
        </p>
      </div>

      <div className="bg-glass p-5">
        <h2 className="mb-1 font-medium text-ink">Drones pour cette mission</h2>
        <p className="mb-3 text-xs text-slate-500">
          Coché par défaut : tous vos drones enregistrés. Décochez ceux qui ne volent pas sur cette
          mission-là.
        </p>
        <DroneChecklist
          drones={allDrones}
          checkedKeys={checkedDroneKeys}
          onToggle={toggleDrone}
          onSetAll={(keys) => setCheckedDroneKeys(new Set(keys))}
        />
      </div>

      <div className="bg-glass p-5">
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">Type de mission</span>
          <select
            value={typeSlug}
            onChange={(e) => setTypeSlug(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {missionTypes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
          {selectedType?.description && (
            <span className="mt-1 block text-xs text-slate-400">{selectedType.description}</span>
          )}
          {selectedType?.label?.toLowerCase().includes("autre") && (
            <input
              value={answers.type_autre_precision || ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, type_autre_precision: e.target.value }))}
              placeholder="Précisez le type de mission"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          )}
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">Titre de la mission</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex : Inspection toiture, Cabourg"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {titleTouched && !title.trim() && <FieldError />}
          <span className="mt-1 block text-xs text-slate-500">
            Sert de nom interne dans votre liste de missions, et d'objet de mission par défaut sur le Cerfa
            (modifiable ci-dessous).
          </span>
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">
            Objet précis de la mission (Cerfa)
            <FieldHint text="Décrit ce que fait le vol (ex : inspection de toiture, prise de vue publicitaire, relevé topographique...). Apparaît tel quel sur le Cerfa, pour chaque zone de vol." />
          </span>
          <input
            value={objetMission}
            onChange={(e) => setObjetMission(e.target.value)}
            placeholder={title || "Laissez vide pour reprendre le titre ci-dessus"}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">
            Commanditaire de la mission
            <FieldHint text="Qui a demandé cette mission : un client, une entreprise, une administration, ou vous-même si vous volez pour votre compte." />
          </span>
          <input
            value={commanditaire}
            onChange={(e) => setCommanditaire(e.target.value)}
            placeholder="ex : Mairie de Cabourg, particulier, ma société..."
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">
            Sous-catégorie (catégorie ouverte)
            <FieldHint text="A1 : peut survoler des personnes isolées. A2 : peut voler à distance réduite des personnes, sans les survoler. A3 : doit rester loin de toute zone habitée ou de personnes. Dépend du poids et de la classe (C0-C4) de votre drone : vérifiez sa notice si besoin." />
          </span>
          <select
            value={sousCategorie}
            onChange={(e) => setSousCategorie(e.target.value as any)}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="a1">A1</option>
            <option value="a2">A2</option>
            <option value="a3">A3</option>
          </select>
        </label>

        <div ref={datesRef}>
        <label className="mb-1 block text-sm">
          <span className="mb-1 block text-slate-600">Dates et horaires de vol</span>
        </label>
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
        {dateDebut &&
          (() => {
            const days = businessDaysUntil(dateDebut);
            return days > 0 && days < 10 ? (
              <WarningBanner className="mt-3">
                Cette mission commence dans {days} jour{days > 1 ? "s" : ""} ouvré{days > 1 ? "s" : ""}. Certaines
                préfectures demandent jusqu'à 10 jours ouvrés de délai : ça n'empêche pas de créer la mission.
              </WarningBanner>
            ) : null;
          })()}
        </div>
      </div>

      <div className="bg-glass p-5">
        <h2 className="mb-1 font-medium text-ink">Informations générales sur le vol</h2>
        <p className="mb-4 text-xs text-slate-500">
          Pas obligatoire ici : modifiable plus tard, depuis la page de la mission.
        </p>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">
              Raisons qui ont présidé à la détermination des horaires de survol déclarés
              <FieldHint text="Pourquoi ces horaires précisément (luminosité, activité du site, disponibilité...). Champ général du Cerfa, pas propre à une zone en particulier." />
            </span>
            <textarea
              value={raisonsHoraires}
              onChange={(e) => setRaisonsHoraires(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">
              Prescriptions restrictives de survol imposées par les gestionnaires des sites concernés
              <FieldHint text="Contraintes fixées par le(s) gestionnaire(s) du ou des sites survolés (mairie, propriétaire, exploitant...), s'il y en a. Laissez vide si aucune." />
            </span>
            <textarea
              value={prescriptionsRestrictives}
              onChange={(e) => setPrescriptionsRestrictives(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </div>

      <Coachmark
        id="multi-pilotes-creation-mission"
        text="Vous n'êtes pas le seul télépilote sur ce vol ? Vous pourrez ajouter jusqu'à 3 autres pilotes juste après, depuis la page de la mission."
        className="mb-1"
      />

      {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md border border-brand px-6 py-2.5 font-medium text-brand outline-none transition-colors hover:bg-brand-light focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50"
        style={spotlightSubmit.style}
        onMouseMove={spotlightSubmit.onMouseMove}
        onMouseLeave={spotlightSubmit.onMouseLeave}
      >
        {redirecting ? "Ouverture de la mission..." : saving ? "Création..." : "Créer la mission"}
      </button>

      {redirecting && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-glass flex items-center gap-3 px-5 py-3">
            <DroneLoader size={28} className="text-brand" />
            <p className="text-sm text-slate-300">Mission créée, ouverture en cours...</p>
          </div>
        </div>
      )}
      </form>
    </>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  hint,
}: {
  question: Question;
  value: any;
  onChange: (v: any) => void;
  hint?: string;
}) {
  if (question.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {question.label}
        {hint && <FieldHint text={hint} />}
      </label>
    );
  }
  if (question.type === "textarea") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">
          {question.label}
          {hint && <FieldHint text={hint} />}
        </span>
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
    );
  }
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">
        {question.label}
        {hint && <FieldHint text={hint} />}
      </span>
      <input
        type={question.type === "number" ? "number" : "text"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

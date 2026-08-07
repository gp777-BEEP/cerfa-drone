"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../../components/FileDropzone";
import DateRangePicker from "../../components/DateRangePicker";
import DroneChecklist from "../../components/DroneChecklist";
import FieldHint from "../../components/FieldHint";
import Coachmark from "../../components/Coachmark";
import { ErrorBanner } from "../../components/Banner";
import StatusMessage from "../../components/StatusMessage";
import { Drone, droneKey, mergeDroneLists } from "@/lib/drones";
import { Question, QUESTION_HINTS } from "@/lib/missionQuestions";

type MissionType = { slug: string; label: string; description: string; question_schema: Question[] };

function frToIso(dmy?: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
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
  const [errorMsg, setErrorMsg] = useState("");

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

  async function handleImportCerfa(file: File) {
    setImporting(true);
    setImportMsg("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-cerfa", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");

      const data = json.data;
      setImportedData(data);

      // pré-remplit ce qu'on peut
      if (data.site1?.objet_mission) {
        setTitle(data.site1.objet_mission);
        setObjetMission(data.site1.objet_mission);
      } else if (data.site1?.adresse) {
        setTitle(`Mission · ${data.site1.adresse}`);
      }
      if (data.site1?.commanditaire) setCommanditaire(data.site1.commanditaire);

      // Préremplit aussi "Hauteur maximale de vol envisagée" / "Éloignement
      // maximal du télépilote" (les questions du type de mission) depuis la
      // zone 1 du Cerfa importé, si l'utilisateur n'a rien saisi lui-même :
      // évite de redemander une info déjà présente dans le fichier.
      setAnswers((prev) => ({
        ...prev,
        hauteur_max: prev.hauteur_max || data.site1?.hauteur_max_m || "",
        eloignement_max: prev.eloignement_max || data.site1?.eloignement_max_m || "",
      }));

      if (data.dates?.debut_date) setDateDebut(frToIso(data.dates.debut_date));
      if (data.dates?.debut_heure) setHeureDebut(`${data.dates.debut_heure}:${data.dates.debut_min || "00"}`);
      if (data.dates?.fin_date) setDateFin(frToIso(data.dates.fin_date));
      if (data.dates?.fin_heure) setHeureFin(`${data.dates.fin_heure}:${data.dates.fin_min || "00"}`);

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
        // importés") : c'est précisément ce qu'un Cerfa importé décrit.
        setExtraDrones((prev) => mergeDroneLists(prev, importedDrones));
        setCheckedDroneKeys(new Set(importedDrones.map(droneKey)));
      }
      // Pas besoin de réimporter un Cerfa à chaque mission juste pour le(s)
      // drone(s) : ils sont enregistrés une fois dans le profil et réutilisés
      // automatiquement pour toutes les missions (buildMissionData.ts). Si
      // aucun n'est trouvé ici (pas de Cerfa à importer, ou import qui ne
      // détecte rien), on le rappelle plutôt que de laisser croire qu'il n'y
      // a pas d'autre moyen de les renseigner.
      const droneHint =
        nbDrones === 0
          ? " Pas de Cerfa DroneKeeper sous la main ? Renseignez vos drones une fois dans votre profil, ils seront réutilisés pour toutes vos missions."
          : "";
      if (nbZones === 0) {
        const d = json.debug;
        const detail = d
          ? ` (${d.totalFields} champ(s) détecté(s), ${d.textFieldsWithValue} rempli(s), ${d.matched} reconnu(s), secours utilisé ${d.usedRawFallback} fois, ${d.bytesReceived} octets reçus)`
          : "";
        const w = json.warnings?.length ? ` ${json.warnings.join(" ")}` : "";
        setImportMsg(`Importé : 0 zone et ${nbDrones} drone(s) détectés.${detail}${w}${droneHint}`);
      } else {
        setImportMsg(
          `Importé : ${nbZones} zone(s) et ${nbDrones} drone(s) détectés. Ils seront ajoutés automatiquement à la mission (et à votre profil si vide).${droneHint}`
        );
      }
    } catch (e: any) {
      setImportMsg(`Erreur : ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!dateDebut || !dateFin) {
      setErrorMsg("Renseignez une date de début et une date de fin.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: mission, error } = await supabase
      .from("missions")
      .insert({
        user_id: user.id,
        mission_type: typeSlug,
        title,
        objet_mission: objetMission || title,
        commanditaire,
        answers,
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

    setSaving(false);
    router.push(`/missions/${mission.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-glass p-5">
        <h2 className="mb-1 font-medium text-ink">Imports optionnels</h2>
        <p className="mb-3 text-xs text-slate-500">
          Les deux sont indépendants, déposez ce que vous avez : le KML apporte la carte des zones (avec
          échelle) et calcule hauteur/éloignement, le Cerfa préremplit vos infos, vos drones et les dates.
        </p>
        <Coachmark
          id="import-optionnel-mission"
          text="Ni Cerfa ni KML sous la main ? Pas de problème : vous pourrez décrire votre zone de vol manuellement, avec juste une capture d'écran, une fois la mission créée."
          className="mb-3"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-2 block text-sm font-medium text-ink">Zones de vol (KML)</span>
            <FileDropzone
              label={kmlFile ? kmlFile.name : "Glisser le fichier KML ici, ou cliquer pour parcourir"}
              hint="Export des zones de vol (DroneKeeper ou autre)"
              accept=".kml"
              onFiles={(files) => handleSelectKml(files[0])}
            />
            <StatusMessage text={kmlMsg} />
            <a href="/tutoriel#pas-de-carte" target="_blank" className="mt-1 inline-block text-xs text-brand hover:underline">
              Pas de carte sous la main ?
            </a>
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-ink">Cerfa déjà rempli</span>
            <FileDropzone
              label="Glisser le Cerfa ici, ou cliquer pour parcourir"
              hint="Fichier PDF rempli (DroneKeeper ou autre)"
              accept="application/pdf"
              disabled={importing}
              onFiles={(files) => handleImportCerfa(files[0])}
            />
            {importing && <p className="mt-2 text-sm text-slate-500">Lecture du PDF...</p>}
            <StatusMessage text={importMsg} />
          </div>
        </div>
      </div>

      <div className="bg-glass p-5">
        <h2 className="mb-1 font-medium text-ink">Drones pour cette mission</h2>
        <p className="mb-3 text-xs text-slate-500">
          Coché par défaut : tous vos drones enregistrés. Décochez ceux qui ne volent pas sur cette
          mission-là.
        </p>
        <DroneChecklist drones={allDrones} checkedKeys={checkedDroneKeys} onToggle={toggleDrone} />
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
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">Titre de la mission</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex : Inspection toiture, Cabourg"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
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
      </div>

      {selectedType && selectedType.question_schema?.length > 0 && (
        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Quelques questions sur la mission</h2>
          <p className="mb-4 text-xs text-slate-500">
            Pas obligatoire ici : ces réponses restent modifiables plus tard, depuis la page de la
            mission une fois créée.
          </p>
          <div className="space-y-4">
            {selectedType.question_schema.map((q) => (
              <QuestionField
                key={q.key}
                question={q}
                value={answers[q.key]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))}
                hint={QUESTION_HINTS[q.key]}
              />
            ))}
          </div>
        </div>
      )}

      {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md border border-brand px-6 py-2.5 font-medium text-brand hover:bg-brand-light disabled:opacity-50"
      >
        {saving ? "Création..." : "Créer la mission"}
      </button>
    </form>
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

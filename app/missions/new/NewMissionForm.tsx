"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../../components/FileDropzone";

type Question = { key: string; label: string; type: "text" | "textarea" | "boolean" | "number" };
type MissionType = { slug: string; label: string; description: string; question_schema: Question[] };

function frToIso(dmy?: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
}

export default function NewMissionForm({ missionTypes }: { missionTypes: MissionType[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [typeSlug, setTypeSlug] = useState(missionTypes[0]?.slug || "");
  const [title, setTitle] = useState("");
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

  const selectedType = useMemo(() => missionTypes.find((t) => t.slug === typeSlug), [typeSlug, missionTypes]);

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
      if (data.site1?.objet_mission) setTitle(data.site1.objet_mission);
      else if (data.site1?.adresse) setTitle(`Mission · ${data.site1.adresse}`);

      if (data.dates?.debut_date) setDateDebut(frToIso(data.dates.debut_date));
      if (data.dates?.debut_heure) setHeureDebut(`${data.dates.debut_heure}:${data.dates.debut_min || "00"}`);
      if (data.dates?.fin_date) setDateFin(frToIso(data.dates.fin_date));
      if (data.dates?.fin_heure) setHeureFin(`${data.dates.fin_heure}:${data.dates.fin_min || "00"}`);

      if (data.regime?.sous_categorie_a1) setSousCategorie("a1");
      else if (data.regime?.sous_categorie_a2) setSousCategorie("a2");
      else if (data.regime?.sous_categorie_a3) setSousCategorie("a3");

      const nbZones = [data.site1, data.site2].filter(Boolean).length;
      const nbDrones = [1, 2, 3, 4, 5].filter((i) => data[`aeronef${i}`]?.constructeur).length;
      setImportMsg(
        `Importé : ${nbZones} zone(s) et ${nbDrones} drone(s) détectés. Ils seront ajoutés automatiquement à la mission (et à ton profil si vide).`
      );
    } catch (e: any) {
      setImportMsg(`Erreur : ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

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
      })
      .select()
      .single();

    if (error || !mission) {
      setSaving(false);
      setErrorMsg(error?.message || "Erreur inconnue");
      return;
    }

    // Jusqu'à 2 zones au total sur une mission. Le KML (plus précis : carte,
    // adresse géolocalisée, hauteur/éloignement calculés) passe en premier,
    // le Cerfa comble les emplacements restants s'il y en a.
    let slotsUsed = 0;

    if (kmlFile) {
      try {
        const body = new FormData();
        body.append("file", kmlFile);
        body.append("missionId", mission.id);
        const res = await fetch("/api/parse-kml", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erreur d'import KML");

        const toInsert = (json.zones || []).slice(0, 2).map((z: any, i: number) => ({
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
        }));
        if (toInsert.length > 0) {
          await supabase.from("zones").insert(toInsert);
          slotsUsed = toInsert.length;
        }
      } catch (e: any) {
        setKmlMsg(`Erreur d'import KML : ${e.message} (la mission a quand même été créée)`);
      }
    }

    // Zones importées depuis le Cerfa -> complètent les emplacements
    // restants (sans image, à compléter ensuite avec une capture de carte)
    if (importedData) {
      const zonesToInsert = [importedData.site1, importedData.site2]
        .filter(Boolean)
        .slice(0, Math.max(0, 2 - slotsUsed))
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
        await supabase.from("zones").insert(zonesToInsert);
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

    setSaving(false);
    router.push(`/missions/${mission.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-medium text-ink">Imports optionnels</h2>
        <p className="mb-3 text-xs text-slate-500">
          Les deux sont indépendants, dépose ce que tu as : le KML apporte la carte des zones (avec
          échelle) et calcule hauteur/éloignement, le Cerfa préremplit tes infos, tes drones et les dates.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-2 block text-sm font-medium text-ink">Zones de vol (KML)</span>
            <FileDropzone
              label={kmlFile ? kmlFile.name : "Glisser le fichier KML ici, ou cliquer pour parcourir"}
              hint="Export des zones de vol (DroneKeeper ou autre)"
              accept=".kml"
              onFiles={(files) => handleSelectKml(files[0])}
            />
            {kmlMsg && <p className="mt-2 text-sm text-brand">{kmlMsg}</p>}
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
            {importMsg && <p className="mt-2 text-sm text-brand">{importMsg}</p>}
          </div>
        </div>
      </div>

      <div className="border border-slate-200 bg-white p-5">
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
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">Sous-catégorie (catégorie ouverte)</span>
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

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Date de début</span>
            <input
              required
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Heure</span>
            <input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Date de fin</span>
            <input
              required
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Heure</span>
            <input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </div>

      {selectedType && selectedType.question_schema?.length > 0 && (
        <div className="border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-ink">Quelques questions sur la mission</h2>
          <div className="space-y-4">
            {selectedType.question_schema.map((q) => (
              <QuestionField
                key={q.key}
                question={q}
                value={answers[q.key]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))}
              />
            ))}
          </div>
        </div>
      )}

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

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
}: {
  question: Question;
  value: any;
  onChange: (v: any) => void;
}) {
  if (question.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {question.label}
      </label>
    );
  }
  if (question.type === "textarea") {
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">{question.label}</span>
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
      <span className="mb-1 block text-slate-600">{question.label}</span>
      <input
        type={question.type === "number" ? "number" : "text"}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FileDropzone from "../../components/FileDropzone";

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
};

// Champ numérique avec l'unité affichée en permanence dans la case (opacité
// réduite), pas juste dans le placeholder qui disparaît une fois rempli :
// sinon un "71" tout seul ne veut plus rien dire une fois la valeur saisie.
function NumberFieldWithUnit({
  placeholder,
  unit,
  value,
  onChange,
}: {
  placeholder: string;
  unit: string;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [savingEdit, setSavingEdit] = useState(false);

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
    });
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
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

  async function handleImportCerfa(file: File) {
    setImportingCerfa(true);
    setCerfaMsg("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/parse-cerfa", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur d'import");

      const slotsLeft = 2 - zones.length;
      const sites = [json.data.site1, json.data.site2].filter(Boolean).slice(0, slotsLeft);
      if (sites.length === 0) {
        setCerfaMsg(
          slotsLeft === 0
            ? "Déjà 2 zones sur cette mission, retire-en une avant d'en importer d'autres."
            : "Aucune zone trouvée dans ce Cerfa."
        );
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
      setCerfaMsg(
        imported > 0
          ? `${imported} zone(s) importée(s) depuis le Cerfa. Pense à ajouter une carte (via KML ou une capture) si besoin.`
          : `Aucune zone importée.${lastError ? ` Erreur : ${lastError}` : ""}`
      );
    } catch (e: any) {
      setCerfaMsg(`Erreur : ${e.message}`);
    } finally {
      setImportingCerfa(false);
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

      const slotsLeft = 2 - zones.length;
      const toImport = json.zones.slice(0, slotsLeft);
      if (toImport.length === 0) {
        setKmlMsg("Déjà 2 zones sur cette mission, retire-en une avant d'en importer d'autres.");
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
          ? `${imported} zone(s) importée(s) depuis le KML. Vérifie l'adresse, la hauteur et l'éloignement avant de générer le dossier.${warnings}`
          : `Aucune zone importée.${lastError ? ` Erreur : ${lastError}` : ""}${warnings}`
      );
    } catch (e: any) {
      setKmlMsg(`Erreur : ${e.message}`);
    } finally {
      setImportingKml(false);
    }
  }

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    if (zones.length >= 2) return;
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
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (editingId === id) setEditingId(null);
    router.refresh();
  }

  return (
    <div id="zones-de-vol" className="scroll-mt-4 border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-ink">Zones de vol</h2>
      <p className="mb-4 text-xs text-slate-400">
        Jusqu'à 2 zones pour l'instant (le formulaire officiel en prévoit 2 avant annexe, bientôt disponible).
      </p>

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
                />
                <NumberFieldWithUnit
                  placeholder="Hauteur max"
                  unit="m"
                  value={editForm.hauteur_max_m}
                  onChange={(v) => setEditForm((f) => ({ ...f, hauteur_max_m: v }))}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.en_agglomeration}
                  onChange={(e) => setEditForm((f) => ({ ...f, en_agglomeration: e.target.checked }))}
                />
                En agglomération
              </label>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.rassemblement}
                  onChange={(e) => setEditForm((f) => ({ ...f, rassemblement: e.target.checked }))}
                />
                À proximité d'un rassemblement de personnes
              </label>
              <textarea
                placeholder="Consignes de sécurité / notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
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
              className="scroll-mt-4 flex items-center justify-between border-l-2 border-brand bg-slate-50 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{z.title || z.adresse}</p>
                <p className="text-slate-500">
                  {z.adresse} {z.code_postal} {z.localite}
                </p>
                <p className="text-xs text-slate-400">
                  {z.hauteur_max_m != null ? `Hauteur max ${z.hauteur_max_m} m` : "Hauteur max non renseignée"} ·{" "}
                  {z.distance_max_m != null ? `Éloignement max ${z.distance_max_m} m` : "Éloignement max non renseigné"}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button onClick={() => startEdit(z)} className="text-brand hover:underline">
                  Modifier
                </button>
                <button onClick={() => removeZone(z.id)} className="text-red-500 hover:underline">
                  Retirer
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {zones.length < 2 && (
        <div className="mb-5 border-t border-slate-100 pt-4">
          <span className="mb-2 block text-sm font-medium text-ink">Importer</span>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs text-slate-500">Cerfa déjà rempli</span>
              <FileDropzone
                label="Glisser le Cerfa ici, ou cliquer pour parcourir"
                hint="PDF rempli (DroneKeeper ou autre)"
                accept="application/pdf"
                disabled={importingCerfa}
                onFiles={(files) => handleImportCerfa(files[0])}
              />
              {importingCerfa && <p className="mt-2 text-sm text-slate-500">Lecture du PDF...</p>}
              {cerfaMsg && <p className="mt-2 text-sm text-brand">{cerfaMsg}</p>}
            </div>
            <div>
              <span className="mb-1 block text-xs text-slate-500">Fichier KML</span>
              <FileDropzone
                label="Glisser le fichier KML ici, ou cliquer pour parcourir"
                hint="Export des zones de vol (DroneKeeper ou autre), avec carte et échelle générées"
                accept=".kml"
                disabled={importingKml}
                onFiles={(files) => handleImportKml(files[0])}
              />
              {importingKml && <p className="mt-2 text-sm text-slate-500">Lecture et géolocalisation en cours...</p>}
              {kmlMsg && <p className="mt-2 text-sm text-brand">{kmlMsg}</p>}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Les deux remplissent l'adresse et la localité. Seul le KML calcule automatiquement la hauteur,
            l'éloignement et génère une carte avec échelle.
          </p>
        </div>
      )}

      {zones.length < 2 && (
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
            />
            <NumberFieldWithUnit
              placeholder="Hauteur max"
              unit="m"
              value={form.hauteur_max_m}
              onChange={(v) => setForm((f) => ({ ...f, hauteur_max_m: v }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.en_agglomeration}
              onChange={(e) => setForm((f) => ({ ...f, en_agglomeration: e.target.checked }))}
            />
            En agglomération
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.rassemblement}
              onChange={(e) => setForm((f) => ({ ...f, rassemblement: e.target.checked }))}
            />
            À proximité d'un rassemblement de personnes
          </label>
          <textarea
            placeholder="Consignes de sécurité / notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div>
            <span className="mb-1 block text-sm text-slate-600">
              Capture(s) de la zone, si tu n'as pas de KML (carte, Google Maps, DroneKeeper...)
            </span>
            <FileDropzone
              label={files.length > 0 ? `${files.length} image(s) sélectionnée(s)` : "Glisser les images ici, ou cliquer pour parcourir"}
              hint="Carte, capture d'écran ou export de zone de vol"
              accept="image/*"
              multiple
              onFiles={(f) => setFiles(f)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light disabled:opacity-50"
          >
            {saving ? "Ajout..." : "+ Ajouter la zone"}
          </button>
        </form>
      )}
    </div>
  );
}

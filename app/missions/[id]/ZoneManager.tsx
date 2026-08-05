"use client";

import { useState } from "react";
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

export default function ZoneManager({ missionId, initialZones }: { missionId: string; initialZones: Zone[] }) {
  const supabase = createClient();
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

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
    }
  }

  async function removeZone(id: string) {
    await supabase.from("zones").delete().eq("id", id);
    setZones((prev) => prev.filter((z) => z.id !== id));
  }

  return (
    <div className="border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-medium text-ink">Zones de vol</h2>
      <p className="mb-4 text-xs text-slate-400">
        Jusqu'à 2 zones pour l'instant (le formulaire officiel en prévoit 2 avant annexe, bientôt disponible).
      </p>

      <div className="mb-4 space-y-3">
        {zones.map((z) => (
          <div key={z.id} className="flex items-center justify-between border-l-2 border-brand bg-slate-50 p-3 text-sm">
            <div>
              <p className="font-medium">{z.title || z.adresse}</p>
              <p className="text-slate-500">
                {z.adresse} {z.code_postal} {z.localite}
              </p>
            </div>
            <button onClick={() => removeZone(z.id)} className="text-red-500 hover:underline">
              Retirer
            </button>
          </div>
        ))}
      </div>

      {zones.length < 2 && (
        <form onSubmit={addZone} className="space-y-3 border-t border-slate-100 pt-4">
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
            <input
              placeholder="Distance max (m)"
              type="number"
              value={form.distance_max_m}
              onChange={(e) => setForm((f) => ({ ...f, distance_max_m: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Hauteur max (m)"
              type="number"
              value={form.hauteur_max_m}
              onChange={(e) => setForm((f) => ({ ...f, hauteur_max_m: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              Capture(s) de la zone (carte, Google Maps, DroneKeeper...)
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

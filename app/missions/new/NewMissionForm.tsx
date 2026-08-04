"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Question = { key: string; label: string; type: "text" | "textarea" | "boolean" | "number" };
type MissionType = { slug: string; label: string; description: string; question_schema: Question[] };

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

  const selectedType = useMemo(() => missionTypes.find((t) => t.slug === typeSlug), [typeSlug, missionTypes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
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

    setSaving(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    router.push(`/missions/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
            placeholder="ex: Inspection toiture — Cabourg"
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-medium">Quelques questions sur la mission</h2>
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
        className="rounded-lg bg-brand px-6 py-2.5 font-medium text-white shadow hover:bg-brand-dark disabled:opacity-50"
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

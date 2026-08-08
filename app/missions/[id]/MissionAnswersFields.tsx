"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FieldHint from "../../components/FieldHint";
import AutoTextarea from "../../components/AutoTextarea";
import { Question, QUESTION_HINTS } from "@/lib/missionQuestions";

// Avant, ces questions n'étaient posées qu'à la création de la mission
// (NewMissionForm.tsx) : une fois la mission créée, impossible d'y revenir
// pour les compléter ou les corriger. Ce composant reprend les mêmes
// questions (même schéma, même aide) directement sur la page de la mission,
// avec sauvegarde automatique au blur/changement, comme MissionDetailsFields.
export default function MissionAnswersFields({
  missionId,
  questionSchema,
  initialAnswers,
}: {
  missionId: string;
  questionSchema: Question[];
  initialAnswers: Record<string, any> | null;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function persist(next: Record<string, any>) {
    setSaving(true);
    const { error } = await supabase.from("missions").update({ answers: next }).eq("id", missionId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function setValue(key: string, value: any) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  if (questionSchema.length === 0) return null;

  return (
    <div className="mt-6 bg-glass p-5">
      <h2 className="mb-4 font-medium text-ink">Quelques questions sur la mission</h2>
      <div className="space-y-4">
        {questionSchema.map((q) => (
          <QuestionField
            key={q.key}
            question={q}
            value={answers[q.key]}
            hint={QUESTION_HINTS[q.key]}
            onChange={(v) => setValue(q.key, v)}
            onCommit={() => persist({ ...answers, [q.key]: answers[q.key] })}
          />
        ))}
      </div>
      {saving && <p className="mt-2 text-xs text-slate-500">Enregistrement...</p>}
      {saved && <p className="mt-2 text-xs text-brand">Enregistré ✓</p>}
    </div>
  );
}

function QuestionField({
  question,
  value,
  hint,
  onChange,
  onCommit,
}: {
  question: Question;
  value: any;
  hint?: string;
  onChange: (v: any) => void;
  onCommit: () => void;
}) {
  if (question.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            onChange(e.target.checked);
            // Pas de onBlur significatif sur une checkbox : on enregistre au
            // prochain tick, une fois l'état local mis à jour.
            setTimeout(onCommit, 0);
          }}
        />
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
        <AutoTextarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
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
        onBlur={onCommit}
        className="w-full rounded-md border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

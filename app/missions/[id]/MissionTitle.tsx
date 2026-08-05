"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MissionTitle({ missionId, initialTitle }: { missionId: string; initialTitle: string }) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === initialTitle) {
      setTitle(initialTitle);
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("missions").update({ title: trimmed }).eq("id", missionId);
    setSaving(false);
    setEditing(false);
    if (error) {
      setTitle(initialTitle);
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            setTitle(initialTitle);
            setEditing(false);
          }
        }}
        disabled={saving}
        className="mb-1 w-full border-b-2 border-brand bg-transparent text-2xl font-medium text-ink focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="group mb-1 flex items-center gap-2 text-left"
      title="Modifier le titre de la mission"
    >
      <h1 className="text-2xl font-medium text-ink">{title}</h1>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-brand"
      >
        <path d="M12 20h9" strokeLinecap="round" />
        <path
          d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

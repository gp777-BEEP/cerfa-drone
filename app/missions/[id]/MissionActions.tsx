"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MissionActions({
  missionId,
  title,
  initialArchived,
}: {
  missionId: string;
  title: string;
  initialArchived: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [archived, setArchived] = useState(initialArchived);
  const [deleting, setDeleting] = useState(false);

  async function toggleArchive() {
    setArchived((a) => !a);
    await supabase.from("missions").update({ archived: !archived }).eq("id", missionId);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement la mission "${title}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    await supabase.from("missions").delete().eq("id", missionId);
    router.push("/dashboard");
  }

  return (
    <div className="mb-4 flex items-center gap-4 text-sm">
      <button onClick={toggleArchive} className="text-slate-500 hover:text-brand hover:underline">
        {archived ? "Désarchiver la mission" : "Archiver la mission"}
      </button>
      <button onClick={handleDelete} disabled={deleting} className="text-slate-500 hover:text-red-600 hover:underline">
        {deleting ? "Suppression..." : "Supprimer la mission"}
      </button>
    </div>
  );
}

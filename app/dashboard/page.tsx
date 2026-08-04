import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./SignOutButton";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prête",
  dossier_genere: "Dossier généré",
};

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: missions } = await supabase
    .from("missions")
    .select("id, title, mission_type, status, date_debut, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand">Mes missions</h1>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="text-sm text-slate-500 hover:text-brand">
            Mon profil
          </Link>
          <SignOutButton />
        </div>
      </div>

      <Link
        href="/missions/new"
        className="mb-6 inline-block rounded-lg bg-brand px-5 py-2.5 font-medium text-white shadow hover:bg-brand-dark"
      >
        + Nouvelle mission
      </Link>

      <div className="space-y-3">
        {(missions || []).length === 0 && (
          <p className="text-slate-500">Aucune mission pour l'instant. Crée la première !</p>
        )}
        {(missions || []).map((m) => (
          <Link
            key={m.id}
            href={`/missions/${m.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-brand"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{m.title}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {STATUS_LABEL[m.status] || m.status}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {m.mission_type} {m.date_debut ? `— ${m.date_debut}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

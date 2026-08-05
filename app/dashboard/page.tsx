import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppHeader from "../components/AppHeader";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prête",
  dossier_genere: "Dossier généré",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "border-slate-300 text-slate-400",
  ready: "border-amber-400 text-amber-700",
  dossier_genere: "border-brand text-brand",
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

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-medium text-ink">Mes missions</h1>
          <Link
            href="/missions/new"
            className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light"
          >
            + Nouvelle mission
          </Link>
        </div>

        {!profile?.full_name && (
          <div className="mb-6 border-l-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-800">
            Ton profil (nom, adresse, drones) n'est pas encore rempli — ces infos sont nécessaires pour générer
            un Cerfa complet.{" "}
            <Link href="/profile" className="font-medium underline">
              Le compléter maintenant
            </Link>
            {" "}(ou importe un Cerfa déjà rempli lors de la création d'une mission, ça le remplira automatiquement).
          </div>
        )}

        <div className="divide-y divide-slate-200 border border-slate-200">
          {(missions || []).length === 0 && (
            <p className="p-6 text-sm text-slate-500">Aucune mission pour l'instant. Crée la première !</p>
          )}
          {(missions || []).map((m) => (
            <Link
              key={m.id}
              href={`/missions/${m.id}`}
              className={`flex items-center justify-between border-l-2 bg-white px-5 py-3.5 hover:bg-slate-50 ${
                STATUS_COLOR[m.status]?.split(" ")[0] || "border-slate-300"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-slate-500">
                  {m.mission_type} {m.date_debut ? `— ${m.date_debut}` : ""}
                </p>
              </div>
              <span className={`text-xs font-medium ${STATUS_COLOR[m.status]?.split(" ")[1] || "text-slate-400"}`}>
                {STATUS_LABEL[m.status] || m.status}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

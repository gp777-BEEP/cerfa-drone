import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppHeader from "../components/AppHeader";
import MissionList from "./MissionList";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: missions } = await supabase
    .from("missions")
    .select("id, title, mission_type, status, date_debut, created_at, archived")
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
            Ton profil (nom, adresse, drones) n'est pas encore rempli. Ces infos sont nécessaires pour générer
            un Cerfa complet.{" "}
            <Link href="/profile" className="font-medium underline">
              Le compléter maintenant
            </Link>
            {" "}(ou importe un Cerfa déjà rempli lors de la création d'une mission, ça le remplira automatiquement).
          </div>
        )}

        <MissionList initialMissions={missions || []} />
      </main>
    </>
  );
}

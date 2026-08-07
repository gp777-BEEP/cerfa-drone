import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppHeader from "../components/AppHeader";
import MissionList from "./MissionList";
import Coachmark from "../components/Coachmark";
import { WarningBanner } from "../components/Banner";
import NewMissionLink from "./NewMissionLink";

export default async function Dashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: missions } = await supabase
    .from("missions")
    .select("id, title, mission_type, status, date_debut, created_at, archived")
    // Trié par date de vol (les missions à venir en premier) plutôt que par
    // date de création : plus utile pour se repérer dans un planning de vol.
    // Les missions sans date (pas encore renseignée) restent en bas.
    .order("date_debut", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  // Dernier dossier généré par mission (pour l'aperçu au clic sur le statut
  // "Dossier généré" dans la liste), une seule requête groupée plutôt qu'une
  // par mission.
  const missionIds = (missions || []).map((m) => m.id);
  const latestDocByMission: Record<string, string> = {};
  if (missionIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("mission_id, file_path, created_at")
      .in("mission_id", missionIds)
      .order("created_at", { ascending: false });
    for (const d of docs || []) {
      if (!latestDocByMission[d.mission_id]) latestDocByMission[d.mission_id] = d.file_path;
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-medium text-ink">Mes missions</h1>
          <NewMissionLink />
        </div>

        {(missions || []).length === 0 && (
          <Coachmark
            id="dashboard-premiere-mission"
            text="Nouveau ici ? Créez votre première mission avec le bouton ci-dessus : le Cerfa, les zones et les drones se remplissent au fur et à mesure, avec des astuces qui apparaissent au bon moment."
            linkHref="/tutoriel"
            linkLabel="Voir le guide complet"
            className="mb-6"
          />
        )}

        {!profile?.full_name && (
          <WarningBanner className="mb-6">
            Votre profil (nom, adresse, drones) n'est pas encore rempli. Ces infos sont nécessaires pour générer
            un Cerfa complet.{" "}
            <Link href="/profile" className="font-medium underline">
              Le compléter maintenant
            </Link>
            .
          </WarningBanner>
        )}

        <MissionList
          initialMissions={missions || []}
          emptyProfile={!profile?.full_name}
          latestDocByMission={latestDocByMission}
        />
      </main>
    </>
  );
}

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

  const missionsList = missions || [];
  const dossiersCount = Object.keys(latestDocByMission).length;
  const today = new Date().toISOString().slice(0, 10);
  const prochaine = missionsList.find((m) => m.date_debut && m.date_debut >= today && !m.archived);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* 1. Résumé rapide : vue d'ensemble en un coup d'œil, avant même la
            liste détaillée -- retour bêta-testeur : une page d'accueil plutôt
            qu'une liste brute dès l'arrivée. */}
        <div className="mb-6">
          <h1 className="mb-3 text-2xl font-medium text-ink">Bonjour{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-glass p-4 text-center">
              <div className="text-2xl font-semibold text-brand">{missionsList.length}</div>
              <div className="mt-1 text-xs text-slate-500">Mission{missionsList.length > 1 ? "s" : ""}</div>
            </div>
            <div className="bg-glass p-4 text-center">
              <div className="text-2xl font-semibold text-brand">{dossiersCount}</div>
              <div className="mt-1 text-xs text-slate-500">Dossier{dossiersCount > 1 ? "s" : ""} généré{dossiersCount > 1 ? "s" : ""}</div>
            </div>
            <div className="bg-glass p-4 text-center">
              <div className="text-sm font-medium text-ink">
                {prochaine
                  ? new Date(prochaine.date_debut + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                  : "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">Prochain vol</div>
            </div>
          </div>
        </div>

        {/* 2. Actions rapides */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <NewMissionLink />
          {!profile?.full_name && (
            <Link href="/profile" className="text-sm font-medium text-brand hover:underline">
              Compléter mon profil →
            </Link>
          )}
          <Link href="/tutoriel" className="text-sm text-slate-400 hover:text-brand hover:underline">
            Voir le tutoriel →
          </Link>
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

        {/* 3. Liste des missions */}
        <h2 className="mb-3 text-lg font-medium text-ink">Mes missions</h2>
        <MissionList
          initialMissions={missionsList}
          emptyProfile={!profile?.full_name}
          latestDocByMission={latestDocByMission}
        />
      </main>
    </>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ZoneManager from "./ZoneManager";
import GenerateButton from "./GenerateButton";
import MissionTitle from "./MissionTitle";
import MissionDetailsFields from "./MissionDetailsFields";
import MissionAnswersFields from "./MissionAnswersFields";
import MissionDatesFields from "./MissionDatesFields";
import MissionActions from "./MissionActions";
import DocumentsList from "./DocumentsList";
import MissionDrones from "./MissionDrones";
import MissionProgressBar from "./MissionProgressBar";
import AppHeader from "../../components/AppHeader";
import { WarningBanner } from "../../components/Banner";

export default async function MissionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: mission } = await supabase.from("missions").select("*").eq("id", params.id).single();
  if (!mission) notFound();

  const { data: zones } = await supabase
    .from("zones")
    .select("*")
    .eq("mission_id", params.id)
    .order("order_index", { ascending: true });

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("mission_id", params.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: missionType } = await supabase
    .from("mission_types")
    .select("question_schema")
    .eq("slug", mission.mission_type)
    .single();

  const missingItems: { label: string; href: string }[] = [];
  if (!profile?.full_name) missingItems.push({ label: "Votre nom", href: "/profile" });
  if (!profile?.address) missingItems.push({ label: "Votre adresse", href: "/profile" });
  const hasProfileDrones = (profile?.drones || []).filter((d: any) => d?.constructeur).length > 0;
  const hasMissionDrones = (mission.drones || []).filter((d: any) => d?.constructeur).length > 0;
  if (!hasProfileDrones && !hasMissionDrones) {
    missingItems.push({ label: "Au moins un drone", href: "/profile" });
  }
  const zonesList = zones || [];
  if (zonesList.length === 0) {
    missingItems.push({ label: "Au moins une zone de vol", href: "#zones-de-vol" });
  } else {
    zonesList.forEach((z, i) => {
      const label = z.title || z.adresse || `Zone ${i + 1}`;
      const href = `#zone-${z.id}`;
      if (!z.adresse) missingItems.push({ label: `Adresse de la zone "${label}"`, href });
      if (z.hauteur_max_m === null || z.hauteur_max_m === undefined)
        missingItems.push({ label: `Hauteur max de la zone "${label}"`, href });
      if (z.distance_max_m === null || z.distance_max_m === undefined)
        missingItems.push({ label: `Éloignement max de la zone "${label}"`, href });
    });
  }

  const datesOk = !!mission.date_debut && !!mission.date_fin;
  const zonesOk =
    zonesList.length > 0 &&
    zonesList.every((z) => z.adresse && z.hauteur_max_m !== null && z.hauteur_max_m !== undefined && z.distance_max_m !== null && z.distance_max_m !== undefined);
  const dronesOk = hasProfileDrones || hasMissionDrones;
  const generationOk = (documents || []).length > 0;

  const progressSteps = [
    { id: "infos-dates", label: "Infos", done: datesOk },
    { id: "zones-de-vol", label: "Zones", done: zonesOk },
    { id: "drones", label: "Drones", done: dronesOk },
    { id: "generation", label: "Génération", done: generationOk },
  ];

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand">
          ← Retour aux missions
        </Link>
        <MissionTitle missionId={mission.id} initialTitle={mission.title} />
        <MissionActions missionId={mission.id} title={mission.title} initialArchived={!!mission.archived} />

        <MissionProgressBar steps={progressSteps} />

        <div id="infos-dates" className="scroll-mt-32">
          <MissionDatesFields
            missionId={mission.id}
            initialDateDebut={mission.date_debut}
            initialHeureDebut={mission.heure_debut}
            initialDateFin={mission.date_fin}
            initialHeureFin={mission.heure_fin}
          />

          <MissionDetailsFields
            missionId={mission.id}
            initialObjetMission={mission.objet_mission}
            initialCommanditaire={mission.commanditaire}
          />

          <MissionAnswersFields
            missionId={mission.id}
            questionSchema={missionType?.question_schema || []}
            initialAnswers={mission.answers}
          />
        </div>

        <ZoneManager missionId={mission.id} initialZones={zones || []} />

        <div id="drones" className="mt-6 scroll-mt-32 bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Drones utilisés</h2>
          <p className="mb-3 text-xs text-slate-400">
            Réutilisés depuis votre profil, ou détectés à l'import d'un Cerfa pour cette mission.
          </p>
          <MissionDrones missionId={mission.id} profileDrones={profile?.drones || []} initialSelected={mission.drones} />
        </div>

        <div id="generation" className="mt-6 scroll-mt-32 bg-glass p-5">
          <h2 className="mb-3 font-medium text-ink">Générer le dossier</h2>

          {missingItems.length > 0 && (
            <WarningBanner className="mb-4">
              <p className="mb-1 font-medium">Il manque des informations pour un dossier complet :</p>
              <ul className="ml-4 list-disc">
                {missingItems.map((item, i) => (
                  <li key={i}>
                    <a href={item.href} className="underline hover:text-amber-100">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs opacity-80">
                Vous pouvez quand même générer maintenant, mais la préfecture risque de vous demander de compléter.
              </p>
            </WarningBanner>
          )}

          <GenerateButton missionId={mission.id} />
          <DocumentsList documents={documents || []} />
        </div>
      </main>
    </>
  );
}

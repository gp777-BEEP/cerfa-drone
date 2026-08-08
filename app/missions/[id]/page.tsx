import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ZoneManager from "./ZoneManager";
import GenerateAndSendFlow from "./GenerateAndSendFlow";
import MissionTitle from "./MissionTitle";
import MissionDetailsFields from "./MissionDetailsFields";
import MissionAnswersFields from "./MissionAnswersFields";
import MissionDatesFields from "./MissionDatesFields";
import MissionActions from "./MissionActions";
import DocumentsList from "./DocumentsList";
import MissionDrones from "./MissionDrones";
import MissionPilots from "./MissionPilots";
import MissionSectionsLayout from "./MissionSectionsLayout";
import type { Pilot } from "@/lib/pilots";
import { EMPTY_PILOT } from "@/lib/pilots";

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

  const missingItems: { label: string; href: string; sectionId?: string }[] = [];
  if (!profile?.full_name) missingItems.push({ label: "Votre nom", href: "/profile" });
  if (!profile?.address) missingItems.push({ label: "Votre adresse", href: "/profile" });
  const hasProfileDrones = (profile?.drones || []).filter((d: any) => d?.constructeur).length > 0;
  const hasMissionDrones = (mission.drones || []).filter((d: any) => d?.constructeur).length > 0;
  if (!hasProfileDrones && !hasMissionDrones) {
    missingItems.push({ label: "Au moins un drone", href: "/profile" });
  }
  const zonesList = zones || [];
  if (zonesList.length === 0) {
    missingItems.push({ label: "Au moins une zone de vol", href: "#zones-de-vol", sectionId: "zones" });
  } else {
    zonesList.forEach((z, i) => {
      const label = z.title || z.adresse || `Zone ${i + 1}`;
      const href = `#zone-${z.id}`;
      if (!z.adresse) missingItems.push({ label: `Adresse de la zone "${label}"`, href, sectionId: "zones" });
      if (z.hauteur_max_m === null || z.hauteur_max_m === undefined)
        missingItems.push({ label: `Hauteur max de la zone "${label}"`, href, sectionId: "zones" });
      if (z.distance_max_m === null || z.distance_max_m === undefined)
        missingItems.push({ label: `Éloignement max de la zone "${label}"`, href, sectionId: "zones" });
    });
  }

  // Télépilote 1 par défaut = le profil connecté (même logique de repli que
  // buildMissionData.ts côté génération du PDF, pour que ce qu'on voit dans
  // l'onglet "Pilotes" corresponde à ce qui sera réellement utilisé tant
  // qu'on n'a rien ajouté/modifié soi-même).
  //
  // Exception (continuité exploitant/pilotes) : si le profil a indiqué ne
  // pas être lui-même télépilote (dirigeant d'une société qui ne vole pas),
  // on ne le propose plus par défaut -- la liste démarre vide, pour inviter
  // à ajouter directement les vrais pilotes.
  const profileIsPilot = profile?.est_telepilote !== false;
  const profileAsPilot: Pilot = profileIsPilot
    ? {
        nom: profile?.last_name || (profile?.full_name || "").trim().split(/\s+/).slice(1).join(" ") || "",
        prenom: profile?.first_name || (profile?.full_name || "").trim().split(/\s+/)[0] || "",
        date_naissance: profile?.date_naissance || "",
        lieu_naissance: profile?.lieu_naissance || "",
        adresse: profile?.address || "",
        statut: "independant",
        telephone_portable: profile?.phone || "",
        courriel: profile?.email || "",
      }
    : { ...EMPTY_PILOT };

  const datesOk = !!mission.date_debut && !!mission.date_fin;
  const zonesOk =
    zonesList.length > 0 &&
    zonesList.every((z) => z.adresse && z.hauteur_max_m !== null && z.hauteur_max_m !== undefined && z.distance_max_m !== null && z.distance_max_m !== undefined);
  const dronesOk = hasProfileDrones || hasMissionDrones;
  const generationOk = (documents || []).length > 0;

  const sections = [
    {
      id: "infos",
      label: "Infos",
      done: datesOk,
      content: (
        <div className="space-y-4">
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
      ),
    },
    {
      id: "zones",
      label: "Zones",
      done: zonesOk,
      content: <ZoneManager missionId={mission.id} initialZones={zones || []} />,
    },
    {
      id: "drones",
      label: "Drones",
      done: dronesOk,
      content: (
        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Drones utilisés</h2>
          <p className="mb-3 text-xs text-slate-400">
            Réutilisés depuis votre profil, ou détectés à l'import d'un Cerfa pour cette mission.
          </p>
          <MissionDrones missionId={mission.id} profileDrones={profile?.drones || []} initialSelected={mission.drones} />
        </div>
      ),
    },
    {
      id: "pilotes",
      label: "Pilotes",
      done: true, // facultatif : le télépilote 1 (vous) suffit, ce n'est jamais bloquant
      content: (
        <div className="bg-glass p-5">
          <h2 className="mb-1 font-medium text-ink">Télépilotes déclarés</h2>
          <p className="mb-3 text-xs text-slate-400">
            {profileIsPilot
              ? "Jusqu'à 4 télépilotes pour cette mission (case n°2 du Cerfa). Vous êtes ajouté par défaut ; ajoutez-en d'autres à la main ou importez le fichier partagé par un collègue."
              : "Jusqu'à 4 télépilotes pour cette mission (case n°2 du Cerfa). Votre profil indique que vous n'êtes pas vous-même télépilote : ajoutez directement les pilotes concernés, à la main ou en important le fichier qu'ils vous ont partagé."}
          </p>
          <MissionPilots missionId={mission.id} profileAsPilot={profileAsPilot} initialPilots={mission.pilots} />
        </div>
      ),
    },
    {
      id: "generation",
      label: "Génération",
      done: generationOk,
      content: (
        <div className="bg-glass p-5">
          <h2 className="mb-3 font-medium text-ink">Générer et envoyer le dossier</h2>

          <GenerateAndSendFlow
            missionId={mission.id}
            hasExistingDocument={(documents || []).length > 0}
            missionTitle={mission.title}
            dateDebut={mission.date_debut}
            dateFin={mission.date_fin}
            pilotName={profile?.exploitant_type === "morale" ? profile?.raison_sociale : profile?.full_name}
            zones={zonesList}
          />

          <div className="mt-5 border-t border-white/10 pt-4">
            <DocumentsList documents={documents || []} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand">
          ← Retour aux missions
        </Link>
        <MissionTitle missionId={mission.id} initialTitle={mission.title} />
        <MissionActions missionId={mission.id} title={mission.title} initialArchived={!!mission.archived} />

        <MissionSectionsLayout sections={sections} missingItems={missingItems} />
      </main>
    </>
  );
}

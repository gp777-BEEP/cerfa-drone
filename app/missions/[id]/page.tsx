import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ZoneManager from "./ZoneManager";
import GenerateButton from "./GenerateButton";
import MissionTitle from "./MissionTitle";
import MissionActions from "./MissionActions";
import AppHeader from "../../components/AppHeader";

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

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <MissionTitle missionId={mission.id} initialTitle={mission.title} />
        <MissionActions missionId={mission.id} title={mission.title} initialArchived={!!mission.archived} />
        <p className="mb-6 text-sm text-slate-500">
          {mission.date_debut} {mission.heure_debut} → {mission.date_fin} {mission.heure_fin}
        </p>

        <ZoneManager missionId={mission.id} initialZones={zones || []} />

        <div className="mt-8 border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-medium text-ink">Générer le dossier</h2>
          <GenerateButton missionId={mission.id} />
          {(documents || []).length > 0 && (
            <div className="mt-4 space-y-1 text-sm">
              <p className="text-slate-500">Dossiers déjà générés :</p>
              {documents!.map((d) => (
                <p key={d.id} className="text-slate-400">
                  {new Date(d.created_at).toLocaleString("fr-FR")}
                </p>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

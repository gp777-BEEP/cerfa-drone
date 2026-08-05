import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import ZoneManager from "./ZoneManager";
import GenerateButton from "./GenerateButton";
import MissionTitle from "./MissionTitle";
import MissionActions from "./MissionActions";
import DocumentsList from "./DocumentsList";
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

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const missingItems: { label: string; href: string }[] = [];
  if (!profile?.full_name) missingItems.push({ label: "Ton nom", href: "/profile" });
  if (!profile?.address) missingItems.push({ label: "Ton adresse", href: "/profile" });
  if (!profile?.drones || profile.drones.filter((d: any) => d?.constructeur).length === 0) {
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

          {missingItems.length > 0 && (
            <div className="mb-4 border-l-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="mb-1 font-medium">Il manque des informations pour un dossier complet :</p>
              <ul className="ml-4 list-disc">
                {missingItems.map((item, i) => (
                  <li key={i}>
                    <a href={item.href} className="underline hover:text-amber-950">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">
                Tu peux quand même générer maintenant, mais la préfecture risque de te demander de compléter.
              </p>
            </div>
          )}

          <GenerateButton missionId={mission.id} />
          <DocumentsList documents={documents || []} />
        </div>
      </main>
    </>
  );
}

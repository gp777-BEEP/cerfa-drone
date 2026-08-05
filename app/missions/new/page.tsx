import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewMissionForm from "./NewMissionForm";
import AppHeader from "../../components/AppHeader";

export default async function NewMissionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: missionTypes } = await supabase
    .from("mission_types")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-medium text-ink">Nouvelle mission</h1>
        <NewMissionForm missionTypes={missionTypes || []} />
      </main>
    </>
  );
}

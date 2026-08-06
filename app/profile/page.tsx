import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import AppHeader from "../components/AppHeader";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-medium text-ink">Votre profil</h1>
        <p className="mb-6 text-sm text-slate-500">
          Ces informations (vous + vos drones) sont réutilisées automatiquement dans chaque
          dossier que vous générez.
        </p>
        <ProfileForm initialProfile={profile} />
      </main>
    </>
  );
}

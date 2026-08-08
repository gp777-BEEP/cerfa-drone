import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Aperçu du logo déjà enregistré (bucket privé "logos" -> URL signée,
  // comme pour les dossiers déjà générés dans DocumentsList).
  let logoSignedUrl: string | null = null;
  if (profile?.logo_path) {
    const { data } = await supabase.storage.from("logos").createSignedUrl(profile.logo_path, 3600);
    logoSignedUrl = data?.signedUrl || null;
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-medium text-ink">Votre profil</h1>
        <p className="mb-6 text-sm text-slate-500">
          Ces informations (vous + vos drones) sont réutilisées automatiquement dans chaque
          dossier que vous générez.
        </p>
        <ProfileForm initialProfile={{ ...profile, logo_signed_url: logoSignedUrl }} />
      </main>
    </>
  );
}

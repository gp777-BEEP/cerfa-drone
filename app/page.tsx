import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-brand">Cerfa Drone</h1>
      <p className="max-w-xl text-lg text-slate-600">
        Génère automatiquement ton dossier de déclaration préfectorale de vol de drone : le
        Cerfa 15476*04 rempli et tes fiches de zones de vol, prêts à envoyer.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-brand px-6 py-3 font-medium text-white shadow hover:bg-brand-dark"
      >
        Commencer gratuitement
      </Link>
    </main>
  );
}

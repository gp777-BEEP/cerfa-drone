import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppHeader from "../components/AppHeader";

// Nouvelle page d'accueil post-connexion (demandée par le fondateur) : un
// vrai atterrissage pédagogique en 3 points avant la liste des missions
// (qui reste sur /dashboard, inchangée), plutôt que de tomber directement
// sur une liste vide la première fois.
export default async function AccueilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-medium text-ink">
          Bienvenue{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mb-8 text-sm text-slate-500">Trois choses à savoir avant de commencer.</p>

        <div className="space-y-5">
          <section className="bg-glass p-6">
            <div className="mb-3 flex items-center gap-2">
              <StepNumber n={1} />
              <h2 className="font-medium text-ink">Ce que fait Cerfa Drone</h2>
            </div>
            <p className="mb-2 text-sm text-slate-400">
              Cerfa Drone génère automatiquement votre dossier de déclaration préfectorale de vol de drone : le
              formulaire officiel Cerfa 15476*04 rempli, accompagné de fiches décrivant chaque zone de vol (carte,
              hauteur, éloignement...), prêts à envoyer à la préfecture compétente.
            </p>
            <p className="mb-4 text-sm text-slate-400">
              Ce que le site ne fait <span className="text-ink">pas</span> : il ne remplace pas votre vérification de
              l'espace aérien (utilisez Géoportail ou l'app Clearance pour ça), ne délivre aucune autorisation de vol,
              et ne vous dispense pas de vérifier la réglementation applicable à votre mission.
            </p>
            <Link href="/tutoriel" className="text-sm font-medium text-brand hover:underline">
              Voir le petit tutoriel →
            </Link>
          </section>

          <section className="bg-glass p-6">
            <div className="mb-3 flex items-center gap-2">
              <StepNumber n={2} />
              <h2 className="font-medium text-ink">Complétez votre profil</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Votre nom, votre adresse et vos drones sont réutilisés automatiquement pour remplir le Cerfa de{" "}
              <span className="text-ink">toutes</span> vos missions : ne les ressaisissez qu'une fois, ici. Sans
              profil rempli, le Cerfa généré aura des champs manquants.
            </p>
            <Link href="/profile" className="text-sm font-medium text-brand hover:underline">
              Compléter mon profil →
            </Link>
          </section>

          <section className="bg-glass p-6">
            <div className="mb-3 flex items-center gap-2">
              <StepNumber n={3} />
              <h2 className="font-medium text-ink">Créez votre première mission</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Une mission regroupe les dates de vol, les zones survolées et les drones utilisés. Importez un Cerfa ou
              un KML déjà existant pour préremplir automatiquement, ou partez de zéro.
            </p>
            <Link href="/missions/new" className="text-sm font-medium text-brand hover:underline">
              Créer une mission →
            </Link>
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-brand hover:underline">
            Aller directement à mes missions →
          </Link>
        </p>
      </main>
    </>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand/40 text-sm font-semibold text-brand">
      {n}
    </span>
  );
}

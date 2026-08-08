import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-medium text-ink">
          Bienvenue{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mb-8 text-sm text-slate-500">Quatre choses à savoir avant de commencer.</p>

        <div className="space-y-5">
          <section className="bg-glass p-6">
            <div className="mb-3 flex items-center gap-2">
              <StepNumber n={1} />
              <h2 className="font-medium text-ink">Ce que fait Cerfa Drone</h2>
            </div>
            <p className="mb-2 text-sm text-slate-400">
              Cerfa Drone génère automatiquement votre dossier de déclaration préfectorale de vol de drone :
            </p>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Le formulaire officiel Cerfa 15476*04 rempli</li>
              <li>Des fiches décrivant chaque zone de vol (carte, hauteur, éloignement...)</li>
              <li>Prêts à envoyer à la préfecture compétente</li>
            </ul>
            <p className="mb-2 text-sm text-slate-400">
              <span className="font-medium text-ink">Ce que le site ne fait pas :</span>
            </p>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Il ne remplace pas votre vérification de l'espace aérien (utilisez Géoportail ou l'app Clearance pour ça)</li>
              <li>Il ne délivre aucune autorisation de vol</li>
              <li>Il ne vous dispense pas de vérifier la réglementation applicable à votre mission</li>
            </ul>
            <Link href="/tutoriel" className="text-sm font-medium text-brand hover:underline">
              Voir le tutoriel →
            </Link>
          </section>

          <section className="bg-glass p-6">
            <div className="mb-3 flex items-center gap-2">
              <StepNumber n={2} />
              <h2 className="font-medium text-ink">Complétez votre profil</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Votre nom, votre adresse et vos drones sont réutilisés automatiquement pour remplir le Cerfa de toutes
              vos missions : ne les ressaisissez qu'une fois, ici. Sans profil rempli, le Cerfa généré aura des
              champs manquants.
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
              Que vous partiez de zéro ou que vous ayez déjà un Cerfa prérempli (DroneKeeper ou autre) ou un fichier
              KML existant, remplissez tous les éléments importants pour finaliser votre mission.
            </p>
            <Link href="/missions/new" className="text-sm font-medium text-brand hover:underline">
              Créer une mission →
            </Link>
          </section>

          <section className="bg-glass p-6">
            <div className="mb-3 flex items-center gap-2">
              <StepNumber n={4} />
              <h2 className="font-medium text-ink">Soutenez le projet</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              Cerfa Drone est et restera 100 % gratuit. Si l'outil vous fait gagner du temps, un don est toujours
              apprécié.
            </p>
            <Link href="/don" className="text-sm font-medium text-brand hover:underline">
              Faire un don →
            </Link>
          </section>
        </div>
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

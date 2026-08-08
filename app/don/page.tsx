import Link from "next/link";

// Page de don : entièrement optionnelle, aucune fonctionnalité du site n'y
// est conditionnée. Le lien PayPal.me pointe directement vers le compte du
// fondateur -- pas de traitement de paiement propre au site, on ne fait que
// rediriger.
const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL || "https://paypal.me/PaulGonner";

export default function DonPage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/accueil" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand">
          ← Retour à l'accueil
        </Link>
        <h1 className="mb-2 text-2xl font-medium text-ink">Soutenir Cerfa Drone</h1>
        <p className="mb-6 text-sm text-slate-500">
          Cerfa Drone est développé et maintenu par un télépilote de drone, sur son temps libre.
        </p>

        <div className="space-y-4">
          <div className="bg-glass p-5">
            <h2 className="mb-2 font-medium text-ink">Le site restera 100 % gratuit</h2>
            <p className="text-sm text-slate-600">
              Aucune fonctionnalité n'est ni ne sera jamais réservée à un don : toutes les missions, tous les
              imports (Cerfa, KML) et toutes les personnalisations restent accessibles gratuitement, sans
              limite, à tous les utilisateurs.
            </p>
          </div>

          <div className="bg-glass p-5">
            <h2 className="mb-2 font-medium text-ink">Un don, entièrement optionnel</h2>
            <p className="mb-4 text-sm text-slate-600">
              Si l'outil vous fait gagner du temps et que vous souhaitez soutenir son développement, un don libre
              est possible via PayPal. Il ne débloque rien de particulier : c'est simplement un geste apprécié, pas
              une contrepartie attendue.
            </p>
            <a
              href={DONATION_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 font-medium text-[#05100c] hover:opacity-90"
            >
              Faire un don via PayPal →
            </a>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Une question ou une idée qui manque ?{" "}
          <a href="/suggestions" className="text-brand hover:underline">
            Dites-le sur la page Suggestions
          </a>
          .
        </p>
      </main>
    </>
  );
}

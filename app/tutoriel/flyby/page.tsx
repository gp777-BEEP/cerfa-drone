import Link from "next/link";
import AppHeader from "../../components/AppHeader";

// Sous-page dédiée : comment récupérer le "Dossier de vol" depuis FlyBy (by
// ASD), pour les pilotes qui utilisent cette app pour leurs demandes
// d'autorisation mais n'en tirent pas de Cerfa rempli automatiquement. Ce
// PDF peut ensuite être déposé directement dans "Nouvelle mission" (ou dans
// une mission existante) pour préremplir zone, dates, régime et drone.
export default function TutorielFlyByPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/tutoriel" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand">
          ← Retour au tutoriel
        </Link>
        <h1 className="mb-2 text-2xl font-medium text-ink">Récupérer un dossier de vol depuis FlyBy</h1>
        <p className="mb-6 text-sm text-slate-500">
          FlyBy (by ASD) facilite les demandes d'autorisation de vol, mais ne génère pas de Cerfa 15476*04
          rempli. Voici comment récupérer le PDF de votre mission pour vous en servir ici.
        </p>

        <div className="space-y-4">
          <div className="bg-glass p-5">
            <h2 className="mb-2 font-medium text-ink">1. Ouvrez la liste de vos missions dans FlyBy</h2>
            <p className="text-sm text-slate-600">
              Connectez-vous à FlyBy et affichez l'onglet "Liste" de vos missions (Id, Titre, Début, Fin,
              Statut).
            </p>
          </div>

          <div className="bg-glass p-5">
            <h2 className="mb-2 font-medium text-ink">2. Sélectionnez votre mission</h2>
            <p className="text-sm text-slate-600">
              Cliquez sur la ligne de la mission concernée : un bandeau apparaît en dessous avec le pilote
              référent, la machine principale, et 4 boutons — <strong className="text-ink">Éditer</strong>,{" "}
              <strong className="text-ink">Dossier de vol</strong>, <strong className="text-ink">Dupliquer</strong>,{" "}
              <strong className="text-ink">Supprimer</strong>.
            </p>
          </div>

          <div className="bg-glass p-5">
            <h2 className="mb-2 font-medium text-ink">3. Cliquez sur "Dossier de vol"</h2>
            <p className="text-sm text-slate-600">
              Le bouton vert télécharge le PDF récapitulatif de la mission (titre, dates, zone, pilote,
              drone).
            </p>
          </div>

          <div className="bg-glass p-5">
            <h2 className="mb-2 font-medium text-ink">4. Déposez ce PDF directement dans Cerfa Drone</h2>
            <p className="text-sm text-slate-600">
              Dans{" "}
              <Link href="/missions/new" className="text-brand hover:underline">
                Nouvelle mission
              </Link>{" "}
              (rubrique "Dossier de vol FlyBy"), ou depuis une mission existante : zone, dates, régime de vol
              et drone sont préremplis automatiquement. Vérifiez les champs préremplis et complétez ce qui
              manque (le fichier ne contenant pas de carte, pensez à ajouter un KML ou une capture d'écran
              pour la zone).
            </p>
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

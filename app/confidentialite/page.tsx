import AppHeader from "../components/AppHeader";

export default function ConfidentialitePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-6 text-2xl font-medium text-ink">Politique de confidentialité</h1>

      <h2 className="mb-2 mt-6 font-medium text-ink">Données collectées</h2>
      <p>
        Pour générer tes dossiers, Cerfa Drone stocke : ton email et mot de passe (compte), ton nom,
        adresse et téléphone (déclarant/télépilote), les caractéristiques de tes drones, les missions que
        tu crées (dates, lieux, réponses au questionnaire), les images de zones de vol que tu importes, et
        les dossiers PDF générés.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Pourquoi ces données</h2>
      <p>
        Uniquement pour pré-remplir et générer tes déclarations Cerfa 15476*04 et leurs annexes. Aucune
        donnée n'est vendue, partagée avec des tiers à des fins commerciales, ou utilisée à d'autres fins.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Où sont stockées les données</h2>
      <p>
        Base de données et fichiers hébergés chez Supabase, application hébergée chez Vercel. Chaque
        utilisateur n'a accès qu'à ses propres missions et documents (isolation technique au niveau de la
        base de données).
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte est actif. Tu peux demander leur suppression à
        tout moment.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Tes droits</h2>
      <p>
        Conformément au RGPD, tu peux demander l'accès, la rectification, l'export ou la suppression de
        tes données à tout moment via la page{" "}
        <a href="/contact" className="text-brand hover:underline">
          Contact
        </a>
        .
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Cookies</h2>
      <p>
        Le site utilise uniquement des cookies techniques nécessaires à la connexion (session de compte).
        Aucun cookie publicitaire ou de suivi tiers.
      </p>
      </main>
    </>
  );
}

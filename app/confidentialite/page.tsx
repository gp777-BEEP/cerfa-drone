
export default function ConfidentialitePage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-6 text-2xl font-medium text-ink">Politique de confidentialité</h1>

      <h2 className="mb-2 mt-6 font-medium text-ink">Données collectées</h2>
      <p>
        Pour générer vos dossiers, Cerfa Drone stocke : votre email et mot de passe (compte), votre nom,
        adresse et téléphone (déclarant/télépilote), les caractéristiques de vos drones, les missions que
        vous créez (dates, lieux, réponses au questionnaire), les images de zones de vol que vous importez, et
        les dossiers PDF générés.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Pourquoi ces données</h2>
      <p>
        Uniquement pour pré-remplir et générer vos déclarations Cerfa 15476*04 et leurs annexes. Vos données ne
        sont ni vendues, ni échangées, ni cédées à un tiers de quelque manière que ce soit, et ne sont utilisées
        à aucune autre fin que celle décrite ici.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Où sont stockées les données</h2>
      <p>
        Base de données et fichiers hébergés chez Supabase, application hébergée chez Vercel. Chaque
        utilisateur n'a accès qu'à ses propres missions et documents (isolation technique au niveau de la
        base de données).
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif. Vous pouvez demander leur suppression à
        tout moment.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Vos droits</h2>
      <p>
        Conformément au RGPD, vous pouvez demander l'accès, la rectification, l'export ou la suppression de
        vos données à tout moment via la page{" "}
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

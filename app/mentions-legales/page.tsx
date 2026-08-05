export default function MentionsLegalesPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-6 text-2xl font-medium text-ink">Mentions légales</h1>

      <h2 className="mb-2 mt-6 font-medium text-ink">Éditeur du site</h2>
      <p>
        Cerfa Drone est édité à titre individuel par Paul Gonnet, télépilote de drone.
        <br />
        Adresse : 156 Impasse du Nantillet
        <br />
        Email : gonnetpaul74@gmail.com
        <br />
        <span className="text-slate-400">
          [À compléter : numéro SIREN/SIRET si activité déclarée en auto-entrepreneur ou société]
        </span>
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Directeur de la publication</h2>
      <p>Paul Gonnet.</p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
        (vercel.com). Les données (comptes, missions, fichiers) sont stockées via Supabase.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus du site (textes, mise en page, logo) est la propriété de l'éditeur, sauf
        mention contraire. Le formulaire Cerfa 15476*04 reproduit sur ce site est un document
        administratif public émis par la Direction générale de l'aviation civile (DGAC).
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Responsabilité</h2>
      <p>
        Cerfa Drone est un outil d'aide à la constitution de dossier. Il ne se substitue pas à une
        vérification personnelle de la réglementation applicable à chaque vol. L'éditeur ne peut être
        tenu responsable d'une déclaration incomplète, erronée, ou refusée par une préfecture.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Données personnelles</h2>
      <p>
        Voir la page{" "}
        <a href="/confidentialite" className="text-brand hover:underline">
          Politique de confidentialité
        </a>
        .
      </p>
    </main>
  );
}

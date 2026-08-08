import AppHeader from "../components/AppHeader";

export default function MentionsLegalesPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-700">
      <h1 className="mb-6 text-2xl font-medium text-ink">Mentions légales</h1>

      <h2 className="mb-2 mt-6 font-medium text-ink">Éditeur du site</h2>
      <p>
        Cerfa Drone est édité à titre individuel et non professionnel par un télépilote de drone, contactable via{" "}
        <a href="/contact" className="text-brand hover:underline">
          la page Contact
        </a>
        . Conformément à l'article 1-1, II de la loi n° 2004-575 du 21 juin 2004 (LCEN), les éditeurs non
        professionnels agissant à titre personnel peuvent ne pas rendre publiques leurs coordonnées
        d'identification, à condition de les avoir communiquées à leur hébergeur : c'est le choix fait ici. Ces
        informations restent transmissibles à toute autorité qui en ferait la demande dans les conditions prévues
        par la loi.
      </p>

      <h2 className="mb-2 mt-6 font-medium text-ink">Directeur de la publication</h2>
      <p>L'éditeur du site, tel que défini ci-dessus.</p>

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
    </>
  );
}

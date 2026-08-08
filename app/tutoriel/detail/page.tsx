import type { ReactNode } from "react";
import Link from "next/link";

// Icônes minimales (trait, currentColor) pour identifier chaque étape en un
// coup d'œil sur les cartes ci-dessous.
function IconMission() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}

function IconZone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 21c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </svg>
  );
}

function IconGenerate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M12 12v5M9.5 14.5 12 17l2.5-2.5" />
    </svg>
  );
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-20 bg-glass p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
          <div className="h-5 w-5">{icon}</div>
        </div>
        <h2 className="font-medium text-ink">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

export default function TutorielDetailPage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/tutoriel" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-brand">
          ← Retour au résumé
        </Link>
        <h1 className="mb-2 text-2xl font-medium text-ink">Guide détaillé</h1>
        <p className="mb-6 text-sm text-slate-500">
          Tout ce qu'il faut savoir pour constituer un dossier de déclaration de vol de drone, quel que
          soit ce que vous avez sous la main pour décrire votre zone de vol : un fichier KML, une simple
          capture d'écran, ou même un Cerfa pré-rempli par ailleurs.
        </p>

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          {[
            ["Créer une mission", "creer-mission"],
            ["Décrire votre zone de vol", "zones"],
            ["Pas de carte sous la main ?", "pas-de-carte"],
            ["Votre profil et vos drones", "profil"],
            ["Générer le dossier", "generer"],
          ].map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-brand/30 px-3 py-1.5 text-brand hover:bg-brand-light"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="space-y-6">
          <Section id="creer-mission" title="1. Créer une mission" icon={<IconMission />}>
            <p>
              Depuis "Mes missions", cliquez sur "+ Nouvelle mission". Choisissez un type de mission (prise
              de vue, inspection technique...), un titre, une plage de dates/heures, et la sous-catégorie
              A1, A2 ou A3 (elle dépend du poids et de la classe de votre drone).
            </p>
            <p>
              "Objet précis de la mission" et "Commanditaire" sont ce qui apparaît tel quel sur le Cerfa
              pour chaque zone de vol ; laissez-les vides pour reprendre simplement le titre de la mission.
            </p>
            <p>
              Toutes les questions ne sont pas obligatoires à la création : vous pouvez revenir les
              compléter plus tard, directement depuis la page de la mission une fois créée.
            </p>
          </Section>

          <Section id="zones" title="2. Décrire votre zone de vol" icon={<IconZone />}>
            <p>Trois façons d'ajouter une zone, à combiner librement, y compris sur une même mission :</p>
            <p>
              <strong className="text-ink">Un Cerfa pré-rempli</strong> (par un autre outil, ou par un
              client) : déposez-le dans "Importer un Cerfa" et l'adresse, les dates, le régime de vol, les
              drones et jusqu'à 2 zones sont préremplis automatiquement.
            </p>
            <p>
              <strong className="text-ink">Un fichier KML</strong> (export d'une carte dessinée dans une
              app comme Google My Maps, DroneKeeper ou FlySpot) : déposez-le dans "Importer un KML", la
              hauteur maximale, l'éloignement maximal et une carte avec échelle sont calculés
              automatiquement pour vous. C'est la méthode la plus précise.
            </p>
            <p>
              <strong className="text-ink">Rien de tout ça, juste une capture d'écran</strong> (Google
              Maps, Géoportail, une carte papier...) : saisissez la zone manuellement (adresse, hauteur et
              éloignement max estimés) et déposez l'image en pièce jointe. Vous pouvez aussi ajouter ou
              remplacer cette image plus tard, en cliquant sur "Modifier" sur une zone déjà créée.
            </p>
            <p>
              Vous utilisez <strong className="text-ink">FlyBy</strong> pour vos demandes d'autorisation ?{" "}
              <a href="/tutoriel/flyby" className="text-brand hover:underline">
                Voir comment récupérer votre dossier de vol →
              </a>
            </p>
            <p>
              Pour chaque zone, une petite pastille orange apparaît si la "Description du site" n'est pas
              encore remplie (rassurez-vous, ce n'est pas bloquant, juste un rappel). Deux zones qui
              décrivent le même endroit (importées séparément par KML et par Cerfa, par exemple)
              peuvent être fusionnées : sélectionnez-les avec la case à cocher, puis "Fusionner".
            </p>
          </Section>

          <Section id="pas-de-carte" title="Pas de carte sous la main ?" icon={<IconCompass />}>
            <p>
              L'app ne propose pas d'éditeur de carte intégré (dessiner un polygone précis demande un vrai
              outil de cartographie). Deux solutions simples et gratuites :
            </p>
            <p>
              <strong className="text-ink">DroneKeeper</strong> ou{" "}
              <strong className="text-ink">FlyBy</strong> (gratuit) : ces apps de gestion de vol proposent
              un éditeur de zone intégré. Tracez votre zone de vol, puis exportez-la au format KML depuis
              l'app. Déposez le fichier obtenu dans "Importer un KML" ci-dessus.
            </p>
            <p>
              <strong className="text-ink">Google My Maps</strong> (mymaps.google.com, gratuit, aucun
              compte spécifique requis au-delà d'un compte Google) : cherchez votre adresse, dessinez un
              polygone ou un cercle autour de votre zone de vol avec l'outil de tracé, puis "Menu" →
              "Exporter vers KML/KMZ". Déposez le fichier obtenu dans "Importer un KML" ci-dessus.
            </p>
            <p>
              Des apps dédiées au drone comme <strong className="text-ink">FlySpot</strong> ou{" "}
              <strong className="text-ink">Drone-Spot</strong> sont utiles en complément pour vérifier si
              votre zone est en zone autorisée, réglementée ou interdite avant de voler (à vérifier aussi
              sur le Géoportail, couche "Restrictions UAS").
            </p>
            <p>Aucun de ces outils sous la main non plus ? Une simple capture d'écran suffit, voir ci-dessus.</p>
          </Section>

          <Section id="profil" title="3. Votre profil et vos drones" icon={<IconProfile />}>
            <p>
              Renseignez votre identité une seule fois dans "Profil" : elle est réutilisée pour toutes vos
              missions. Choisissez si vous déclarez en votre nom (personne physique) ou au nom d'une
              société (personne morale) : le Cerfa remplit une colonne différente selon le cas.
            </p>
            <p>
              Vos drones aussi se déclarent une fois dans "Mes drones" (manuellement, ou en important le
              CSV "liste des aéronefs" depuis AlphaTango) et sont réutilisés automatiquement. Vous pouvez
              désélectionner ceux qui ne volent pas sur une mission précise.
            </p>
          </Section>

          <Section id="generer" title="4. Générer le dossier" icon={<IconGenerate />}>
            <p>
              Une fois les informations principales renseignées, cliquez sur "Générer le dossier PDF" en
              bas de la page de la mission. Le dossier s'ouvre dans un aperçu plein écran (pagination et
              zoom du navigateur) avant le téléchargement, pour vérifier que tout est correct.
            </p>
            <p>
              Une bannière rappelle en haut de page ce qu'il manque éventuellement (zone incomplète, drone
              non renseigné...) : le dossier peut quand même être généré, mais la préfecture peut demander
              de compléter. Avant l'envoi, n'oubliez pas de signer le document.
            </p>
          </Section>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Une question ou une idée qui manque ici ?{" "}
          <a href="/suggestions" className="text-brand hover:underline">
            Dites-le sur la page Suggestions
          </a>
          .
        </p>
      </main>
    </>
  );
}

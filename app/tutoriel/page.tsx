import AppHeader from "../components/AppHeader";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 bg-glass p-5">
      <h2 className="mb-3 font-medium text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

export default function TutorielPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-2 text-2xl font-medium text-ink">Tutoriel</h1>
        <p className="mb-6 text-sm text-slate-500">
          Tout ce qu'il faut savoir pour constituer un dossier de déclaration de vol de drone, quel que
          soit ce que tu as sous la main pour décrire ta zone de vol : un fichier KML, une simple capture
          d'écran, ou même un Cerfa déjà rempli par ailleurs.
        </p>

        <div className="mb-6 flex flex-wrap gap-2 text-xs">
          {[
            ["Créer une mission", "creer-mission"],
            ["Décrire ta zone de vol", "zones"],
            ["Pas de carte sous la main ?", "pas-de-carte"],
            ["Ton profil et tes drones", "profil"],
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
          <Section id="creer-mission" title="1. Créer une mission">
            <p>
              Depuis "Mes missions", clique sur "+ Nouvelle mission". Choisis un type de mission (prise de
              vue, inspection technique...), un titre, une plage de dates/heures, et la sous-catégorie A1,
              A2 ou A3 (elle dépend du poids et de la classe de ton drone).
            </p>
            <p>
              "Objet précis de la mission" et "Commanditaire" sont ce qui apparaît tel quel sur le Cerfa
              pour chaque zone de vol ; laisse-les vides pour reprendre simplement le titre de la mission.
            </p>
            <p>
              Toutes les questions ne sont pas obligatoires à la création : tu peux revenir les compléter
              plus tard, directement depuis la page de la mission une fois créée.
            </p>
          </Section>

          <Section id="zones" title="2. Décrire ta zone de vol">
            <p>Trois façons d'ajouter une zone, à combiner librement, y compris sur une même mission :</p>
            <p>
              <strong className="text-ink">Un Cerfa déjà rempli</strong> (par un autre outil, ou par un
              client) : dépose-le dans "Importer un Cerfa" et l'adresse, les dates, le régime de vol, les
              drones et jusqu'à 2 zones sont préremplis automatiquement.
            </p>
            <p>
              <strong className="text-ink">Un fichier KML</strong> (export d'une carte dessinée dans une
              app comme Google My Maps, DroneKeeper ou FlySpot) : dépose-le dans "Importer un KML", la
              hauteur maximale, l'éloignement maximal et une carte avec échelle sont calculés
              automatiquement pour toi. C'est la méthode la plus précise.
            </p>
            <p>
              <strong className="text-ink">Rien de tout ça, juste une capture d'écran</strong> (Google
              Maps, Géoportail, une carte papier...) : saisis la zone manuellement (adresse, hauteur et
              éloignement max estimés) et dépose l'image en pièce jointe. Tu peux aussi ajouter ou remplacer
              cette image plus tard, en cliquant sur "Modifier" sur une zone déjà créée.
            </p>
            <p>
              Pour chaque zone, une petite pastille orange apparaît si la "Description du site" n'est pas
              encore remplie (rassure-toi, ce n'est pas bloquant, juste un rappel). Deux zones qui décrivent
              en fait le même endroit (importées séparément par KML et par Cerfa, par exemple) peuvent être
              fusionnées : sélectionne-les avec la case à cocher, puis "Fusionner".
            </p>
          </Section>

          <Section id="pas-de-carte" title="Pas de carte sous la main ?">
            <p>
              L'app ne propose pas d'éditeur de carte intégré (dessiner un polygone précis demande un vrai
              outil de cartographie). La solution la plus simple et gratuite :
            </p>
            <p>
              <strong className="text-ink">Google My Maps</strong> (mymaps.google.com, gratuit, aucun
              compte spécifique requis au-delà d'un compte Google) : cherche ton adresse, dessine un
              polygone ou un cercle autour de ta zone de vol avec l'outil de tracé, puis "Menu" → "Exporter
              vers KML/KMZ". Dépose le fichier obtenu dans "Importer un KML" ci-dessus.
            </p>
            <p>
              Des apps dédiées au drone comme <strong className="text-ink">FlySpot</strong> ou{" "}
              <strong className="text-ink">Drone-Spot</strong> sont utiles en complément pour vérifier si ta
              zone est en zone autorisée, réglementée ou interdite avant de voler (à vérifier aussi sur le
              Géoportail, couche "Restrictions UAS").
            </p>
            <p>Aucun de ces outils sous la main non plus ? Une simple capture d'écran suffit, voir ci-dessus.</p>
          </Section>

          <Section id="profil" title="3. Ton profil et tes drones">
            <p>
              Renseigne ton identité une seule fois dans "Profil" : elle est réutilisée pour toutes tes
              missions. Choisis si tu déclares en ton nom (personne physique) ou au nom d'une société
              (personne morale) : le Cerfa remplit une colonne différente selon le cas.
            </p>
            <p>
              Tes drones aussi se déclarent une fois dans "Mes drones" (manuellement, ou en important le CSV
              "liste des aéronefs" depuis AlphaTango) et sont réutilisés automatiquement. Tu peux
              désélectionner ceux qui ne volent pas sur une mission précise.
            </p>
          </Section>

          <Section id="generer" title="4. Générer le dossier">
            <p>
              Une fois les informations principales renseignées, clique sur "Générer le dossier PDF" en bas
              de la page de la mission. Le dossier s'ouvre dans un aperçu plein écran (pagination et zoom du
              navigateur) avant le téléchargement, pour vérifier que tout est correct.
            </p>
            <p>
              Une bannière rappelle en haut de page ce qu'il manque éventuellement (zone incomplète, drone
              non renseigné...) : le dossier peut quand même être généré, mais la préfecture peut demander
              de compléter. Avant l'envoi, n'oublie pas de signer le document.
            </p>
          </Section>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Une question ou une idée qui manque ici ?{" "}
          <a href="/suggestions" className="text-brand hover:underline">
            Dis-le sur la page Suggestions
          </a>
          .
        </p>
      </main>
    </>
  );
}

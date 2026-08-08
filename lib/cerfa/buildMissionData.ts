/**
 * Transforme (profil pilote, mission, zones) — tel que stocké en base — en
 * l'objet imbriqué attendu par fillCerfa() (mêmes clés sémantiques que le
 * prototype Python validé). Centralise ici les hypothèses "V1" :
 *  - un seul télépilote (le profil connecté) déclaré comme télépilote 1,
 *  - l'exploitant est une personne physique = le profil connecté,
 *  - jusqu'à 2 zones (site 1 et site 2) ; au-delà, à ajouter en V2 (annexe).
 */

export interface Profile {
  full_name?: string | null;
  // Nom et prénom saisis séparément (retour bêta-testeur : deviner la
  // coupure dans un "nom complet" à rallonge, ex. "Pierre-Louis Marie Jean
  // Gonnet", n'est pas fiable). Prioritaires sur full_name quand présents ;
  // ce dernier reste recalculé/conservé pour compatibilité (affichage
  // "Bienvenue, prénom" sur /accueil notamment).
  first_name?: string | null;
  last_name?: string | null;
  // Prénoms secondaires (état civil), saisis séparément du prénom usuel :
  // le Cerfa n'a qu'une seule case "Prénom", qui doit contenir tous les
  // prénoms — on les fusionne avec first_name au moment de construire le
  // champ "prenom" ci-dessous.
  autres_prenoms?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  // Demandés par le Cerfa pour chaque télépilote (case n°2) ; jamais
  // collectés avant l'ajout du multi-pilotes, donc facultatifs.
  date_naissance?: string | null; // ISO yyyy-mm-dd
  // Ville/pays de naissance en deux champs distincts (retour bêta-testeur) --
  // recombinés en une seule case Cerfa par formatNaissance() ci-dessous.
  naissance_ville?: string | null;
  naissance_pays?: string | null;
  qualite?: string | null;
  // Statut de télépilote pour le profil connecté lui-même (utilisé comme
  // télépilote 1 par défaut) : rempli sur le Cerfa dans la case "Employeur
  // (Salarié)" / "Indépendant (Oui/Non)" de la case n°2, cf. pilotsList
  // ci-dessous.
  statut_pilote?: "salarie" | "independant" | null;
  employeur?: string | null;
  // Personne physique (par défaut) ou personne morale : détermine quelle
  // colonne de la section "1. L'exploitant" du Cerfa est remplie. Si
  // "morale", full_name/address/phone/email/qualite ci-dessus décrivent le
  // mandataire (représentant légal), pas l'exploitant lui-même.
  exploitant_type?: "physique" | "morale" | null;
  raison_sociale?: string | null;
  siege_social?: string | null;
  siren_siret?: string | null;
  mandataire_qualite?: string | null;
  // Certaines sociétés ont un exploitant (mandataire) qui ne vole pas
  // lui-même : true/absent (comportement historique) = on peut se
  // prérempli comme télépilote 1 par défaut, false = ne jamais le faire
  // (cf. fallback pilotsList ci-dessous).
  est_telepilote?: boolean | null;
  drones?: Array<{
    constructeur?: string;
    modele?: string;
    type?: string;
    numero_serie?: string;
    masse_kg?: string | number;
    classe_c5?: "oui" | "non";
    captif?: "oui" | "non";
    numero_enregistrement?: string;
    numero_signalement?: string;
  }> | null;
}

export interface MissionRow {
  title: string;
  mission_type: string;
  answers?: Record<string, any> | null;
  date_debut?: string | null; // ISO yyyy-mm-dd
  heure_debut?: string | null;
  date_fin?: string | null;
  heure_fin?: string | null;
  regime?: {
    categorie_ouverte?: boolean;
    sous_categorie_a1?: boolean;
    sous_categorie_a2?: boolean;
    sous_categorie_a3?: boolean;
    sts01?: boolean;
    s3?: boolean;
  } | null;
  // Sous-ensemble des drones du profil (ou drones ajoutés ponctuellement)
  // utilisés pour CETTE mission précise. Si absent/vide, on retombe sur
  // profile.drones en entier (comportement historique, cf. plus bas).
  drones?: Profile["drones"];
  // Télépilotes déclarés pour CETTE mission (Cerfa case n°2, jusqu'à 4).
  // Si absent/vide, on retombe sur le seul profil connecté comme
  // télépilote 1 (comportement historique, cf. plus bas).
  pilots?: Array<{
    nom?: string;
    prenom?: string;
    date_naissance?: string | null;
    naissance_ville?: string | null;
    naissance_pays?: string | null;
    adresse?: string;
    statut?: "salarie" | "independant";
    employeur?: string;
    telephone_portable?: string;
    courriel?: string;
  }> | null;
  // Objet précis de la mission et commanditaire, dédiés au Cerfa : si
  // absents, on retombe sur mission.title / answers.commanditaire
  // (comportement historique).
  objet_mission?: string | null;
  commanditaire?: string | null;
  // Champs généraux du Cerfa (haut du formulaire, pas par zone) : déjà
  // mappés dans fieldMap.ts (dates.raisons_horaires/prescriptions_restrictives
  // -> Texte59/Texte60), remplacent l'ancien bloc "questions par zone".
  raisons_horaires?: string | null;
  prescriptions_restrictives?: string | null;
  // "Accompagnant / Observateur" du Cerfa (case n°2, colonne dédiée à droite
  // des télépilotes 1-4) : une personne présente sur le vol sans être
  // télépilote elle-même, facultatif -- absent/null = case laissée vide
  // (jamais rempli avant). Même forme qu'un télépilote (adresse, statut
  // salarié/indépendant compris), sans limite de nombre à gérer (une seule
  // colonne sur le Cerfa officiel).
  accompagnant?: {
    nom?: string;
    prenom?: string;
    date_naissance?: string | null;
    naissance_ville?: string | null;
    naissance_pays?: string | null;
    adresse?: string;
    statut?: "salarie" | "independant";
    employeur?: string;
    telephone_portable?: string;
    courriel?: string;
  } | null;
}

export interface ZoneRow {
  title?: string | null;
  code_postal?: string | null;
  localite?: string | null;
  adresse?: string | null;
  en_agglomeration?: boolean | null;
  rassemblement?: boolean | null;
  rassemblement_description?: string | null;
  distance_max_m?: number | null;
  hauteur_max_m?: number | null;
  notes?: string | null;
}

function splitName(fullName?: string | null): { nom: string; prenom: string } {
  if (!fullName) return { nom: "", prenom: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { nom: parts[0], prenom: "" };
  return { nom: parts.slice(1).join(" "), prenom: parts[0] };
}

function toDdMmYyyy(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// Le Cerfa n'a qu'un seul champ texte "Date et lieu de naissance ville et
// pays" par télépilote (pas deux champs séparés, contrairement à la saisie
// -- ville/pays distincts, retour bêta-testeur) : on les combine ici.
function formatNaissance(dateIso?: string | null, ville?: string | null, pays?: string | null): string {
  const d = toDdMmYyyy(dateIso);
  const l = [ville, pays].filter((v) => (v || "").trim()).join(", ");
  if (d && l) return `${d} à ${l}`;
  return d || l;
}

export function buildMissionData(profile: Profile, mission: MissionRow, zones: ZoneRow[]) {
  const { nom, prenom } =
    profile.first_name || profile.last_name
      ? {
          nom: profile.last_name || "",
          prenom: [profile.first_name, profile.autres_prenoms].filter(Boolean).join(" "),
        }
      : splitName(profile.full_name);
  const answers = mission.answers || {};

  // Section "1. L'exploitant" du Cerfa a deux colonnes bien distinctes :
  // "personne physique" (Nom/Prénom/adresse... = exploitant.*) ou "personne
  // morale" (raison sociale/siège social/SIREN = toujours exploitant.*, sous
  // d'autres clés) + dans ce 2e cas un sous-bloc "Mandataire social ou
  // principal dirigeant" (mandataire.*) pour la personne physique qui
  // représente la société. On ne remplit jamais les deux colonnes à la fois.
  const isMorale = profile.exploitant_type === "morale";

  const data: Record<string, any> = {
    exploitant: isMorale
      ? {
          raison_sociale: profile.raison_sociale || "",
          siege_social: profile.siege_social || "",
          siren_siret: profile.siren_siret || "",
        }
      : {
          nom,
          prenom,
          adresse: profile.address || "",
          telephone_portable: profile.phone || "",
          courriel: profile.email || "",
        },
    contact_urgence: {
      civilite: "monsieur",
      nom,
      prenom,
      fonction: profile.qualite || "Télépilote",
      telephone_portable: profile.phone || "",
      courriel: profile.email || "",
    },
    regime: {
      categorie_ouverte: mission.regime?.categorie_ouverte ?? true,
      sous_categorie_a1: mission.regime?.sous_categorie_a1 ?? false,
      sous_categorie_a2: mission.regime?.sous_categorie_a2 ?? false,
      sous_categorie_a3: mission.regime?.sous_categorie_a3 ?? false,
      sts01: mission.regime?.sts01 ?? false,
      s3: mission.regime?.s3 ?? false,
    },
    dates: (() => {
      const [debutHeure, debutMin] = (mission.heure_debut || "").split(":");
      const [finHeure, finMin] = (mission.heure_fin || "").split(":");
      return {
        debut_date: toDdMmYyyy(mission.date_debut),
        debut_heure: debutHeure || "",
        debut_min: debutMin || "",
        fin_date: toDdMmYyyy(mission.date_fin),
        fin_heure: finHeure || "",
        fin_min: finMin || "",
        raisons_horaires: mission.raisons_horaires || "",
        prescriptions_restrictives: mission.prescriptions_restrictives || "",
      };
    })(),
    signature: {
      nom,
      prenom,
      qualite: profile.qualite || "Télépilote",
      date: toDdMmYyyy(new Date().toISOString().slice(0, 10)),
    },
  };

  // Bloc "Mandataire social ou principal dirigeant" : uniquement rempli si
  // l'exploitant est une personne morale (le représentant légal de la
  // société, identifié par les mêmes infos de contact que le profil).
  if (isMorale) {
    data.mandataire = {
      nom,
      prenom,
      adresse: profile.address || "",
      telephone_portable: profile.phone || "",
      courriel: profile.email || "",
      qualite: profile.mandataire_qualite || "",
    };
  }

  // Drones déclarés pour CETTE mission si l'utilisateur en a choisi (cf.
  // MissionDrones.tsx / NewMissionForm.tsx) ; sinon tous les drones du
  // profil, comme avant que la sélection par mission n'existe.
  const missionDrones = mission.drones && mission.drones.length > 0 ? mission.drones : profile.drones || [];

  missionDrones.slice(0, 5).forEach((drone, i) => {
    data[`aeronef${i + 1}`] = {
      constructeur: drone.constructeur || "",
      modele: drone.modele || "",
      type: drone.type || "Drone",
      numero_serie: drone.numero_serie || "",
      masse_kg: drone.masse_kg ?? "",
      classe_c5: drone.classe_c5 || "non",
      captif: drone.captif || "non",
      numero_enregistrement: drone.numero_enregistrement || "",
      numero_signalement: drone.numero_signalement || "",
    };
  });

  // Télépilotes déclarés pour CETTE mission (Cerfa case n°2, jusqu'à 4
  // emplacements sur le formulaire officiel) : si l'utilisateur en a
  // explicitement ajouté via l'onglet "Pilotes" d'une mission, on les
  // utilise tous ; sinon, le profil connecté est déclaré comme télépilote 1
  // par défaut (comportement historique), avec son statut salarié/indépendant
  // s'il l'a renseigné dans son profil (profile.statut_pilote).
  //
  // Exception (continuité exploitant/pilotes) : si le profil a explicitement
  // indiqué ne pas être lui-même télépilote (typiquement le dirigeant d'une
  // société qui ne vole pas), on ne le prérempli plus comme télépilote 1 --
  // mieux vaut une case vide qu'une case fausse sur un document officiel.
  const profileIsPilot = profile.est_telepilote !== false;
  const pilotsList =
    mission.pilots && mission.pilots.length > 0
      ? mission.pilots
      : profileIsPilot
      ? [
          {
            nom,
            prenom,
            date_naissance: profile.date_naissance,
            naissance_ville: profile.naissance_ville,
            naissance_pays: profile.naissance_pays,
            adresse: profile.address || "",
            statut: profile.statut_pilote || undefined,
            employeur: profile.employeur || "",
            telephone_portable: profile.phone || "",
            courriel: profile.email || "",
          },
        ]
      : [];

  pilotsList.slice(0, 4).forEach((pilot, i) => {
    data[`telepilote${i + 1}`] = {
      nom: pilot.nom || "",
      prenom: pilot.prenom || "",
      naissance: formatNaissance(pilot.date_naissance, pilot.naissance_ville, pilot.naissance_pays),
      adresse: pilot.adresse || "",
      telephone_portable: pilot.telephone_portable || "",
      courriel: pilot.courriel || "",
      // Bug corrigé : "Télépilote XEmployeur Salarié" et "...Indépendant
      // OuiNon" sont des champs TEXTE sur le Cerfa officiel (pas des cases à
      // cocher) -- y écrire un booléen affichait littéralement "true"/"false"
      // dans le PDF généré. On y écrit maintenant le nom de l'employeur (si
      // salarié) et "Oui"/"Non" (indépendant), et on laisse les deux cases
      // vides quand le statut n'a jamais été renseigné (mieux vaut une case
      // vide qu'une case fausse sur un document officiel).
      ...(pilot.statut
        ? {
            employeur: pilot.statut === "salarie" ? pilot.employeur || "Oui" : "",
            independant: pilot.statut === "independant" ? "Oui" : "Non",
          }
        : {}),
    };
  });

  // Accompagnant / Observateur (case n°2, colonne dédiée) : facultatif,
  // saisi depuis la page de la mission (cf. MissionContactGeneral.tsx).
  // Même logique employeur/indépendant que les télépilotes ci-dessus.
  if (mission.accompagnant) {
    const acc = mission.accompagnant;
    data.accompagnant = {
      nom: acc.nom || "",
      prenom: acc.prenom || "",
      naissance: formatNaissance(acc.date_naissance, acc.naissance_ville, acc.naissance_pays),
      adresse: acc.adresse || "",
      telephone_portable: acc.telephone_portable || "",
      courriel: acc.courriel || "",
      ...(acc.statut
        ? {
            employeur: acc.statut === "salarie" ? acc.employeur || "Oui" : "",
            independant: acc.statut === "independant" ? "Oui" : "Non",
          }
        : {}),
    };
  }

  // Objet précis de la mission / commanditaire : champs dédiés (saisis à la
  // création de la mission ou préremplis depuis un Cerfa importé) si
  // présents, sinon on retombe sur le titre interne de la mission / l'ancien
  // sac "answers.commanditaire" (jamais vraiment exposé en UI jusqu'ici).
  const objetMission = mission.objet_mission || mission.title;
  const commanditaire = mission.commanditaire || answers.commanditaire || "";

  zones.slice(0, 2).forEach((zone, i) => {
    const siteKey = i === 0 ? "site1" : "site2";
    data[siteKey] = {
      code_postal: zone.code_postal || "",
      localite: zone.localite || "",
      adresse: zone.adresse || "",
      en_agglomeration: !!zone.en_agglomeration,
      rassemblement: !!zone.rassemblement,
      rassemblement_description: zone.rassemblement_description || "",
      objet_mission: objetMission,
      commanditaire,
      localisation_precise: zone.adresse || "",
      eloignement_max_m: zone.distance_max_m ?? answers.eloignement_max ?? "",
      hauteur_max_m: zone.hauteur_max_m ?? answers.hauteur_max ?? "",
      vol_en_vue: "oui",
      aeronefs_choice: "tous",
      dates_selon_4: true,
      descriptif_joint: true,
      autres_infos: zone.notes || "",
    };
  });

  if (zones.length > 2) {
    data.sites = { suite_en_annexe: true };
  }

  return data;
}

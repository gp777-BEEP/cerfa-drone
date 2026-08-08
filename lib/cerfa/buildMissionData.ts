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
  lieu_naissance?: string | null;
  qualite?: string | null;
  // Personne physique (par défaut) ou personne morale : détermine quelle
  // colonne de la section "1. L'exploitant" du Cerfa est remplie. Si
  // "morale", full_name/address/phone/email/qualite ci-dessus décrivent le
  // mandataire (représentant légal), pas l'exploitant lui-même.
  exploitant_type?: "physique" | "morale" | null;
  raison_sociale?: string | null;
  siege_social?: string | null;
  siren_siret?: string | null;
  mandataire_qualite?: string | null;
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
    lieu_naissance?: string | null;
    adresse?: string;
    statut?: "salarie" | "independant";
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
// pays" par télépilote (pas deux champs séparés) : on les combine ici.
function formatNaissance(dateIso?: string | null, lieu?: string | null): string {
  const d = toDdMmYyyy(dateIso);
  const l = (lieu || "").trim();
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
  // utilise tous ; sinon, seul le profil connecté est déclaré comme
  // télépilote 1 (comportement historique). Dans ce cas de repli, on ne
  // devine pas le statut salarié/indépendant (jamais demandé avant l'ajout
  // du multi-pilotes) : les cases correspondantes restent simplement
  // décochées, comme avant.
  const pilotsList =
    mission.pilots && mission.pilots.length > 0
      ? mission.pilots
      : [
          {
            nom,
            prenom,
            date_naissance: profile.date_naissance,
            lieu_naissance: profile.lieu_naissance,
            adresse: profile.address || "",
            statut: undefined,
            telephone_portable: profile.phone || "",
            courriel: profile.email || "",
          },
        ];

  pilotsList.slice(0, 4).forEach((pilot, i) => {
    data[`telepilote${i + 1}`] = {
      nom: pilot.nom || "",
      prenom: pilot.prenom || "",
      naissance: formatNaissance(pilot.date_naissance, pilot.lieu_naissance),
      adresse: pilot.adresse || "",
      telephone_portable: pilot.telephone_portable || "",
      courriel: pilot.courriel || "",
      // Uniquement rempli quand le statut a été explicitement renseigné
      // (jamais le cas pour le télépilote 1 par défaut, cf. ci-dessus) :
      // sinon les deux cases restent décochées plutôt que de deviner.
      ...(pilot.statut ? { employeur: pilot.statut === "salarie", independant: pilot.statut === "independant" } : {}),
    };
  });

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

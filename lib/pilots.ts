// Télépilotes déclarés sur une mission (Cerfa 15476*04, case n°2 : jusqu'à
// 4 télépilotes). Par défaut, seul le profil connecté est déclaré comme
// télépilote 1 (comportement historique) ; cette fonctionnalité permet d'en
// ajouter d'autres, avec import/export d'un fichier JSON pour qu'un collègue
// n'ait pas à ressaisir ses infos à la main sur votre compte.

export type Pilot = {
  nom: string;
  prenom: string;
  date_naissance: string; // yyyy-mm-dd
  // Ville et pays de naissance en deux champs distincts (retour bêta-testeur :
  // un seul champ "ville, pays" en texte libre n'était pas assez clair) --
  // recombinés en une seule chaîne au moment de remplir le Cerfa (qui n'a
  // qu'une case "Date et lieu de naissance ville et pays"), cf.
  // formatNaissance() dans buildMissionData.ts.
  naissance_ville: string;
  naissance_pays: string;
  adresse: string;
  statut: "salarie" | "independant";
  // Nom de l'employeur, rempli sur le Cerfa dans la case "Employeur
  // (Salarié)" uniquement si statut = "salarie" ; sinon la case "Indépendant
  // (Oui/Non)" reçoit "Oui"/"Non" à la place (cf. buildMissionData.ts).
  employeur: string;
  telephone_portable: string;
  courriel: string;
};

export const EMPTY_PILOT: Pilot = {
  nom: "",
  prenom: "",
  date_naissance: "",
  naissance_ville: "",
  naissance_pays: "",
  adresse: "",
  statut: "independant",
  employeur: "",
  telephone_portable: "",
  courriel: "",
};

export const MAX_PILOTS = 4; // le Cerfa officiel a 4 emplacements "Télépilote"

// Pilote enregistré dans le "roster" du profil (retour bêta-testeur : quand
// on n'est pas seul télépilote de son exploitation, autant ajouter une fois
// pour toutes ses collègues/collaborateurs dans son profil, puis simplement
// les sélectionner mission par mission, plutôt que de tout ressaisir ou de
// jongler avec des fichiers JSON à chaque fois). Même forme qu'un Pilot,
// avec un identifiant stable pour la sélection/édition côté profil.
export type RosterPilot = Pilot & { id: string };

export function newRosterPilot(): RosterPilot {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `pilote_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return { id, ...EMPTY_PILOT };
}

// Répartition "au mieux" d'un ancien champ "lieu de naissance" à plat (avant
// la séparation ville/pays) : le format habituel est "Ville, Pays" ou
// "Ville (Pays)". Utilisé uniquement pour ne rien perdre sur les anciens
// profils/fichiers exportés avant ce changement.
export function splitLegacyLieuNaissance(lieu?: string | null): { ville: string; pays: string } {
  const s = (lieu || "").trim();
  if (!s) return { ville: "", pays: "" };
  const commaSplit = s.split(",");
  if (commaSplit.length > 1) {
    return { ville: commaSplit[0].trim(), pays: commaSplit.slice(1).join(",").trim() };
  }
  const parenMatch = /^(.*)\(([^)]+)\)\s*$/.exec(s);
  if (parenMatch) {
    return { ville: parenMatch[1].trim(), pays: parenMatch[2].trim() };
  }
  return { ville: s, pays: "" };
}

// Fichier exporté depuis la page Profil ("Exporter mes infos") : un JSON
// minimal, sans dépendance à un compte, importable tel quel dans l'onglet
// "Pilotes" d'une mission par n'importe quel destinataire.
export function parsePilotFile(json: any): Pilot | null {
  if (!json || json.type !== "cerfa-drone-pilote") return null;
  const legacy = json.naissance_ville || json.naissance_pays ? null : splitLegacyLieuNaissance(json.lieu_naissance);
  return {
    nom: json.nom || "",
    prenom: json.prenom || "",
    date_naissance: json.date_naissance || "",
    naissance_ville: json.naissance_ville || legacy?.ville || "",
    naissance_pays: json.naissance_pays || legacy?.pays || "",
    adresse: json.adresse || "",
    statut: json.statut === "salarie" ? "salarie" : "independant",
    employeur: json.employeur || "",
    telephone_portable: json.telephone_portable || "",
    courriel: json.courriel || "",
  };
}

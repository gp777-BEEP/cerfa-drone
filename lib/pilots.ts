// Télépilotes déclarés sur une mission (Cerfa 15476*04, case n°2 : jusqu'à
// 4 télépilotes). Par défaut, seul le profil connecté est déclaré comme
// télépilote 1 (comportement historique) ; cette fonctionnalité permet d'en
// ajouter d'autres, avec import/export d'un fichier JSON pour qu'un collègue
// n'ait pas à ressaisir ses infos à la main sur votre compte.

export type Pilot = {
  nom: string;
  prenom: string;
  date_naissance: string; // yyyy-mm-dd
  lieu_naissance: string;
  adresse: string;
  statut: "salarie" | "independant";
  telephone_portable: string;
  courriel: string;
};

export const EMPTY_PILOT: Pilot = {
  nom: "",
  prenom: "",
  date_naissance: "",
  lieu_naissance: "",
  adresse: "",
  statut: "independant",
  telephone_portable: "",
  courriel: "",
};

export const MAX_PILOTS = 4; // le Cerfa officiel a 4 emplacements "Télépilote"

// Fichier exporté depuis la page Profil ("Exporter mes infos") : un JSON
// minimal, sans dépendance à un compte, importable tel quel dans l'onglet
// "Pilotes" d'une mission par n'importe quel destinataire.
export function parsePilotFile(json: any): Pilot | null {
  if (!json || json.type !== "cerfa-drone-pilote") return null;
  return {
    nom: json.nom || "",
    prenom: json.prenom || "",
    date_naissance: json.date_naissance || "",
    lieu_naissance: json.lieu_naissance || "",
    adresse: json.adresse || "",
    statut: json.statut === "salarie" ? "salarie" : "independant",
    telephone_portable: json.telephone_portable || "",
    courriel: json.courriel || "",
  };
}

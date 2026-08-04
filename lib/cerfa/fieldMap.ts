/**
 * Cartographie des 195 champs du CERFA 15476*04, portée depuis le prototype
 * Python validé (cerfa_field_map.py) sur deux missions réelles. Voir ce
 * fichier pour l'historique complet des découvertes (défauts du PDF officiel,
 * décalages de lignes, etc.) — ici on ne garde que le résultat final.
 */

export const TEXT_FIELDS: Record<string, string> = {
  "exploitant.nom": "Nom",
  "exploitant.prenom": "Prénom",
  "exploitant.naissance": "Date et lieu de naissance ville et pays",
  "exploitant.adresse": "Adresse postale",
  "exploitant.telephone_fixe": "Texte36",
  "exploitant.telephone_portable": "Texte37",
  "exploitant.courriel": "Texte38",

  "exploitant.raison_sociale": "Raison sociale ou dénomination",
  "exploitant.siege_social": "Adresse du siège social",
  "exploitant.siren_siret": "Identifiant SIRENSIRET RCSRNE",

  "mandataire.nom": "Nom_2",
  "mandataire.prenom": "Prénom_2",
  "mandataire.naissance": "Date et lieu de naissance ville et pays_2",
  "mandataire.adresse": "Adresse postale_2",
  "mandataire.fonction": "Fonction Profession",
  "mandataire.siren_siret_soustraitant": "Si soustraitant identifiant SIRENSIRET RCS RNE",
  "mandataire.qualite": "Qualité",
  "mandataire.telephone_fixe": "Texte40",
  "mandataire.telephone_portable": "Texte41",
  "mandataire.courriel": "Fixe  Portable Courriel",
  "mandataire.courriel_2": "Fixe  Portable Courriel_2",

  "contact_general.nom": "Texte43",
  "contact_general.prenom": "Texte44",
  "contact_general.naissance": "Texte45",
  "contact_general.fonction": "Texte46",
  "contact_general.telephone_fixe": "Texte47",
  "contact_general.telephone_portable": "Texte48",
  "contact_general.courriel": "Texte49",

  "contact_urgence.nom": "Texte51",
  "contact_urgence.prenom": "Texte52",
  "contact_urgence.fonction": "Texte50",
  "contact_urgence.telephone_portable": "Texte39",
  "contact_urgence.courriel": "Texte49",

  "telepilote1.nom": "Télépilote 1Nom",
  "telepilote1.prenom": "Télépilote 1Prénom",
  "telepilote1.naissance": "Télépilote 1Date et lieu de naissance ville et pays",
  "telepilote1.adresse": "Télépilote 1Adresse postale",
  "telepilote1.employeur": "Télépilote 1Employeur Salarié",
  "telepilote1.independant": "Télépilote 1Indépendant OuiNon",
  "telepilote1.telephone_portable": "Télépilote 1Téléphone portable",
  "telepilote1.courriel": "Télépilote 1Courriel",

  "telepilote2.nom": "Télépilote 2Nom",
  "telepilote2.prenom": "Télépilote 2Prénom",
  "telepilote2.naissance": "Télépilote 2Date et lieu de naissance ville et pays",
  "telepilote2.adresse": "Télépilote 2Adresse postale",
  "telepilote2.employeur": "Télépilote 2Employeur Salarié",
  "telepilote2.independant": "Télépilote 2Indépendant OuiNon",
  "telepilote2.telephone_portable": "Télépilote 2Téléphone portable",
  "telepilote2.courriel": "Télépilote 2Courriel",

  "telepilote3.nom": "Télépilote 3Nom",
  "telepilote3.prenom": "Télépilote 3Prénom",
  "telepilote3.naissance": "Télépilote 3Date et lieu de naissance ville et pays",
  "telepilote3.adresse": "Télépilote 3Adresse postale",
  "telepilote3.employeur": "Télépilote 3Employeur Salarié",
  "telepilote3.independant": "Télépilote 3Indépendant OuiNon",
  "telepilote3.telephone_portable": "Télépilote 3Téléphone portable",
  "telepilote3.courriel": "Télépilote 3Courriel",

  "telepilote4.nom": "Télépilote 4Nom",
  "telepilote4.prenom": "Télépilote 4Prénom",
  "telepilote4.naissance": "Télépilote 4Date et lieu de naissance ville et pays",
  "telepilote4.adresse": "Télépilote 4Adresse postale",
  "telepilote4.employeur": "Télépilote 4Employeur Salarié",
  "telepilote4.independant": "Télépilote 4Indépendant OuiNon",
  "telepilote4.telephone_portable": "Télépilote 4Téléphone portable",
  "telepilote4.courriel": "Télépilote 4Courriel",

  "accompagnant.nom": "Accompagnant  ObservateurNom",
  "accompagnant.prenom": "Accompagnant  ObservateurPrénom",
  "accompagnant.naissance": "Accompagnant  ObservateurDate et lieu de naissance ville et pays",
  "accompagnant.adresse": "Accompagnant  ObservateurAdresse postale",
  "accompagnant.employeur": "Accompagnant  ObservateurEmployeur Salarié",
  "accompagnant.independant": "Accompagnant  ObservateurIndépendant OuiNon",
  "accompagnant.telephone_portable": "Accompagnant  ObservateurTéléphone portable",
  "accompagnant.courriel": "Accompagnant  ObservateurCourriel",

  "regime.autorisation_luc_numero":
    "Autres cas voir notice joindre une copie le cas échéant de lautorisationLUC délivré par la DGAC  autorisationLUC n",

  "dates.debut_date": "Texte53",
  "dates.debut_heure": "Texte54",
  "dates.debut_min": "Texte55",
  "dates.fin_date": "Texte56",
  "dates.fin_heure": "Texte57",
  "dates.fin_min": "Texte58",
  "dates.raisons_horaires": "Texte59",
  "dates.prescriptions_restrictives": "Texte60",
  "dates.motifs_non_respect_preavis": "Motifs du nonrespect du préavis de 10 jours ouvrables",

  "aeronef1.constructeur": "Texte61",
  "aeronef1.modele": "Texte62",
  "aeronef1.type": "Texte63",
  "aeronef1.masse_kg": "Texte64",
  "aeronef1.numero_serie": "Texte65",
  "aeronef1.numero_enregistrement": "Texte114",
  "aeronef1.numero_signalement": "Texte115",

  "aeronef2.constructeur": "Texte66",
  "aeronef2.modele": "Texte67",
  "aeronef2.type": "Texte68",
  "aeronef2.numero_serie": "Texte69",
  "aeronef2.masse_kg": "Texte70",
  "aeronef2.numero_enregistrement": "Texte77",
  "aeronef2.numero_signalement": "Texte78",

  "aeronef3.constructeur": "Texte71",
  "aeronef3.modele": "Texte72",
  "aeronef3.type": "Texte73",
  "aeronef3.numero_serie": "Texte74",
  "aeronef3.masse_kg": "Texte93",
  "aeronef3.numero_enregistrement": "Texte75",
  "aeronef3.numero_signalement": "Texte76",

  "aeronef4.constructeur": "Texte79",
  "aeronef4.modele": "Texte80",
  "aeronef4.type": "Texte81",
  "aeronef4.numero_serie": "Texte82",
  "aeronef4.masse_kg": "Texte92",
  "aeronef4.numero_enregistrement": "Texte83",
  "aeronef4.numero_signalement": "Texte84",

  "aeronef5.constructeur": "Texte85",
  "aeronef5.modele": "Texte86",
  "aeronef5.type": "Texte87",
  "aeronef5.numero_serie": "Texte88",
  "aeronef5.masse_kg": "Texte91",
  "aeronef5.numero_enregistrement": "Texte89",
  "aeronef5.numero_signalement": "Texte90",

  "site1.code_postal": "Code postalRow1",
  "site1.localite": "LocalitéRow1",
  "site1.adresse": "AdresseRow1",
  "site1.rassemblement_description": "Texte94",
  "site1.objet_mission": "Texte95",
  "site1.commanditaire": "Texte96",
  "site1.localisation_precise": "Texte97",
  "site1.dates_sauf": "Texte98",
  "site1.eloignement_max_m": "Texte99",
  "site1.hauteur_max_m": "Texte100",
  "site1.autres_infos": "proximité des opérations",

  "site2.code_postal": "Code postalRow1_2",
  "site2.localite": "LocalitéRow1_2",
  "site2.adresse": "AdresseRow1_2",
  "site2.objet_mission": "Texte101",
  "site2.commanditaire": "Texte102",
  "site2.localisation_precise": "Texte103",
  "site2.dates_sauf": "Texte104",
  "site2.eloignement_max_m": "Texte105",
  "site2.hauteur_max_m": "Texte106",
  "site2.rassemblement_description": "Texte107",
  "site2.autres_infos": "proximité des opérations_2",

  "signature.lieu": "Texte116",
  "signature.nom": "Texte117",
  "signature.prenom": "Texte118",
  "signature.qualite": "Texte119",
  "signature.date": "Le  JJMMAAAA",
};

export const CHECKBOX_FIELDS: Record<string, string> = {
  "contact_urgence.idem_declarant": "idem cidessus",

  "regime.sts01":
    "Scénario standard européen STS01 joindre une copie de laccusé de réception de déclaration dactivité émis par la DGAC",
  "regime.categorie_ouverte": "Catégorie ouverte",
  "regime.sous_categorie_a1": "Souscatégorie A1",
  "regime.sous_categorie_a2": "Souscatégorie A2",
  "regime.sous_categorie_a3": "Souscatégorie A3",
  "regime.s3": "Scénario standard national S3 Ne concerne que certains vols réalisés au profit de lEtat",
  "regime.autres_cas":
    "Autres cas voir notice joindre une copie le cas échéant de lautorisationLUC délivré par la DGAC  autorisationLUC n",

  "dates.duree_sup_7j":
    "Durée supérieure à sept jours jours de début et de fin compris  joindre les justifications appropriées voir notice",
  "dates.preavis_impossible": "Impossibilité de respecter le préavis de 10 jours ouvrables",

  // Défaut confirmé du PDF officiel (site 1 uniquement) : les cases "En
  // agglomération" / "rassemblement" sont inversées en interne. Voir
  // cerfa_field_map.py (prototype Python) pour le détail de la découverte.
  "site1.en_agglomeration": "Site n 1",
  "site1.rassemblement": "En agglomération",
  "site1.hors_espace_public":
    "Cocher la case si les vols auront lieu exclusivement en dehors de lespace public voir notice",
  "site1.descriptif_joint": "Description du site  cocher la case si un descriptif détaillé est joint séparément",
  "site1.dates_selon_4": "Dates",

  "site2.en_agglomeration": "En agglomération_2",
  "site2.rassemblement": "A proximité dun rassemblement de personnes décrire",
  "site2.hors_espace_public":
    "Cocher la case si les vols auront lieu exclusivement en dehors de lespace public voir notice_2",
  "site2.descriptif_joint": "undefined",
  "site2.aeronefs_tous": "Tous ceux indiqués au  5_2",
  "site2.dates_selon_4": "Selon  4_2",

  "sites.suite_en_annexe": "Suite de la liste des sites en annexe Nombre de pages supplémentaires jointes",

  "engagement.sincerite":
    "atteste la sincérité des informations déclarées et je mengage à réaliser les vols dans les conditions décrites",
  "engagement.info_non_garantie":
    "reconnais être informé que la présente déclaration ne signifie pas que le vol est règlementairement possible et quil",
  "engagement.prefecture_peut_interdire":
    "Je reconnais être informé que la préfecture peut interdire le vol ou apporter des restrictions à tout moment",
  "engagement.respect_reglementation":
    "mengage à respecter lensemble des dispositions réglementaires applicables pour les opérations prévues et en particulier",
  "engagement.exactitude_documents":
    "atteste lexactitude des documents justificatifs fournis conformément au 7 de la notice N5205303",
  "engagement.assurance": "déclare quune assurance couvrant les risques liés aux opérations prévues a été contractée",
};

type RadioChoice = "oui" | "non" | "madame" | "monsieur" | "1" | "2" | "3" | "4";

export const RADIO_FIELDS: Record<string, [string, Partial<Record<RadioChoice, string>>]> = {
  "contact_general.civilite": ["ContactCiviliteGroup", { madame: "/Choix3", monsieur: "/Choix1" }],
  "contact_urgence.civilite": ["Groupe42", { madame: "/Choix1", monsieur: "/Choix2" }],

  "aeronef1.classe_c5": ["Groupe43", { oui: "/Choix2", non: "/Choix4" }],
  "aeronef1.captif": ["Aeronef1CaptifGroup", { oui: "/Choix5", non: "/Choix1" }],

  "aeronef2.classe_c5": ["Groupe44", { oui: "/Choix2", non: "/Choix3" }],
  "aeronef2.captif": ["Groupe45", { oui: "/Choix4", non: "/Choix1" }],

  "aeronef3.classe_c5": ["Groupe46", { oui: "/Choix2", non: "/Choix1" }],
  "aeronef3.captif": ["Aeronef3CaptifGroup", { oui: "/0", non: "/1" }],

  "aeronef4.classe_c5": ["Aeronef4ClassC5Group", { oui: "/Choix2", non: "/Choix1" }],
  "aeronef4.captif": ["Groupe47", { oui: "/2", non: "/3" }],

  "aeronef5.classe_c5": ["Groupe48", { oui: "/Choix4", non: "/Choix3" }],
  "aeronef5.captif": ["Groupe49", { oui: "/Choix5", non: "/Choix1" }],

  "site1.vol_en_vue": ["Groupe50", { oui: "/Choix2", non: "/Choix1" }],
  "site2.vol_en_vue": ["Groupe51", { oui: "/Choix3", non: "/Choix1" }],

  "site1.aeronefs_choice": ["5", { "1": "/1", "2": "/2", "3": "/3", "4": "/4" }],
};

// Nom du champ radio "aéronefs utilisés" du site 1. Son état "tous" a un
// export value corrompu par un problème d'encodage dans le PDF officiel ->
// résolu dynamiquement au runtime (voir fillCerfa.ts), jamais codé en dur.
export const SITE1_AERONEFS_FIELD_NAME = "5";

// Engagements §7 cochés par défaut (attestations standards à chaque déclaration)
export const DEFAULT_ENGAGEMENTS_ON = [
  "engagement.sincerite",
  "engagement.info_non_garantie",
  "engagement.prefecture_peut_interdire",
  "engagement.respect_reglementation",
  "engagement.exactitude_documents",
  "engagement.assurance",
];

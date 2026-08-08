/**
 * Extraction des infos utiles depuis un "Dossier de vol" exporté par FlyBy
 * (by ASD). Comme le relevé AlphaTango, ce PDF n'a pas de champs de
 * formulaire (contrairement au Cerfa) : c'est un rapport mis en page en
 * texte/tableaux. On extrait donc par expressions régulières sur le texte
 * brut, validées contre un export réel (voir conversation).
 *
 * Particularité observée : selon la mise en page d'origine, le texte extrait
 * colle parfois le libellé et la valeur sur la même ligne sans séparateur
 * ("SociétéPaul Gonnet"), et parfois les met chacun sur leur propre ligne
 * ("Titre\nEllipse Bike"). Les regex ci-dessous suivent exactement le
 * comportement observé pour chaque champ plutôt qu'un schéma générique.
 *
 * Renvoie exactement la même forme que parseCerfa() (site1/dates/regime/
 * telepilote1/aeronef1) pour pouvoir être branché sur le même code d'import
 * déjà existant (NewMissionForm.tsx / ZoneManager.tsx), sans dupliquer la
 * logique de préremplissage.
 */

function between(text: string, startMarker: string, endMarker: string): string {
  const start = text.indexOf(startMarker);
  if (start === -1) return "";
  const from = start + startMarker.length;
  const end = text.indexOf(endMarker, from);
  return end === -1 ? text.slice(from) : text.slice(from, end);
}

export function parseFlyBy(text: string): { data: Record<string, any>; warnings: string[] } {
  const warnings: string[] = [];
  const data: Record<string, any> = {};

  const titreMatch = text.match(/\nTitre\n([^\n]+)/);
  const localisationMatch = text.match(/Localisation\n([^\n]+)/);
  const dateMatch = text.match(
    /\nDate\n(\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2}) au (\d{2}\/\d{2}\/\d{4}) (\d{2}):(\d{2})/
  );
  const hauteurMatch = text.match(/Hauteur maximum \(m[eè]tres\)\n(\d+(?:[.,]\d+)?)/i);
  const vitesseZoneMatch = text.match(/Vitesse maximale \(km\/h\)\n(\d+(?:[.,]\d+)?)/);
  const classifMatch = text.match(/suivante\s*:\s*\n([A-Z0-9\-]+)/);

  if (!titreMatch && !localisationMatch && !dateMatch) {
    warnings.push("Ce fichier ne ressemble pas à un dossier de vol FlyBy. Vérifiez le PDF déposé.");
    return { data, warnings };
  }

  // --- Zone de vol (Vue d'ensemble) ---
  const site1: Record<string, any> = {};
  if (titreMatch) site1.objet_mission = titreMatch[1].trim();
  if (localisationMatch) {
    const loc = localisationMatch[1].trim();
    site1.adresse = loc;
    const cpMatch = loc.match(/^(\d{4,5})\s*,\s*([^,]+)/);
    if (cpMatch) {
      site1.code_postal = cpMatch[1];
      site1.localite = cpMatch[2].trim();
    }
  }
  if (hauteurMatch) site1.hauteur_max_m = Number(hauteurMatch[1].replace(",", "."));

  const critereBlock = between(text, "3.1 - Crit", "3.2 - R");
  const contraintesListe = between(text, "4.1 - Liste", "4.2 - D");
  const enAgglo =
    /agglom[ée]ration ou[^\n]*rassemblement/i.test(critereBlock) || /Urbain/i.test(contraintesListe);
  site1.en_agglomeration = enAgglo;

  const noteParts: string[] = [];
  if (classifMatch) noteParts.push(`Classification FlyBy : ${classifMatch[1]}`);
  if (vitesseZoneMatch) noteParts.push(`Vitesse maximale autorisée : ${vitesseZoneMatch[1]} km/h`);
  if (noteParts.length > 0) site1.autres_infos = noteParts.join(". ") + ".";

  data.site1 = site1;

  // --- Dates ---
  if (dateMatch) {
    data.dates = {
      debut_date: dateMatch[1],
      debut_heure: dateMatch[2],
      debut_min: dateMatch[3],
      fin_date: dateMatch[4],
      fin_heure: dateMatch[5],
      fin_min: dateMatch[6],
    };
  } else {
    warnings.push("Dates de la mission non trouvées dans le PDF FlyBy.");
  }

  // --- Régime / classification ---
  if (classifMatch) {
    const code = classifMatch[1].toUpperCase();
    data.regime = {
      sous_categorie_a1: code.includes("A1"),
      sous_categorie_a2: code.includes("A2"),
      sous_categorie_a3: code.includes("A3"),
      sts01: code.includes("STS"),
      s3: !code.includes("A3") && code.includes("S3"),
    };
  }

  // --- Déclarant (adresse + contact) ---
  const declarantBlock = between(text, "2.1 - D", "2.2 - Pilote r");
  const adresseMatch = declarantBlock.match(/\nAdresse([^\n]+)/);
  const telDeclarantMatch = declarantBlock.match(/T[ée]l[ée]phone([\d .]+)/);
  const emailDeclarantMatch = declarantBlock.match(/Email([^\s\n]+@[^\s\n]+)/);

  // --- Pilote référent ---
  const piloteBlock = between(text, "2.2 - Pilote r", "2.3 - Machine");
  const prenomMatch = piloteBlock.match(/\nPr[ée]nom([^\n]+)/);
  const nomMatch = piloteBlock.match(/\nNom([^\n]+)/);
  const telPiloteMatch = piloteBlock.match(/T[ée]l[ée]phone([\d .]+)/);
  const emailPiloteMatch = piloteBlock.match(/Email([^\s\n]+@[^\s\n]+)/);

  if (prenomMatch || nomMatch) {
    data.telepilote1 = {
      prenom: prenomMatch ? prenomMatch[1].trim() : "",
      nom: nomMatch ? nomMatch[1].trim() : "",
      adresse: adresseMatch ? adresseMatch[1].trim() : "",
      telephone_portable: (telPiloteMatch || telDeclarantMatch)?.[1].trim() || "",
      courriel: (emailPiloteMatch || emailDeclarantMatch)?.[1].trim() || "",
    };
  } else {
    warnings.push("Identité du pilote référent non trouvée dans le PDF FlyBy.");
  }

  // --- Machine principale (drone) ---
  const droneDataBlock = between(text, "2.3.1 - Donn", "2.3.2 - ");
  const droneCompBlock = between(text, "2.3.3 - Informations compl", "3 - Classification");

  const marqueMatch = droneDataBlock.match(/\nMarque([^\n]+)/);
  const modeleMatch = droneDataBlock.match(/\nMod[eè]le([^\n]+)/);
  const classesMatch = droneDataBlock.match(/\nClasses([^\n]+)/);
  const masseMatch = droneDataBlock.match(/\nMasse([\d.,]+)/);
  const numSerieMatch = droneCompBlock.match(/\nNum[ée]ro de s[ée]rie([^\n]+)/);
  const numSignalementMatch = droneCompBlock.match(/distance\n([^\n]+)/);
  const numEnregistrementMatch = droneCompBlock.match(/\nNum[ée]ro d['’]enregistrement([^\n]+)/);

  if (marqueMatch || modeleMatch) {
    const classes = (classesMatch?.[1] || "").toUpperCase();
    data.aeronef1 = {
      constructeur: marqueMatch ? marqueMatch[1].trim() : "",
      modele: modeleMatch ? modeleMatch[1].trim() : "",
      type: "Drone",
      numero_serie: numSerieMatch ? numSerieMatch[1].trim() : "",
      masse_kg: masseMatch ? masseMatch[1].replace(",", ".") : "",
      classe_c5: classes.includes("C5") || classes.includes("C6") ? "oui" : "non",
      captif: "non",
      numero_enregistrement: numEnregistrementMatch ? numEnregistrementMatch[1].trim() : "",
      numero_signalement: numSignalementMatch ? numSignalementMatch[1].trim() : "",
    };
  } else {
    warnings.push("Informations du drone non trouvées dans le PDF FlyBy.");
  }

  return { data, warnings };
}

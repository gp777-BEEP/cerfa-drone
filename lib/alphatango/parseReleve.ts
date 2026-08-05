/**
 * Extraction des infos utiles depuis le "Relevé de situation d'exploitant
 * d'UAS" téléchargeable sur AlphaTango (Mon activité d'exploitant). Ce PDF
 * n'a pas de champs de formulaire (contrairement au Cerfa) : c'est un texte
 * mis en page en tableau. On extrait donc par expressions régulières sur le
 * texte brut, validé contre un relevé réel (voir conversation).
 *
 * Remonte le nom complet et le numéro SIREN/SIRET (équivalents directs côté
 * Cerfa), ainsi que le numéro d'enregistrement exploitant AlphaTango (format
 * FRAxxxxxxxxxxxx) : pas de champ correspondant sur le Cerfa, mais la
 * préfecture le demande parfois en complément -> gardé sur le profil pour
 * que l'utilisateur l'ait sous la main (identifiant professionnel, du même
 * ordre de sensibilité qu'un SIREN/SIRET, pas une donnée secrète).
 */

export type ReleveExploitant = {
  full_name?: string;
  siren_siret?: string;
  birth_date?: string; // JJ/MM/AAAA, indicatif seulement (le lieu de naissance n'est pas sur ce document)
  numero_exploitant?: string; // format FRAxxxxxxxxxxxx
};

function titleCaseIfAllCaps(word: string): string {
  if (word.length > 1 && word === word.toLocaleUpperCase("fr-FR") && word !== word.toLocaleLowerCase("fr-FR")) {
    return word.charAt(0) + word.slice(1).toLocaleLowerCase("fr-FR");
  }
  return word;
}

export function parseReleveExploitant(text: string): { data: ReleveExploitant; warnings: string[] } {
  const warnings: string[] = [];
  const data: ReleveExploitant = {};

  const nameMatch = text.match(/Nom\s*:\s*(?:Madame|Monsieur)\s+([^\n]+)/i);
  if (nameMatch) {
    const cleaned = nameMatch[1].trim().replace(/\s+/g, " ");
    data.full_name = cleaned.split(" ").map(titleCaseIfAllCaps).join(" ");
  } else {
    warnings.push("Nom de l'exploitant non trouvé dans le PDF.");
  }

  const sirenMatch = text.match(/Num[ée]ro d['’]identification\s*:\s*([0-9]{9,14})/i);
  if (sirenMatch) {
    data.siren_siret = sirenMatch[1];
  } else {
    warnings.push("Numéro SIREN/SIRET non trouvé dans le PDF.");
  }

  const birthMatch = text.match(/Date de naissance\s*:\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
  if (birthMatch) {
    data.birth_date = birthMatch[1];
  }

  const numExploitantMatch = text.match(/Num[ée]ro d['’]enregistrement\s*:\s*([A-Za-z0-9]+)/i);
  if (numExploitantMatch) {
    data.numero_exploitant = numExploitantMatch[1];
  }

  if (!nameMatch && !sirenMatch) {
    warnings.push(
      "Ce fichier ne ressemble pas à un relevé de situation d'exploitant AlphaTango. Vérifie le PDF déposé."
    );
  }

  return { data, warnings };
}

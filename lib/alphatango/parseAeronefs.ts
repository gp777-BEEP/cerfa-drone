/**
 * Parse le CSV "Liste des aéronefs" exporté depuis AlphaTango. Format
 * validé sur un export réel : séparateur ";", champs entre guillemets,
 * colonnes dans cet ordre : Numéro d'enregistrement, Date de fin de
 * validité, Type d'aéronef, Constructeur, Modèle, Numéro de série, Plage
 * de masse, Identifiant de signalement électronique, Statut.
 */

export type AlphaTangoDrone = {
  constructeur: string;
  modele: string;
  type: string;
  numero_serie: string;
  masse_kg: string;
  classe_c5: "oui" | "non";
  captif: "oui" | "non";
  numero_enregistrement: string;
  numero_signalement: string;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ";" && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

export function parseAeronefsCsv(text: string): { drones: AlphaTangoDrone[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { drones: [], warnings: ["Fichier CSV vide ou illisible."] };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (needle: string) => header.findIndex((h) => h.includes(needle));

  const iEnregistrement = idx("enregistrement");
  const iType = idx("type");
  const iConstructeur = idx("constructeur");
  const iModele = idx("modèle");
  const iSerie = idx("série");
  const iMasse = idx("masse");
  const iSignalement = idx("signalement");
  const iStatut = idx("statut");

  if (iEnregistrement === -1 || iConstructeur === -1) {
    return {
      drones: [],
      warnings: ["Colonnes attendues introuvables. Vérifie que c'est bien l'export \"Liste des aéronefs\" d'AlphaTango."],
    };
  }

  const drones: AlphaTangoDrone[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    if (cells.length < 3) continue;
    if (iStatut !== -1 && cells[iStatut] && !/valide/i.test(cells[iStatut])) {
      continue; // on saute les enregistrements expirés/invalides
    }
    drones.push({
      constructeur: cells[iConstructeur] || "",
      modele: iModele !== -1 ? cells[iModele] || "" : "",
      type: iType !== -1 ? cells[iType] || "" : "Drone",
      numero_serie: iSerie !== -1 ? cells[iSerie] || "" : "",
      // AlphaTango donne une plage ("800 g ≤ M ≤ 2 kg") avec des symboles
      // mathématiques que la police du Cerfa ne sait pas afficher.
      masse_kg: iMasse !== -1 ? (cells[iMasse] || "").replace(/≤/g, "<=").replace(/≥/g, ">=") : "",
      classe_c5: "non",
      captif: "non",
      numero_enregistrement: cells[iEnregistrement] || "",
      numero_signalement: iSignalement !== -1 ? cells[iSignalement] || "" : "",
    });
  }

  if (drones.length === 0) {
    warnings.push("Aucun aéronef valide trouvé dans le fichier.");
  }

  return { drones, warnings };
}

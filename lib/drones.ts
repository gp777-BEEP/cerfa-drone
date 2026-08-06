// Type + petits utilitaires partagés partout où on manipule une liste de
// drones (profil, sélection par mission, import Cerfa/AlphaTango) : évite de
// dupliquer la même forme d'objet et la même logique de clé/fusion dans
// chaque composant.

export type Drone = {
  constructeur?: string;
  modele?: string;
  type?: string;
  numero_serie?: string;
  masse_kg?: string | number;
  classe_c5?: "oui" | "non";
  captif?: "oui" | "non";
  numero_enregistrement?: string;
  numero_signalement?: string;
};

// Clé d'identité d'un drone : le n° d'enregistrement UAS s'il est renseigné
// (identifiant officiel unique), sinon constructeur+modèle en dernier
// recours (mieux que rien pour dédupliquer un import).
export function droneKey(d: Drone): string {
  return d.numero_enregistrement?.trim() || `${d.constructeur || ""}-${d.modele || ""}`.trim().toLowerCase();
}

export function droneLabel(d: Drone): string {
  const name = [d.constructeur, d.modele].filter(Boolean).join(" ") || "Drone sans nom";
  return d.numero_enregistrement ? `${name} · ${d.numero_enregistrement}` : name;
}

// Fusionne deux listes de drones en dédupliquant par clé ; en cas de
// doublon, la valeur de `b` l'emporte (utile pour rafraîchir un drone du
// profil avec une version plus complète trouvée dans un import).
export function mergeDroneLists(a: Drone[], b: Drone[]): Drone[] {
  const map = new Map<string, Drone>();
  for (const d of a) map.set(droneKey(d), d);
  for (const d of b) map.set(droneKey(d), d);
  return Array.from(map.values());
}

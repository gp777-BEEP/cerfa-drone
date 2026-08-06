// Partagé entre NewMissionForm.tsx (création) et MissionAnswersFields.tsx
// (édition après création, sur la page de la mission) : mêmes questions,
// même aide, donc une seule source pour les deux.

export type Question = { key: string; label: string; type: "text" | "textarea" | "boolean" | "number" };

// Les questions viennent de mission_types.question_schema (catalogue en base,
// cf. schema.sql) : les clés sont donc connues à l'avance même si le libellé
// exact peut varier d'un type de mission à l'autre. On rattache l'aide au
// Cerfa par clé plutôt que par libellé pour rester robuste à ces variantes.
export const QUESTION_HINTS: Record<string, string> = {
  contexte: "Décrit brièvement le déroulement du vol et son objectif. Sert à compléter l'« Objet de la mission » du Cerfa.",
  objet_inspecte: "Ce qui est survolé ou inspecté (bâtiment, ligne électrique, toiture...). Sert à compléter l'« Objet de la mission » du Cerfa.",
  presence_public: "Correspond à la case « à proximité d'un rassemblement de personnes » du Cerfa, à cocher pour chaque zone de vol concernée.",
  presence_public_detail: "Décrit le rassemblement ou l'événement (marché, foule, manifestation...), repris dans les informations de la zone de vol sur le Cerfa.",
  hauteur_max: "Hauteur maximale de vol au-dessus du sol, en mètres, telle que déclarée sur le Cerfa pour chaque zone.",
  eloignement_max: "Distance maximale, en mètres, entre le télépilote et le drone pendant le vol, telle que déclarée sur le Cerfa pour chaque zone.",
};

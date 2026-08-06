-- Ajoute la "Description du site" (case du Cerfa) sur chaque zone.
-- Le PDF officiel n'a pas de champ texte remplissable pour ce descriptif,
-- seulement la case à cocher "descriptif joint séparément" : ce texte est
-- donc inclus comme page dédiée dans le dossier PDF généré (cf.
-- lib/cerfa/zoneCards.ts et app/api/generate-dossier/route.ts).

alter table zones add column if not exists description_site text;

-- Métadonnées de la carte générée pour une zone (position/texte de l'échelle,
-- attribution OSM, présence d'un point télépilote) : utilisées pour dessiner
-- le texte par-dessus l'image lors de la génération du dossier PDF, plutôt
-- que d'essayer d'intégrer du texte directement dans l'image (qui ne
-- s'affichait pas correctement en production, cf. conversation).
alter table zones add column if not exists map_meta jsonb;

-- Numéro d'enregistrement exploitant AlphaTango (format FRAxxxxxxxxxxxx),
-- parfois demandé par la préfecture en plus du SIREN/SIRET. Import
-- automatique depuis le "Relevé de situation d'exploitant" AlphaTango.
alter table profiles add column if not exists numero_exploitant text;

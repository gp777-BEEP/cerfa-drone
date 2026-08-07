-- A exécuter dans Supabase (SQL Editor > New query) en plus des migrations
-- précédentes : remplace le bloc "questions sur la mission" (qui posait des
-- questions par zone, redondant et confus) par les 2 champs mission-level
-- réellement présents en haut du Cerfa 15476*04 (déjà mappés dans
-- fieldMap.ts sous dates.raisons_horaires/dates.prescriptions_restrictives,
-- mais jamais alimentés jusqu'ici, faute de colonnes en base). Sans risque
-- de doublon si relancé.

alter table missions add column if not exists raisons_horaires text;
alter table missions add column if not exists prescriptions_restrictives text;

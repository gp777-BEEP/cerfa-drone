-- Corrige un bug : la colonne "drones" n'a jamais existé sur la table
-- profiles (oubliée dans le schema.sql d'origine), donc l'enregistrement des
-- drones échouait silencieusement. À exécuter dans Supabase SQL Editor.

alter table profiles add column if not exists drones jsonb default '[]';

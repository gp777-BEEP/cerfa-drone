-- A exécuter dans Supabase (SQL Editor > New query) en plus des migrations
-- précédentes : ajoute le choix du style d'intégration du logo/de la
-- couleur (bandeau, page de garde, filigrane, ou combiné). Sans risque de
-- doublon si tu relances ce fichier plusieurs fois.

alter table profiles add column if not exists dossier_style text default 'filigrane';

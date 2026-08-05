-- Ajoute la possibilité d'archiver une mission (elle reste, juste masquée
-- par défaut du tableau de bord). La suppression, elle, ne touche pas au
-- schéma : elle utilise juste "delete" sur la ligne existante (les zones et
-- documents liés sont déjà en "on delete cascade").
alter table missions add column if not exists archived boolean default false;

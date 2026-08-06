-- Drones sélectionnés pour cette mission précise (sous-ensemble ou ajout
-- ponctuel par rapport aux drones enregistrés dans le profil). Si null ou
-- vide, le dossier généré retombe sur tous les drones du profil (ancien
-- comportement, pour ne pas casser les missions déjà créées).
alter table missions add column if not exists drones jsonb;

-- Sépare l'adresse du profil (rue / code postal / ville) au lieu d'un seul
-- champ texte libre, retour bêta-testeur : plus fiable à relire/saisir.
-- L'ancienne colonne "address" est conservée (composée automatiquement à
-- partir des 3 nouvelles à chaque enregistrement du profil) : rien d'autre
-- dans l'app n'a besoin d'être migré.
alter table profiles add column if not exists address_street text;
alter table profiles add column if not exists address_postal_code text;
alter table profiles add column if not exists address_city text;

-- A exécuter dans Supabase (SQL Editor > New query) en plus des migrations
-- précédentes : ajoute la personnalisation du dossier généré (logo + couleur
-- d'accent, affichés en filigrane discret sur les fiches de zone et la page
-- de garde -- jamais sur le Cerfa officiel lui-même). Sans risque de doublon
-- si tu relances ce fichier plusieurs fois.

alter table profiles add column if not exists logo_path text;
alter table profiles add column if not exists brand_color text;

insert into storage.buckets (id, name, public) values ('logos', 'logos', false)
  on conflict (id) do nothing;

drop policy if exists "Upload de son propre logo" on storage.objects;
create policy "Upload de son propre logo"
  on storage.objects for insert
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Lecture de son propre logo" on storage.objects;
create policy "Lecture de son propre logo"
  on storage.objects for select
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Suppression de son propre logo" on storage.objects;
create policy "Suppression de son propre logo"
  on storage.objects for delete
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

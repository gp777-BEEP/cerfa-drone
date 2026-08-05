-- A exécuter dans Supabase (SQL Editor > New query) en plus du schema.sql
-- déjà lancé : ajoute juste la table "suggestions" pour la nouvelle page du
-- même nom. Sans risque de doublon si tu relances ce fichier plusieurs fois.

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

alter table suggestions enable row level security;

drop policy if exists "Un utilisateur cree et voit ses propres suggestions" on suggestions;
create policy "Un utilisateur cree et voit ses propres suggestions"
  on suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

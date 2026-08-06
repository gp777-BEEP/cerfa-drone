-- Schéma de base de données pour le site Cerfa Drone.
-- À exécuter dans Supabase : Project > SQL Editor > New query > coller > Run.

-- ---------------------------------------------------------------------------
-- 1. Profils (infos exploitant/télépilote réutilisables sur toutes les missions)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  address text,
  phone text,
  email text,
  qualite text default 'Télépilote',
  siren_siret text,
  numero_exploitant text, -- numéro d'enregistrement AlphaTango (FRAxxxxxxxxxxxx), parfois demandé par la préfecture
  drones jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Un utilisateur voit et modifie son propre profil"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Crée automatiquement un profil vide à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Types de mission (catalogue évolutif de questionnaires)
-- ---------------------------------------------------------------------------
create table if not exists mission_types (
  slug text primary key,
  label text not null,
  description text,
  question_schema jsonb not null default '[]', -- liste de questions {key,label,type,options}
  sort_order int default 0,
  created_at timestamptz default now()
);

-- lecture publique du catalogue (pas de données sensibles)
alter table mission_types enable row level security;
create policy "Catalogue de types de mission lisible par tous les connectés"
  on mission_types for select
  using (auth.role() = 'authenticated');

insert into mission_types (slug, label, description, question_schema, sort_order) values
  ('video', 'Prise de vue / vidéo', 'Captation photo ou vidéo aérienne', '[
    {"key":"contexte","label":"Contexte de la prise de vue","type":"textarea"},
    {"key":"presence_public","label":"Y aura-t-il du public à proximité ?","type":"boolean"},
    {"key":"presence_public_detail","label":"Si oui, décrire (rassemblement, événement...)","type":"text"},
    {"key":"hauteur_max","label":"Hauteur maximale de vol envisagée (m)","type":"number"},
    {"key":"eloignement_max","label":"Éloignement maximal du télépilote (m)","type":"number"}
  ]', 1),
  ('inspection', 'Inspection technique', 'Inspection de bâtiment, ouvrage, ligne, toiture...', '[
    {"key":"objet_inspecte","label":"Objet inspecté (bâtiment, ligne, toiture...)","type":"text"},
    {"key":"presence_public","label":"Zone accessible au public pendant le vol ?","type":"boolean"},
    {"key":"hauteur_max","label":"Hauteur maximale de vol envisagée (m)","type":"number"},
    {"key":"eloignement_max","label":"Éloignement maximal du télépilote (m)","type":"number"}
  ]', 2),
  ('autre', 'Autre mission', 'Tout autre type de mission', '[
    {"key":"contexte","label":"Décris ta mission","type":"textarea"},
    {"key":"presence_public","label":"Y aura-t-il du public à proximité ?","type":"boolean"},
    {"key":"hauteur_max","label":"Hauteur maximale de vol envisagée (m)","type":"number"},
    {"key":"eloignement_max","label":"Éloignement maximal du télépilote (m)","type":"number"}
  ]', 99)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Missions
-- ---------------------------------------------------------------------------
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_type text not null references mission_types(slug),
  title text not null,
  status text not null default 'draft', -- draft | ready | dossier_genere
  archived boolean default false,
  answers jsonb not null default '{}',
  date_debut date,
  heure_debut text,
  date_fin date,
  heure_fin text,
  regime jsonb not null default '{}', -- {categorie_ouverte, sous_categorie_a1/a2/a3, sts01, s3}
  drones jsonb, -- sous-ensemble des drones du profil utilisés pour CETTE mission ; null/vide = tous les drones du profil (comportement par défaut)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table missions enable row level security;
create policy "Un utilisateur gère ses propres missions"
  on missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Zones de vol (une ou plusieurs par mission)
-- ---------------------------------------------------------------------------
create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  order_index int default 0,
  title text,
  code_postal text,
  localite text,
  adresse text,
  en_agglomeration boolean default false,
  rassemblement boolean default false,
  rassemblement_description text,
  distance_max_m numeric,
  hauteur_max_m numeric,
  notes text,
  image_paths text[] default '{}', -- chemins dans le bucket "zone-images"
  map_meta jsonb, -- position/texte de l'échelle + attribution OSM (dessinés en PDF par-dessus l'image)
  created_at timestamptz default now()
);

alter table zones enable row level security;
create policy "Un utilisateur gère les zones de ses propres missions"
  on zones for all
  using (exists (select 1 from missions m where m.id = zones.mission_id and m.user_id = auth.uid()))
  with check (exists (select 1 from missions m where m.id = zones.mission_id and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Documents générés (dossiers PDF)
-- ---------------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  file_path text not null, -- chemin dans le bucket "dossiers"
  created_at timestamptz default now()
);

alter table documents enable row level security;
create policy "Un utilisateur voit les documents de ses propres missions"
  on documents for all
  using (exists (select 1 from missions m where m.id = documents.mission_id and m.user_id = auth.uid()))
  with check (exists (select 1 from missions m where m.id = documents.mission_id and m.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 6. Buckets de stockage (images de zones + dossiers générés), privés
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('zone-images', 'zone-images', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('dossiers', 'dossiers', false)
  on conflict (id) do nothing;

create policy "Upload images de zone dans son propre dossier"
  on storage.objects for insert
  with check (bucket_id = 'zone-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Lecture de ses propres images de zone"
  on storage.objects for select
  using (bucket_id = 'zone-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Lecture de ses propres dossiers générés"
  on storage.objects for select
  using (bucket_id = 'dossiers' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 7. Suggestions (retours utilisateurs sur de futures fonctionnalités)
-- ---------------------------------------------------------------------------
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

alter table suggestions enable row level security;
create policy "Un utilisateur cree et voit ses propres suggestions"
  on suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

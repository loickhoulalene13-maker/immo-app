-- Demandes de démo envoyées depuis la page de présentation (/presentation).
-- Les visiteurs peuvent seulement AJOUTER une demande : personne ne peut les lire
-- avec la clé publique. Vous les consultez dans Supabase (Table Editor).

create table if not exists public.demandes_demo (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(nom) between 2 and 120),
  agence text check (agence is null or char_length(agence) <= 160),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone text check (telephone is null or char_length(telephone) <= 40),
  taille text check (taille is null or taille in ('1', '2-5', '6-15', '16+')),
  message text check (message is null or char_length(message) <= 2000),
  traitee boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.demandes_demo enable row level security;

drop policy if exists demandes_demo_ajout on public.demandes_demo;
create policy demandes_demo_ajout on public.demandes_demo
  for insert to anon, authenticated
  with check (traitee = false);

grant insert on public.demandes_demo to anon, authenticated;

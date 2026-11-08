-- Abonnements : essai gratuit de 30 jours puis abonnement Stripe, une ligne par agence.
-- Les utilisateurs peuvent LIRE l'abonnement de leur agence, jamais le modifier.
-- Seul le serveur de l'app (avec la clé de synchronisation) met à jour ces lignes,
-- via la fonction abonnement_synchro. Aucune clé service_role n'est nécessaire.

create extension if not exists pgcrypto;

-- 1. Paramètres privés (schéma non exposé par l'API)
create schema if not exists prive;
revoke all on schema prive from public, anon, authenticated;
create table if not exists prive.parametres (
  cle text primary key,
  valeur text not null
);
revoke all on prive.parametres from public, anon, authenticated;
-- Clé partagée entre la base et le serveur de l'app (variable CLE_SYNCHRO_ABONNEMENT sur Vercel)
insert into prive.parametres (cle, valeur)
values ('cle_synchro_abonnement', encode(gen_random_bytes(32), 'hex'))
on conflict (cle) do nothing;

-- 2. Table des abonnements
create table if not exists public.abonnements (
  agence_id               uuid primary key references public.agences(id) on delete cascade,
  essai_fin               timestamptz not null default (now() + interval '30 days'),
  acces_offert            boolean not null default false,   -- accès gratuit permanent (vous, comptes de démo)
  formule                 text check (formule is null or formule in ('essentiel', 'agence')),
  statut                  text not null default 'essai'
                          check (statut in ('essai', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  fin_periode             timestamptz,
  resiliation_prevue      boolean not null default false,
  updated_at              timestamptz not null default now()
);

alter table public.abonnements enable row level security;
drop policy if exists abonnements_lecture on public.abonnements;
create policy abonnements_lecture on public.abonnements for select using (public.est_membre(agence_id));
revoke insert, update, delete on public.abonnements from anon, authenticated;
grant select on public.abonnements to authenticated;

-- 3. Chaque nouvelle agence démarre avec 30 jours d'essai
create or replace function public.abonnement_nouvelle_agence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.abonnements (agence_id) values (new.id) on conflict (agence_id) do nothing;
  return new;
end $$;

drop trigger if exists agences_abonnement on public.agences;
create trigger agences_abonnement after insert on public.agences
  for each row execute function public.abonnement_nouvelle_agence();

-- Agences déjà créées : 30 jours d'essai à partir d'aujourd'hui
insert into public.abonnements (agence_id)
select id from public.agences
on conflict (agence_id) do nothing;

-- 4. Mise à jour depuis le serveur de l'app (webhook Stripe et retour de paiement)
create or replace function public.abonnement_synchro(
  p_cle text,
  p_agence uuid,
  p_customer text,
  p_subscription text,
  p_statut text,
  p_formule text,
  p_fin_periode timestamptz,
  p_resiliation boolean
) returns boolean
language plpgsql security definer set search_path = public, prive as $$
declare v_ok boolean;
begin
  select (valeur = p_cle) into v_ok from prive.parametres where cle = 'cle_synchro_abonnement';
  if not coalesce(v_ok, false) then
    raise exception 'Clé de synchronisation invalide';
  end if;
  if p_statut is not null and p_statut not in ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;

  insert into public.abonnements as a (agence_id, stripe_customer_id, stripe_subscription_id, statut, formule, fin_periode, resiliation_prevue, updated_at)
  values (p_agence, p_customer, p_subscription, coalesce(p_statut, 'essai'), p_formule, p_fin_periode, coalesce(p_resiliation, false), now())
  on conflict (agence_id) do update set
    stripe_customer_id     = coalesce(excluded.stripe_customer_id, a.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, a.stripe_subscription_id),
    statut                 = coalesce(p_statut, a.statut),
    formule                = coalesce(excluded.formule, a.formule),
    fin_periode            = coalesce(excluded.fin_periode, a.fin_periode),
    resiliation_prevue     = coalesce(p_resiliation, a.resiliation_prevue),
    updated_at             = now();
  return true;
end $$;

revoke all on function public.abonnement_synchro(text, uuid, text, text, text, text, timestamptz, boolean) from public;
grant execute on function public.abonnement_synchro(text, uuid, text, text, text, text, timestamptz, boolean) to anon, authenticated;

-- 5. Affiche la clé à copier dans Vercel (CLE_SYNCHRO_ABONNEMENT)
select valeur as "CLE_SYNCHRO_ABONNEMENT (à copier dans Vercel)" from prive.parametres where cle = 'cle_synchro_abonnement';

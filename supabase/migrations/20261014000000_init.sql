-- =====================================================================
-- IMMO Suite : schéma initial
-- Multi-agences : chaque ligne porte un agence_id, la RLS limite l'accès
-- aux membres de l'agence.
-- Modules : Opportunités (contacts, recherches), Pilot (biens, visites),
-- Qualité (contrôle des annonces), Sécurité (offres, transactions),
-- Assistant IA (objections, textes générés), tableau de bord (alertes, tâches).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.type_bien      as enum ('appartement','maison','terrain','local');
create type public.statut_bien    as enum ('brouillon','en_vente','sous_offre','vendu','retire');
create type public.classe_energie as enum ('A','B','C','D','E','F','G');
create type public.role_membre    as enum ('admin','agent');
create type public.statut_visite  as enum ('planifiee','faite','annulee');
create type public.statut_offre   as enum ('en_attente','acceptee','refusee','retiree');
create type public.statut_tx      as enum ('en_cours','signee','annulee');
create type public.niveau         as enum ('info','warn','crit');
create type public.type_texte_ia  as enum ('synthese_visite','analyse_bien','rapport_vendeur','relance_acheteur','proposition_bien');

-- ---------------------------------------------------------------------
-- Agences et membres
-- ---------------------------------------------------------------------
create table public.agences (
  id                        uuid primary key default gen_random_uuid(),
  nom                       text not null,
  seuil_stagnation_jours    int  not null default 60,
  seuil_stagnation_visites  int  not null default 5,
  seuil_relance_jours       int  not null default 21,
  created_at                timestamptz not null default now()
);

create table public.membres (
  agence_id    uuid not null references public.agences(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.role_membre not null default 'agent',
  nom_affiche  text,
  created_at   timestamptz not null default now(),
  primary key (agence_id, user_id)
);
create index on public.membres (user_id);

-- Prix de référence au m² par ville (agence_id null = valeur commune à toutes les agences)
create table public.marche_reference (
  id         uuid primary key default gen_random_uuid(),
  agence_id  uuid references public.agences(id) on delete cascade,
  ville      text not null,
  prix_m2    int  not null check (prix_m2 > 0),
  mis_a_jour date not null default current_date
);
create unique index marche_reference_unique on public.marche_reference (coalesce(agence_id,'00000000-0000-0000-0000-000000000000'::uuid), lower(ville));

-- ---------------------------------------------------------------------
-- IMMO Opportunités : contacts (acheteurs et vendeurs) et recherches
-- ---------------------------------------------------------------------
create table public.contacts (
  id                 uuid primary key default gen_random_uuid(),
  agence_id          uuid not null references public.agences(id) on delete cascade,
  agent_id           uuid references auth.users(id) on delete set null,
  nom                text not null,
  email              text,
  telephone          text,
  est_acheteur       boolean not null default false,
  est_vendeur        boolean not null default false,
  source             text,
  notes              text,
  dernier_contact_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.contacts (agence_id);
create index on public.contacts (agence_id, dernier_contact_at) where est_acheteur;

-- Un acheteur peut avoir plusieurs recherches actives
create table public.recherches (
  id           uuid primary key default gen_random_uuid(),
  agence_id    uuid not null references public.agences(id) on delete cascade,
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  budget_max   int  not null check (budget_max > 0),
  villes       text[] not null default '{}',
  types        public.type_bien[] not null default '{}',
  surface_min  numeric(7,2),
  pieces_min   int,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.recherches (agence_id) where active;
create index on public.recherches (contact_id);

-- ---------------------------------------------------------------------
-- IMMO Pilot : biens, photos, visites
-- ---------------------------------------------------------------------
create sequence public.biens_reference_seq start 2001;

create table public.biens (
  id                uuid primary key default gen_random_uuid(),
  agence_id         uuid not null references public.agences(id) on delete cascade,
  reference         text,
  vendeur_id        uuid references public.contacts(id) on delete set null,
  agent_id          uuid references auth.users(id) on delete set null,
  type              public.type_bien not null default 'appartement',
  titre             text not null,
  description       text not null default '',
  adresse           text,
  code_postal       text,
  ville             text not null,
  surface           numeric(7,2) not null check (surface > 0),   -- surface Carrez pour un lot de copropriété
  pieces            int not null check (pieces > 0),
  chambres          int not null default 0 check (chambres >= 0),
  etage             int,
  ascenseur         boolean not null default false,
  prix              int not null check (prix > 0),
  dpe               public.classe_energie,
  ges               public.classe_energie,
  charges_annuelles int,
  taxe_fonciere     int,
  statut            public.statut_bien not null default 'brouillon',
  mandat_signe_le   date,
  publie_le         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (agence_id, reference)
);
create index on public.biens (agence_id, statut);
create index on public.biens (vendeur_id);

create table public.photos (
  id            uuid primary key default gen_random_uuid(),
  agence_id     uuid not null references public.agences(id) on delete cascade,
  bien_id       uuid not null references public.biens(id) on delete cascade,
  storage_path  text,                 -- chemin dans le bucket photos-biens : <agence_id>/<bien_id>/<fichier>
  libelle       text not null,        -- Séjour, Cuisine, Chambre 1…
  position      int not null default 0,
  signalement   text check (signalement in ('floue','sombre','doublon','personne','autre')),
  created_at    timestamptz not null default now()
);
create index on public.photos (bien_id, position);

create table public.visites (
  id           uuid primary key default gen_random_uuid(),
  agence_id    uuid not null references public.agences(id) on delete cascade,
  bien_id      uuid not null references public.biens(id) on delete cascade,
  acheteur_id  uuid references public.contacts(id) on delete set null,
  agent_id     uuid references auth.users(id) on delete set null,
  date_visite  timestamptz not null,
  statut       public.statut_visite not null default 'planifiee',
  note         smallint check (note between 1 and 5),
  retour       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.visites (bien_id, date_visite);
create index on public.visites (agence_id, statut, date_visite);

-- ---------------------------------------------------------------------
-- Assistant IA : catégories d'objection, objections détectées, textes générés
-- ---------------------------------------------------------------------
create table public.categories_objection (
  code             text primary key,
  libelle          text not null,
  motif            text not null,      -- expression régulière (insensible à la casse) pour la détection par règle
  action_suggeree  text not null,
  ordre            int not null default 0
);

create table public.objections_visite (
  visite_id   uuid not null references public.visites(id) on delete cascade,
  agence_id   uuid not null references public.agences(id) on delete cascade,
  categorie   text not null references public.categories_objection(code),
  source      text not null default 'regle' check (source in ('regle','ia','agent')),
  extrait     text,
  created_at  timestamptz not null default now(),
  primary key (visite_id, categorie, source)
);

create table public.textes_ia (
  id           uuid primary key default gen_random_uuid(),
  agence_id    uuid not null references public.agences(id) on delete cascade,
  type         public.type_texte_ia not null,
  bien_id      uuid references public.biens(id) on delete cascade,
  contact_id   uuid references public.contacts(id) on delete set null,
  visite_id    uuid references public.visites(id) on delete set null,
  donnees      jsonb not null default '{}',   -- sortie structurée (objections, actions, scores)
  texte        text,                          -- message rédigé, modifiable par l'agent
  modele       text,                          -- ex. gpt-4o-mini, ou 'regles'
  envoye_le    timestamptz,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on public.textes_ia (bien_id, type, created_at desc);
create index on public.textes_ia (contact_id, type, created_at desc);

-- ---------------------------------------------------------------------
-- IMMO Sécurité : offres, transactions, étapes, documents
-- ---------------------------------------------------------------------
create table public.offres (
  id                  uuid primary key default gen_random_uuid(),
  agence_id           uuid not null references public.agences(id) on delete cascade,
  bien_id             uuid not null references public.biens(id) on delete cascade,
  acheteur_id         uuid not null references public.contacts(id) on delete restrict,
  montant             int not null check (montant > 0),
  statut              public.statut_offre not null default 'en_attente',
  faite_le            date not null default current_date,
  repondue_le         date,
  compromis_prevu_le  date,
  conditions          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.offres (bien_id, statut);

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  agence_id     uuid not null references public.agences(id) on delete cascade,
  bien_id       uuid not null references public.biens(id) on delete restrict,
  offre_id      uuid references public.offres(id) on delete set null,
  acheteur_id   uuid not null references public.contacts(id) on delete restrict,
  prix          int not null,
  compromis_le  date,
  acte_prevu_le date,
  statut        public.statut_tx not null default 'en_cours',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index transactions_une_active_par_bien on public.transactions (bien_id) where statut = 'en_cours';

create table public.etapes_transaction (
  id              uuid primary key default gen_random_uuid(),
  agence_id       uuid not null references public.agences(id) on delete cascade,
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  ordre           int not null,
  code            text not null,
  libelle         text not null,
  echeance        date,
  faite_le        date,
  unique (transaction_id, code)
);
create index on public.etapes_transaction (agence_id, echeance) where faite_le is null;

create table public.documents_transaction (
  id              uuid primary key default gen_random_uuid(),
  agence_id       uuid not null references public.agences(id) on delete cascade,
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  libelle         text not null,
  obligatoire     boolean not null default true,
  recu_le         date,
  storage_path    text   -- bucket documents-transactions : <agence_id>/<transaction_id>/<fichier>
);
create index on public.documents_transaction (transaction_id);

-- ---------------------------------------------------------------------
-- Tableau de bord : alertes et tâches
-- cle_unique évite les doublons quand les alertes sont recalculées
-- ---------------------------------------------------------------------
create table public.alertes (
  id              uuid primary key default gen_random_uuid(),
  agence_id       uuid not null references public.agences(id) on delete cascade,
  niveau          public.niveau not null,
  module          text not null,
  titre           text not null,
  detail          text,
  bien_id         uuid references public.biens(id) on delete cascade,
  transaction_id  uuid references public.transactions(id) on delete cascade,
  contact_id      uuid references public.contacts(id) on delete cascade,
  cle_unique      text not null,
  created_at      timestamptz not null default now(),
  resolue_le      timestamptz
);
create unique index alertes_ouvertes_unique on public.alertes (agence_id, cle_unique) where resolue_le is null;

create table public.taches (
  id           uuid primary key default gen_random_uuid(),
  agence_id    uuid not null references public.agences(id) on delete cascade,
  agent_id     uuid references auth.users(id) on delete set null,
  titre        text not null,
  detail       text,
  priorite     smallint not null default 2 check (priorite between 1 and 3),
  echeance     date,
  faite_le     timestamptz,
  source       text not null default 'manuelle' check (source in ('manuelle','auto')),
  cle_unique   text,
  bien_id      uuid references public.biens(id) on delete cascade,
  contact_id   uuid references public.contacts(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  created_at   timestamptz not null default now()
);
create unique index taches_auto_unique on public.taches (agence_id, cle_unique) where cle_unique is not null;
create index on public.taches (agence_id, faite_le, priorite);

-- =====================================================================
-- Fonctions utilitaires
-- =====================================================================
create or replace function public.est_membre(p_agence uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres m where m.agence_id = p_agence and m.user_id = auth.uid());
$$;

create or replace function public.est_admin(p_agence uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membres m where m.agence_id = p_agence and m.user_id = auth.uid() and m.role = 'admin');
$$;

-- Création d'une agence : l'utilisateur connecté en devient administrateur
create or replace function public.creer_agence(p_nom text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  insert into public.agences (nom) values (p_nom) returning id into v_id;
  insert into public.membres (agence_id, user_id, role) values (v_id, auth.uid(), 'admin');
  return v_id;
end $$;

create or replace function public.maj_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['contacts','recherches','biens','visites','offres','transactions'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.maj_updated_at()', t||'_updated_at', t);
  end loop;
end $$;

-- Référence lisible : AIX-2001, MAR-2002…
create or replace function public.biens_reference()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := upper(left(regexp_replace(translate(new.ville,'ÉÈÊËÀÂÄÎÏÔÖÛÜÙÇéèêëàâäîïôöûüùç','EEEEAAAIIOOUUUCeeeeaaaiioouuuc'),'[^A-Za-z]','','g'),3))
                     || '-' || nextval('public.biens_reference_seq');
  end if;
  return new;
end $$;
create trigger biens_reference before insert on public.biens for each row execute function public.biens_reference();

-- =====================================================================
-- IMMO Qualité : contrôle d'une annonce
-- Prend une ligne de biens pour pouvoir contrôler la version en cours de
-- modification (déclencheur BEFORE UPDATE).
-- =====================================================================
create or replace function public.controle_annonce(b public.biens)
returns table (niveau public.niveau, categorie text, message text)
language plpgsql stable set search_path = public as $$
#variable_conflict use_column
declare
  v_ref     int;
  v_ecart   numeric;
  v_nb      int;
  v_ph      record;
begin
  if b.dpe is null then
    return query select 'crit'::niveau, 'manquant', 'Classe énergie (DPE) absente : elle est obligatoire dans l''annonce.';
  end if;
  if b.ges is null then
    return query select 'crit'::niveau, 'manquant', 'Classe climat (GES) absente : elle est obligatoire dans l''annonce.';
  end if;
  if b.type = 'appartement' and b.charges_annuelles is null then
    return query select 'warn'::niveau, 'manquant', 'Charges annuelles de copropriété non renseignées.';
  end if;
  if b.taxe_fonciere is null then
    return query select 'info'::niveau, 'manquant', 'Taxe foncière non renseignée.';
  end if;
  if length(coalesce(b.description,'')) < 250 then
    return query select 'warn'::niveau, 'manquant', format('Description courte (%s caractères, 250 conseillés).', length(coalesce(b.description,'')));
  end if;

  select m.prix_m2 into v_ref
  from marche_reference m
  where lower(m.ville) = lower(b.ville) and (m.agence_id = b.agence_id or m.agence_id is null)
  order by m.agence_id nulls last limit 1;
  if v_ref is not null then
    v_ecart := (b.prix / b.surface) / v_ref - 1;
    if abs(v_ecart) > 0.20 then
      return query select 'warn'::niveau, 'incoherence',
        format('Prix au m² de %s €, écart de %s%s %% avec le marché local (environ %s €).',
               round(b.prix / b.surface), case when v_ecart > 0 then '+' else '' end, round(v_ecart * 100), v_ref);
    end if;
  end if;

  if b.pieces > 1 and b.chambres >= b.pieces then
    return query select 'crit'::niveau, 'incoherence', format('%s chambres pour %s pièces : le séjour n''est pas compté.', b.chambres, b.pieces);
  end if;
  if b.surface / b.pieces < 11 then
    return query select 'warn'::niveau, 'incoherence', format('Surface par pièce faible (%s m²) : vérifier la surface ou le nombre de pièces.', round(b.surface / b.pieces, 1));
  end if;
  if b.description ~* 'ascenseur' and b.description !~* 'sans ascenseur' and not b.ascenseur then
    return query select 'crit'::niveau, 'incoherence', 'La description mentionne un ascenseur, la fiche indique qu''il n''y en a pas.';
  end if;

  select count(*) into v_nb from photos p where p.bien_id = b.id;
  if v_nb < 8 then
    return query select 'warn'::niveau, 'photos', format('%s photo(s) seulement (8 conseillées au minimum).', v_nb);
  end if;
  for v_ph in select p.libelle, p.signalement from photos p where p.bien_id = b.id and p.signalement is not null order by p.position loop
    return query select 'warn'::niveau, 'photos', format('Photo « %s » %s : à remplacer avant publication.', v_ph.libelle,
      case v_ph.signalement when 'floue' then 'floue' when 'sombre' then 'trop sombre' when 'doublon' then 'en double'
                            when 'personne' then 'avec une personne visible' else 'signalée' end);
  end loop;
  if b.type = 'appartement' and v_nb > 0 and not exists (select 1 from photos p where p.bien_id = b.id and p.libelle ~* 'cuisine|kitchenette') then
    return query select 'info'::niveau, 'photos', 'Aucune photo de la cuisine.';
  end if;
end $$;

-- Variante par identifiant, pratique depuis le client (supabase.rpc)
create or replace function public.controle_annonce_par_id(p_bien uuid)
returns table (niveau public.niveau, categorie text, message text)
language sql stable set search_path = public as $$
  select c.* from public.biens b, lateral public.controle_annonce(b) c where b.id = p_bien;
$$;

create or replace function public.score_qualite(b public.biens)
returns int language sql stable set search_path = public as $$
  select greatest(0, 100
    - 20 * count(*) filter (where c.niveau = 'crit')
    -  8 * count(*) filter (where c.niveau = 'warn')
    -  3 * count(*) filter (where c.niveau = 'info'))::int
  from public.controle_annonce(b) c;
$$;

-- Publication bloquée tant qu'un point critique reste ouvert
create or replace function public.biens_garde_publication()
returns trigger language plpgsql set search_path = public as $$
declare v_msg text;
begin
  if new.statut = 'en_vente' and (tg_op = 'INSERT' or old.statut is distinct from 'en_vente') then
    select string_agg(c.message, ' ') into v_msg from public.controle_annonce(new) c where c.niveau = 'crit';
    if v_msg is not null then
      raise exception 'Publication bloquée : %', v_msg using errcode = 'check_violation';
    end if;
    new.publie_le := coalesce(new.publie_le, now());
  end if;
  return new;
end $$;
create trigger biens_garde_publication before insert or update of statut on public.biens
  for each row execute function public.biens_garde_publication();

-- =====================================================================
-- Rapprochement bien / recherche (score sur 100)
-- ville 35, budget 30 (18 si dépassement ≤ 6 %), surface 20, pièces 15
-- =====================================================================
create or replace function public.score_rapprochement(b public.biens, r public.recherches)
returns int language sql immutable as $$
  select case
    when b.prix > r.budget_max * 1.06 then 0
    when cardinality(r.villes) > 0
         and not (lower(b.ville) = any (array(select lower(v) from unnest(r.villes) v))) then 0
    when cardinality(r.types) > 0 and not (b.type = any (r.types)) then 0
    when r.surface_min is not null and b.surface < r.surface_min * 0.8 then 0   -- trop petit : pas de rapprochement
    else 35
       + case when b.prix <= r.budget_max then 30 else 18 end
       + case when r.surface_min is null or b.surface >= r.surface_min then 20
              when b.surface >= r.surface_min * 0.9 then 10 else 0 end
       + case when r.pieces_min is null or b.pieces >= r.pieces_min then 15
              when b.pieces = r.pieces_min - 1 then 6 else 0 end
  end;
$$;

create view public.v_rapprochements with (security_invoker = true) as
select * from (
  select b.agence_id, b.id as bien_id, r.contact_id as acheteur_id, r.id as recherche_id,
         public.score_rapprochement(b, r) as score
  from public.biens b
  join public.recherches r on r.agence_id = b.agence_id and r.active
  where b.statut in ('brouillon','en_vente')
) s
where s.score >= 60;

-- =====================================================================
-- Détection des objections par règle (en attendant ou en complément de l'IA)
-- =====================================================================
create or replace function public.visites_detecter_objections()
returns trigger language plpgsql set search_path = public as $$
begin
  delete from public.objections_visite where visite_id = new.id and source = 'regle';
  if new.retour is not null and new.retour <> '' then
    insert into public.objections_visite (visite_id, agence_id, categorie, source, extrait)
    select new.id, new.agence_id, c.code, 'regle', substring(new.retour from '(?i)(' || c.motif || ')')
    from public.categories_objection c
    where new.retour ~* c.motif;
  end if;
  return new;
end $$;
create trigger visites_detecter_objections after insert or update of retour on public.visites
  for each row execute function public.visites_detecter_objections();

-- Une visite faite met à jour la date de dernier contact de l'acheteur
create or replace function public.visites_maj_contact()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.statut = 'faite' and new.acheteur_id is not null then
    update public.contacts
       set dernier_contact_at = greatest(coalesce(dernier_contact_at, '-infinity'), new.date_visite)
     where id = new.acheteur_id;
  end if;
  return new;
end $$;
create trigger visites_maj_contact after insert or update of statut on public.visites
  for each row execute function public.visites_maj_contact();

-- Un message IA marqué envoyé compte comme un contact
create or replace function public.textes_ia_maj_contact()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.envoye_le is not null and (tg_op = 'INSERT' or old.envoye_le is null) and new.contact_id is not null then
    update public.contacts
       set dernier_contact_at = greatest(coalesce(dernier_contact_at, '-infinity'), new.envoye_le)
     where id = new.contact_id;
  end if;
  return new;
end $$;
create trigger textes_ia_maj_contact after insert or update of envoye_le on public.textes_ia
  for each row execute function public.textes_ia_maj_contact();

create view public.v_objections_bien with (security_invoker = true) as
with nb as (
  select bien_id, count(*) as nb_visites from public.visites where statut = 'faite' group by bien_id
)
select v.agence_id, v.bien_id, o.categorie, c.libelle, c.action_suggeree,
       count(distinct v.id) as nb, nb.nb_visites,
       (count(distinct v.id) >= 2 or count(distinct v.id)::numeric / nb.nb_visites >= 0.4) as recurrente
from public.visites v
join public.objections_visite o on o.visite_id = v.id
join public.categories_objection c on c.code = o.categorie
join nb on nb.bien_id = v.bien_id
where v.statut = 'faite'
group by v.agence_id, v.bien_id, o.categorie, c.libelle, c.action_suggeree, c.ordre, nb.nb_visites;

-- =====================================================================
-- IMMO Pilot : suivi et stagnation
-- =====================================================================
create view public.v_biens_suivi with (security_invoker = true) as
select b.id as bien_id, b.agence_id, b.reference, b.titre, b.ville, b.type, b.prix, b.surface,
       round(b.prix / b.surface) as prix_m2, b.statut,
       case when b.publie_le is null then null else current_date - b.publie_le::date end as jours_en_ligne,
       count(v.id) filter (where v.statut = 'faite') as nb_visites,
       count(v.id) filter (where v.statut = 'faite' and v.date_visite >= now() - interval '30 days') as nb_visites_30j,
       max(v.date_visite) filter (where v.statut = 'faite') as derniere_visite,
       round(avg(v.note) filter (where v.statut = 'faite'), 1) as note_moyenne,
       exists (select 1 from public.offres o where o.bien_id = b.id and o.statut in ('en_attente','acceptee')) as offre_en_cours,
       public.score_qualite(b) as score_qualite
from public.biens b
left join public.visites v on v.bien_id = b.id
group by b.id;

create view public.v_biens_stagnants with (security_invoker = true) as
select s.*, a.seuil_stagnation_jours, a.seuil_stagnation_visites
from public.v_biens_suivi s
join public.agences a on a.id = s.agence_id
where s.statut = 'en_vente'
  and not s.offre_en_cours
  and (s.jours_en_ligne >= a.seuil_stagnation_jours or s.nb_visites >= a.seuil_stagnation_visites);

-- =====================================================================
-- IMMO Opportunités : prospects oubliés, vendeurs sans compte rendu
-- =====================================================================
create view public.v_prospects_oublies with (security_invoker = true) as
select c.id as contact_id, c.agence_id, c.nom, c.dernier_contact_at,
       (current_date - c.dernier_contact_at::date) as jours_sans_contact,
       (select count(*) from public.v_rapprochements r
         join public.biens b on b.id = r.bien_id and b.statut = 'en_vente'
        where r.acheteur_id = c.id) as nb_biens_adaptes
from public.contacts c
join public.agences a on a.id = c.agence_id
where c.est_acheteur
  and exists (select 1 from public.recherches r where r.contact_id = c.id and r.active)
  and (c.dernier_contact_at is null or c.dernier_contact_at < now() - make_interval(days => a.seuil_relance_jours));

create view public.v_vendeurs_suivi with (security_invoker = true) as
select c.id as contact_id, c.agence_id, c.nom, b.id as bien_id, b.reference, b.statut,
       (select max(t.envoye_le) from public.textes_ia t
         where t.bien_id = b.id and t.type = 'rapport_vendeur' and t.envoye_le is not null) as dernier_rapport_le
from public.contacts c
join public.biens b on b.vendeur_id = c.id
where c.est_vendeur;

-- =====================================================================
-- IMMO Sécurité : création de la transaction à l'acceptation d'une offre
-- Échéances calculées à partir du compromis (prévu à J+10 s'il n'est pas fixé)
-- =====================================================================
create or replace function public.offres_acceptation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tx    uuid;
  v_rep   date := coalesce(new.repondue_le, current_date);
  v_comp  date := coalesce(new.compromis_prevu_le, coalesce(new.repondue_le, current_date) + 10);
begin
  if new.statut <> 'acceptee' or (tg_op = 'UPDATE' and old.statut = 'acceptee') then
    return new;
  end if;

  update public.biens set statut = 'sous_offre' where id = new.bien_id;
  update public.offres set statut = 'refusee', repondue_le = v_rep
   where bien_id = new.bien_id and id <> new.id and statut = 'en_attente';

  insert into public.transactions (agence_id, bien_id, offre_id, acheteur_id, prix, compromis_le, acte_prevu_le)
  values (new.agence_id, new.bien_id, new.id, new.acheteur_id, new.montant, v_comp, v_comp + 90)
  returning id into v_tx;

  insert into public.etapes_transaction (agence_id, transaction_id, ordre, code, libelle, echeance, faite_le)
  select new.agence_id, v_tx, e.ordre, e.code, e.libelle, e.echeance, e.faite_le
  from (values
    (1, 'offre_acceptee', 'Offre acceptée',                         v_rep,        v_rep),
    (2, 'compromis',      'Signature du compromis',                 v_comp,       null::date),
    (3, 'retractation',   'Fin du délai de rétractation (10 j)',    v_comp + 10,  null),
    (4, 'depot_pret',     'Dépôt des demandes de prêt',             v_comp + 15,  null),
    (5, 'offre_pret',     'Obtention de l''offre de prêt',          v_comp + 45,  null),
    (6, 'preemption',     'Purge du droit de préemption',           v_comp + 55,  null),
    (7, 'acte',           'Signature de l''acte authentique',       v_comp + 90,  null)
  ) as e(ordre, code, libelle, echeance, faite_le);

  insert into public.documents_transaction (agence_id, transaction_id, libelle)
  select new.agence_id, v_tx, d from unnest(array[
    'Diagnostics techniques (DDT)', 'Titre de propriété', 'PV d''AG des 3 dernières années',
    'Règlement de copropriété', 'Pré-état daté du syndic', 'Attestation de dépôt de prêt'
  ]) d;

  return new;
end $$;
create trigger offres_acceptation after insert or update of statut on public.offres
  for each row execute function public.offres_acceptation();

-- Signature de l'acte : transaction signée, bien vendu
create or replace function public.etapes_acte_signe()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.code = 'acte' and new.faite_le is not null and old.faite_le is null then
    update public.transactions set statut = 'signee' where id = new.transaction_id;
    update public.biens set statut = 'vendu'
     where id = (select bien_id from public.transactions where id = new.transaction_id);
  end if;
  return new;
end $$;
create trigger etapes_acte_signe after update of faite_le on public.etapes_transaction
  for each row execute function public.etapes_acte_signe();

create view public.v_transactions_suivi with (security_invoker = true) as
select t.id as transaction_id, t.agence_id, t.bien_id, b.reference, t.acheteur_id, c.nom as acheteur,
       t.prix, t.compromis_le, t.acte_prevu_le, t.statut,
       count(e.id) filter (where e.faite_le is null and e.echeance < current_date) as etapes_en_retard,
       min(e.echeance) filter (where e.faite_le is null) as prochaine_echeance,
       (select count(*) from public.documents_transaction d where d.transaction_id = t.id and d.recu_le is null and d.obligatoire) as documents_manquants
from public.transactions t
join public.biens b on b.id = t.bien_id
join public.contacts c on c.id = t.acheteur_id
left join public.etapes_transaction e on e.transaction_id = t.id
group by t.id, b.reference, c.nom;

-- =====================================================================
-- Tableau de bord : alertes et tâches calculées, puis synchronisées
-- =====================================================================
create view public.v_alertes_calculees with (security_invoker = true) as
select s.agence_id, 'crit'::public.niveau as niveau, 'pilot' as module,
       s.reference || ' stagne sur le marché' as titre,
       concat_ws(' · ', s.jours_en_ligne || ' jours en ligne', s.nb_visites || ' visites sans offre') as detail,
       s.bien_id, null::uuid as transaction_id, null::uuid as contact_id,
       'stagnation:' || s.bien_id as cle_unique
from public.v_biens_stagnants s
union all
select e.agence_id, 'crit', 'securite', e.libelle || ' en retard',
       b.reference || ' · échéance dépassée depuis ' || (current_date - e.echeance) || ' jours',
       t.bien_id, t.id, t.acheteur_id, 'retard:' || e.id
from public.etapes_transaction e
join public.transactions t on t.id = e.transaction_id and t.statut = 'en_cours'
join public.biens b on b.id = t.bien_id
where e.faite_le is null and e.echeance < current_date
union all
select b.agence_id, 'warn', 'qualite', 'Annonce ' || b.reference || ' bloquée',
       q.nb || ' point(s) critique(s) avant publication', b.id, null, null, 'qualite:' || b.id
from public.biens b
cross join lateral (select count(*) as nb from public.controle_annonce(b) c where c.niveau = 'crit') q
where b.statut = 'brouillon' and q.nb > 0
union all
select p.agence_id, 'warn', 'opportunites', p.nom || ' sans contact depuis ' || coalesce(p.jours_sans_contact::text, '?') || ' jours',
       p.nb_biens_adaptes || ' bien(s) adapté(s) en portefeuille', null, null, p.contact_id, 'oubli:' || p.contact_id
from public.v_prospects_oublies p;

create view public.v_taches_calculees with (security_invoker = true) as
select agence_id, 1::smallint as priorite, 'Envoyer un compte rendu au vendeur de ' || split_part(titre, ' stagne', 1) as titre,
       detail, bien_id, null::uuid as contact_id, null::uuid as transaction_id, 'rapport:' || bien_id as cle_unique
from public.v_alertes_calculees where module = 'pilot'
union all
select agence_id, 1, 'Relancer : ' || lower(titre), detail, bien_id, contact_id, transaction_id, 'relance_tx:' || cle_unique
from public.v_alertes_calculees where module = 'securite'
union all
select agence_id, 2, 'Compléter l''annonce ' || replace(replace(titre, 'Annonce ', ''), ' bloquée', ''), detail, bien_id, null, null, 'completer:' || bien_id
from public.v_alertes_calculees where module = 'qualite'
union all
select agence_id, 2, 'Relancer ' || split_part(titre, ' sans contact', 1), detail, null, contact_id, null, 'relance:' || contact_id
from public.v_alertes_calculees where module = 'opportunites'
union all
select d.agence_id, 3, 'Obtenir : ' || d.libelle, 'Transaction ' || b.reference, t.bien_id, null, t.id, 'document:' || d.id
from public.documents_transaction d
join public.transactions t on t.id = d.transaction_id and t.statut = 'en_cours'
join public.biens b on b.id = t.bien_id
where d.recu_le is null and d.obligatoire;

-- À appeler depuis l'app après chaque modification importante, et une fois par jour (pg_cron ou n8n)
create or replace function public.rafraichir_alertes(p_agence uuid)
returns table (alertes_ouvertes int, taches_ouvertes int)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.est_membre(p_agence) then
    raise exception 'Accès refusé';
  end if;

  insert into public.alertes (agence_id, niveau, module, titre, detail, bien_id, transaction_id, contact_id, cle_unique)
  select agence_id, niveau, module, titre, detail, bien_id, transaction_id, contact_id, cle_unique
  from public.v_alertes_calculees where agence_id = p_agence
  on conflict (agence_id, cle_unique) where resolue_le is null
  do update set titre = excluded.titre, detail = excluded.detail;

  update public.alertes a set resolue_le = now()
  where a.agence_id = p_agence and a.resolue_le is null
    and not exists (select 1 from public.v_alertes_calculees c where c.agence_id = p_agence and c.cle_unique = a.cle_unique);

  insert into public.taches (agence_id, titre, detail, priorite, source, cle_unique, bien_id, contact_id, transaction_id)
  select agence_id, titre, detail, priorite, 'auto', cle_unique, bien_id, contact_id, transaction_id
  from public.v_taches_calculees where agence_id = p_agence
  on conflict (agence_id, cle_unique) where cle_unique is not null
  do update set detail = excluded.detail
  where public.taches.faite_le is null;

  -- Une tâche automatique qui n'a plus lieu d'être et n'a pas été faite est retirée
  delete from public.taches t
  where t.agence_id = p_agence and t.source = 'auto' and t.faite_le is null
    and not exists (select 1 from public.v_taches_calculees c where c.agence_id = p_agence and c.cle_unique = t.cle_unique);

  return query select
    (select count(*)::int from public.alertes where agence_id = p_agence and resolue_le is null),
    (select count(*)::int from public.taches  where agence_id = p_agence and faite_le is null);
end $$;

create view public.v_tableau_de_bord with (security_invoker = true) as
select a.id as agence_id,
  (select count(*) from public.biens b where b.agence_id = a.id and b.statut = 'en_vente') as biens_en_vente,
  (select coalesce(sum(prix),0) from public.biens b where b.agence_id = a.id and b.statut = 'en_vente') as volume_en_vente,
  (select count(*) from public.contacts c where c.agence_id = a.id and c.est_acheteur) as acheteurs,
  (select count(*) from public.visites v where v.agence_id = a.id and v.statut = 'faite' and v.date_visite >= now() - interval '30 days') as visites_30j,
  (select count(*) from public.transactions t where t.agence_id = a.id and t.statut = 'en_cours') as transactions_en_cours,
  (select count(*) from public.alertes al where al.agence_id = a.id and al.resolue_le is null) as alertes_ouvertes,
  (select count(*) from public.taches tk where tk.agence_id = a.id and tk.faite_le is null) as taches_ouvertes
from public.agences a;

-- =====================================================================
-- Sécurité : RLS
-- =====================================================================
alter table public.agences enable row level security;
create policy agences_lecture on public.agences for select using (public.est_membre(id));
create policy agences_modif   on public.agences for update using (public.est_admin(id)) with check (public.est_admin(id));

alter table public.membres enable row level security;
create policy membres_lecture on public.membres for select using (public.est_membre(agence_id));
create policy membres_ajout   on public.membres for insert with check (public.est_admin(agence_id));
create policy membres_modif   on public.membres for update using (public.est_admin(agence_id)) with check (public.est_admin(agence_id));
create policy membres_retrait on public.membres for delete using (public.est_admin(agence_id) or user_id = auth.uid());

alter table public.marche_reference enable row level security;
create policy marche_lecture on public.marche_reference for select using (agence_id is null or public.est_membre(agence_id));
create policy marche_ecriture on public.marche_reference for all
  using (agence_id is not null and public.est_admin(agence_id)) with check (agence_id is not null and public.est_admin(agence_id));

alter table public.categories_objection enable row level security;
create policy categories_lecture on public.categories_objection for select to authenticated using (true);

do $$
declare t text;
begin
  foreach t in array array['contacts','recherches','biens','photos','visites','objections_visite','textes_ia',
                           'offres','transactions','etapes_transaction','documents_transaction','alertes','taches'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.est_membre(agence_id)) with check (public.est_membre(agence_id))', t || '_agence', t);
  end loop;
end $$;

-- =====================================================================
-- Stockage : photos des biens et pièces des transactions
-- Les chemins commencent par l'identifiant de l'agence.
-- =====================================================================
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values
      ('photos-biens', 'photos-biens', false),
      ('documents-transactions', 'documents-transactions', false)
    on conflict (id) do nothing;

    execute $p$
      create policy "fichiers par agence" on storage.objects for all to authenticated
      using (bucket_id in ('photos-biens','documents-transactions')
             and public.est_membre(((storage.foldername(name))[1])::uuid))
      with check (bucket_id in ('photos-biens','documents-transactions')
             and public.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end $$;

-- =====================================================================
-- Données de référence
-- =====================================================================
insert into public.categories_objection (code, libelle, motif, action_suggeree, ordre) values
  ('prix',          'Prix',              'prix|cher|budget|trop élevé|surévalu|baisse',
   'Ouvrir une discussion avec le vendeur sur une révision de prix de 4 à 6 %, appuyée sur les ventes comparables du secteur.', 1),
  ('travaux',       'Travaux / cuisine', 'travaux|cuisine|rénov|vétuste|salle de bain|datée',
   'Faire chiffrer les travaux par un artisan et joindre le devis à l''annonce.', 2),
  ('luminosite',    'Luminosité',        'sombre|manque de lumière|peu de lumière|exposition nord',
   'Programmer les visites en milieu de journée et refaire les photos en lumière naturelle.', 3),
  ('bruit',         'Bruit',             'bruit|bruyant',
   'Mettre en avant le double vitrage et proposer des visites en soirée.', 4),
  ('stationnement', 'Stationnement',     'parking|stationnement|se garer',
   'Repérer une place à louer à proximité et indiquer son prix dans l''annonce.', 5),
  ('energie',       'Énergie',           'dpe|chauffage|isolation|passoire|énergie',
   'Joindre une estimation des factures et les aides à la rénovation possibles.', 6),
  ('charges',       'Charges',           'charges|syndic',
   'Détailler les charges et les travaux votés au dernier PV d''assemblée générale.', 7);

insert into public.marche_reference (ville, prix_m2) values
  ('Aix-en-Provence', 5400), ('Marseille 6e', 4300), ('Marseille 8e', 5200),
  ('Aubagne', 3500), ('La Ciotat', 4900), ('Vitrolles', 2900);

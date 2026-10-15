# IMMO Suite

Application web pour agences immobilières : tableau de bord, biens, contrôle des annonces, visites et objections.
Next.js 15 (App Router) + Supabase.

## Lancer en local

Il faut Node.js 20 ou plus récent.

```bash
npm install
cp .env.local.example .env.local   # puis remplir les deux valeurs
npm run dev
```

Ouvrir http://localhost:3000 et se connecter avec le compte créé dans Supabase (Authentication → Users).

`.env.local` contient uniquement l'URL du projet et la clé **anon**. La clé service_role ne va jamais dans ce projet.

## Ce qui est en place

| Page | Contenu | Source Supabase |
|---|---|---|
| `/login` | Connexion e-mail + mot de passe | Supabase Auth |
| `/` | Indicateurs, alertes, tâches (cochables), visites à venir | `v_tableau_de_bord`, `alertes`, `taches`, `visites` |
| `/biens` | Cartes des biens avec jours en ligne, visites, score qualité, badge « Stagne » | `v_biens_suivi`, `v_biens_stagnants` |
| `/biens/[id]` | Fiche : contrôle de l'annonce, acheteurs compatibles, visites, saisie d'un retour, objections et actions, bouton Publier | `controle_annonce_par_id`, `v_rapprochements`, `v_objections_bien` |

Les règles métier sont dans la base (`supabase/migrations`). Le bouton Publier affiche directement le refus de la base si un point critique reste ouvert.
Chaque action (retour de visite, publication) relance `rafraichir_alertes`.

## Structure

```
src/
  app/
    login/            connexion et déconnexion
    (app)/            pages protégées : tableau de bord, biens
      actions.ts      actions serveur (visites, publication, tâches)
  lib/
    supabase/         clients serveur et middleware de session
    agence.ts         agence de l'utilisateur connecté
    format.ts         formats € / dates / typologies
  middleware.ts       redirige vers /login sans session
supabase/
  migrations/         schéma de la base (déjà appliqué)
  seed.sql            données de démonstration
```

## Modules suivants

Prospects (IMMO Opportunités), Annonces (IMMO Qualité), Transactions (IMMO Sécurité) et Assistant IA apparaissent dans le menu avec la mention « bientôt ». Les vues SQL correspondantes existent déjà.

## Mise en ligne

Pousser sur GitHub, importer le dépôt dans Vercel, renseigner les deux variables d'environnement, déployer.
Dans Supabase → Authentication → URL Configuration, ajouter l'URL Vercel dans « Site URL ».

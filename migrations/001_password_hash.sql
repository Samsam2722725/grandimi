-- 001 — colonne password_hash sur users
--
-- À exécuter dans Supabase → SQL Editor.
--
-- Sans elle, /api/v1/auth/signup et /api/v1/auth/login répondent 500 :
--   pq: column "password_hash" of relation "users" does not exist
-- Autrement dit personne ne peut créer de compte ni se connecter.
--
-- Le schéma n'était versionné nulle part (aucun .sql dans le dépôt),
-- il vivait uniquement dans l'interface Supabase — c'est précisément
-- pourquoi cette colonne a pu manquer sans que rien ne le signale.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Colonnes attendues par le code sur "users", pour référence :
--   id                   uuid, clé primaire
--   email                text, unique
--   is_premium           boolean
--   whop_customer_id     text
--   whop_subscription_id text
--   consent_parental     boolean
--   password_hash        text   <- ajoutée ici
--   created_at           timestamptz

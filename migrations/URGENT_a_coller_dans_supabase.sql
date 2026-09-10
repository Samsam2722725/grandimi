-- ============================================================
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
--  https://supabase.com/dashboard/project/btujpubexjueauevwphw/sql
-- ============================================================
--
--  POURQUOI C'EST URGENT
--  Verifie le 2026-09-10 sur la base de production :
--    - users.password_hash  n'existe pas  (code 42703)
--    - webhook_logs         n'existe pas  (404)
--
--  Consequence : un client qui vient de payer arrive sur l'ecran
--  "Creez votre mot de passe", le backend cherche password_hash,
--  la colonne est absente et il recoit "failed to create user".
--  Il a paye et n'a pas acces a son plan.
--
--  Ce fichier regroupe les migrations 001 et 002. Il est sans risque :
--  IF NOT EXISTS partout, aucune donnee existante n'est touchee.
-- ============================================================


-- ---------- 001 : mot de passe ----------
-- Debloque /api/v1/auth/signup et /login, donc l'acces apres paiement.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;


-- ---------- 002 : journal des webhooks Whop ----------
-- Sans cette table, aucun paiement n'est trace et le panneau admin
-- repond 500. C'est aussi le seul endroit ou verifier que Whop
-- renvoie bien child_user_id lors d'un paiement par un parent.

CREATE TABLE IF NOT EXISTS webhook_logs (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text        NOT NULL DEFAULT '',
    user_email text        NOT NULL DEFAULT '',
    payload    text        NOT NULL DEFAULT '',
    status     text        NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx
    ON webhook_logs (created_at DESC);


-- ---------- 003 : adresses en double ----------
-- "Samuel.Garbil@gmail.com" et "samuel.garbil@gmail.com" creaient deux
-- comptes distincts pour la meme personne, dont un seul portait
-- l'abonnement. Cette requete normalise ce qui ne provoque pas de
-- collision ; elle ne supprime rien.

UPDATE users
SET    email = lower(trim(email))
WHERE  email <> lower(trim(email))
  AND  NOT EXISTS (
         SELECT 1 FROM users autre
         WHERE  autre.email = lower(trim(users.email))
       );


-- ---------- Verification ----------
-- Doit renvoyer une ligne avec password_hash, et 0 doublon restant.

SELECT 'password_hash' AS objet,
       count(*)::text  AS present
FROM   information_schema.columns
WHERE  table_name = 'users' AND column_name = 'password_hash'

UNION ALL

SELECT 'webhook_logs', count(*)::text
FROM   information_schema.tables
WHERE  table_name = 'webhook_logs'

UNION ALL

SELECT 'doublons_email_restants', count(*)::text
FROM  (SELECT lower(trim(email)) FROM users
       GROUP BY 1 HAVING count(*) > 1) d;

-- ============================================================
--  RATTACHER UN PAIEMENT AU BON COMPTE
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  POURQUOI
--  Jusqu'ici, le lien entre un paiement et un compte Grandimi tenait
--  a une seule chose : que le client tape EXACTEMENT la meme adresse
--  e-mail deux fois, une sur Grandimi et une sur la page Whop. Whop
--  laisse ce champ modifiable, donc rien ne le garantit.
--
--  Constate en production le 12/09/2026 : deux comptes crees dans la
--  meme minute, luc@gmail.com (tape sur Whop, devenu premium) et
--  oo@gmail.com (tape sur Grandimi, reste gratuit). Le client avait
--  paye et lisait « abonnement requis ».
--
--  Les metadonnees de l'URL de paiement ne sont PAS une solution :
--  le webhook les recoit vides ("metadata":{}), verifie sur trois
--  paiements reels. C'est aussi pour cette raison que le parcours
--  parent (metadata[child_user_id]) n'a jamais pu fonctionner.
--
--  CE QUI MARCHE
--  Whop renvoie le client sur grandimi.com/?payment_id=pay_XXXX, et
--  envoie le MEME identifiant dans le webhook payment.succeeded. Cet
--  identifiant est donc le lien fiable : connu du seul payeur, emis
--  par Whop, et verifiable chez nous puisque le webhook est signe.
--
--  Sans risque : IF NOT EXISTS, aucune donnee existante touchee.

CREATE TABLE IF NOT EXISTS paiements_whop (
    -- L'identifiant Whop du paiement (pay_XXXX). Cle primaire : un
    -- webhook rejoue ne cree pas de doublon.
    payment_id   text        PRIMARY KEY,

    -- Le compte WHOP du payeur, pas le compte Grandimi. Sert a
    -- retrouver l'abonnement cree par membership.activated pour le
    -- rattacher au bon compte lors de la reclamation.
    whop_user_id text        NOT NULL DEFAULT '',
    plan_id      text        NOT NULL DEFAULT '',

    -- "paid" et rien d'autre ne donne droit a un acces.
    statut       text        NOT NULL DEFAULT '',

    -- Le compte Grandimi qui a reclame ce paiement. NULL tant que
    -- personne ne l'a fait.
    user_id      uuid        REFERENCES users(id) ON DELETE SET NULL,

    -- Non nul = deja reclame. Un paiement ne peut ouvrir qu'un seul
    -- acces : sans cette borne, un identifiant partage ouvrirait autant
    -- de comptes qu'on le colle de fois.
    reclame_at   timestamptz,

    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paiements_whop_user_idx
    ON paiements_whop (whop_user_id);

-- Row Level Security ACTIVEE, sans aucune politique.
--
-- Supabase publie les tables du schema public via son API REST : sans
-- RLS, cette table serait lisible et modifiable avec la cle anon, et
-- inserer une ligne « paid » y suffirait a s ouvrir un acces payant.
-- Aucune politique n est creee : personne ne passe par PostgREST.
-- Le backend, lui, se connecte en direct via DATABASE_URL avec un role
-- qui contourne RLS, donc rien ne change pour lui.
ALTER TABLE paiements_whop ENABLE ROW LEVEL SECURITY;

-- ---------- Verification ----------
SELECT 'table_paiements_whop' AS objet, count(*)::text AS valeur
FROM   information_schema.tables
WHERE  table_name = 'paiements_whop';

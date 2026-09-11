-- ============================================================
--  Un seul enregistrement par abonnement Whop
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  Whop rejoue membership.activated à CHAQUE renouvellement, avec le
--  même membership id (mem_xxx). CreateSubscription faisait un INSERT
--  sec : un abonné mensuel créait donc une ligne par mois pour le même
--  abonnement. La lecture restait juste (GetLatestSubscription prend la
--  plus récente), mais la table grossissait sans fin et le panneau admin
--  affichait des doublons.
--
--  Cette contrainte permet le ON CONFLICT du nouveau CreateSubscription.

-- 1. Dédoublonner l'existant : on garde la ligne la plus récente de
--    chaque abonnement. Sans ça, la création de l'index unique échoue.
DELETE FROM subscriptions a
USING  subscriptions b
WHERE  a.whop_subscription_id = b.whop_subscription_id
  AND  a.whop_subscription_id IS NOT NULL
  AND  a.created_at < b.created_at;

-- 2. Contrainte d'unicité, index simple et non partiel : un index
--    partiel ne peut pas servir de cible à ON CONFLICT (whop_subscription_id)
--    sans répéter son prédicat côté requête. Inutile ici : Postgres
--    considère deux NULL comme distincts, donc plusieurs lignes sans
--    identifiant Whop restent permises.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_whop_id_key
    ON subscriptions (whop_subscription_id);

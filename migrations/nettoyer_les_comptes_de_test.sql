-- ============================================================
--  NETTOYER LES COMPTES DE TEST
--  A coller dans Supabase -> SQL Editor -> Run
--  https://supabase.com/dashboard/project/btujpubexjueauevwphw/sql
--
--  /!\ Ce fichier ne s'execute PAS dans PowerShell ni dans un
--      terminal : le SQL ne se tape que dans cet editeur-la.
-- ============================================================
--
--  POURQUOI
--  Les parcours de test ont laisse des comptes en base (granny-test-*,
--  verif-*, migration-check-*). Ils n'ont aucun abonnement et aucun
--  effet sur le site, mais ils faussent le compteur d'utilisateurs du
--  panneau admin.
--
--  LA SECURITE
--  Un compte ne peut partir que s'il remplit TOUTES ces conditions :
--    1. son adresse suit un motif de test (voir comptes_de_test) ;
--    2. il n'a aucune ligne dans subscriptions ;
--    3. il n'est pas marque is_premium.
--  Donc meme si un vrai client portait une adresse ressemblant a un
--  test, il ne serait pas supprime : son abonnement le protege.
--
--  COMMENT PROCEDER
--  Lancer l'ETAPE 1 seule, lire la liste, et ne lancer l'ETAPE 2 que si
--  cette liste ne contient que des comptes de test.
-- ============================================================


-- ---------- ETAPE 1 : voir ce qui partirait (ne supprime rien) ----------

WITH comptes_de_test AS (
    SELECT u.id, u.email, u.created_at
    FROM   users u
    WHERE  (   u.email LIKE 'granny-test-%'
            OR u.email LIKE 'verif-%'
            OR u.email LIKE 'migration-check-%'
            OR u.email LIKE 'audit-%'
            OR u.email LIKE '%@grandimi.test')
      AND  COALESCE(u.is_premium, false) = false
      AND  NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id)
)
SELECT email,
       created_at,
       (SELECT count(*) FROM predictions p WHERE p.user_id = c.id)       AS estimations,
       (SELECT count(*) FROM task_completions t WHERE t.user_id = c.id)  AS taches_cochees
FROM   comptes_de_test c
ORDER BY created_at;


-- ---------- ETAPE 2 : supprimer (apres avoir lu l'etape 1) ----------
-- Tout est dans une transaction : si une ligne pose probleme, rien ne
-- part. Les enfants sont retires avant le compte pour ne pas heurter
-- les cles etrangeres.

--  AVANT DE LANCER : le plan Supabase Free ne sauvegarde RIEN
--  (« Free Plan does not include project backups »). Une suppression
--  est donc definitive. Cette etape copie les lignes dans une table
--  de secours AVANT de les retirer ; si on s est trompe, elles sont
--  encore la. La table porte la date pour qu on sache quoi jeter
--  plus tard.

BEGIN;

CREATE TABLE IF NOT EXISTS sauvegarde_comptes_test AS
SELECT u.*, now() AS supprime_le
FROM   users u
WHERE  (   u.email LIKE 'granny-test-%'
        OR u.email LIKE 'verif-%'
        OR u.email LIKE 'migration-check-%'
        OR u.email LIKE 'audit-%'
        OR u.email LIKE '%@grandimi.test')
  AND  COALESCE(u.is_premium, false) = false
  AND  NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);

-- La table de secours contient des adresses e-mail : elle ne doit pas
-- etre lisible par la cle publique Supabase.
ALTER TABLE sauvegarde_comptes_test ENABLE ROW LEVEL SECURITY;

CREATE TEMP TABLE a_supprimer AS
SELECT u.id
FROM   users u
WHERE  (   u.email LIKE 'granny-test-%'
        OR u.email LIKE 'verif-%'
        OR u.email LIKE 'migration-check-%'
        OR u.email LIKE 'audit-%'
        OR u.email LIKE '%@grandimi.test')
  AND  COALESCE(u.is_premium, false) = false
  AND  NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);

DELETE FROM predictions       WHERE user_id IN (SELECT id FROM a_supprimer);
DELETE FROM task_completions  WHERE user_id IN (SELECT id FROM a_supprimer);
DELETE FROM users             WHERE id      IN (SELECT id FROM a_supprimer);

DROP TABLE a_supprimer;

COMMIT;


-- ---------- ETAPE 3 : verification ----------
-- Doit renvoyer 0 compte de test restant, et le nombre de comptes reels.

SELECT 'comptes_de_test_restants' AS objet, count(*)::text AS valeur
FROM   users
WHERE  email LIKE 'granny-test-%'
    OR email LIKE 'verif-%'
    OR email LIKE 'migration-check-%'
    OR email LIKE '%@grandimi.test'

UNION ALL

SELECT 'comptes_total', count(*)::text FROM users

UNION ALL

SELECT 'comptes_avec_abonnement', count(DISTINCT user_id)::text FROM subscriptions;

-- 003 — normaliser les adresses e-mail
--
-- À exécuter dans Supabase → SQL Editor.
--
-- Les adresses étaient enregistrées telles que saisies : en production
-- coexistaient "Samuel.Garbil@gmail.com" et "samuel.garbil@gmail.com",
-- deux comptes distincts pour la même personne, dont un seul portait
-- l'abonnement. Se connecter avec la mauvaise casse revenait donc à
-- perdre son accès payant.
--
-- Le code normalise désormais à l'écriture comme à la lecture. Reste à
-- rattraper les lignes déjà en base.

-- 1) Normalise ce qui ne crée pas de collision.
UPDATE users
SET    email = lower(trim(email))
WHERE  email <> lower(trim(email))
  AND  NOT EXISTS (
         SELECT 1 FROM users autre
         WHERE  autre.email = lower(trim(users.email))
       );

-- 2) Affiche les doublons restants, à trancher à la main : il faut
--    décider quel compte garder (celui qui porte l'abonnement) avant
--    de supprimer l'autre. Aucune fusion automatique ici — elle
--    détruirait des prédictions ou un abonnement actif.
SELECT lower(trim(email)) AS adresse_normalisee,
       count(*)           AS comptes,
       array_agg(id)      AS identifiants,
       bool_or(is_premium) AS un_des_deux_est_premium
FROM   users
GROUP  BY 1
HAVING count(*) > 1;

-- 3) Une fois les doublons résolus, empêcher leur réapparition :
--    (à exécuter séparément, échoue tant qu'il reste des collisions)
-- CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(trim(email)));

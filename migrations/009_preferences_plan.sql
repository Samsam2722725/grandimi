-- ============================================================
--  LE PLAN A L HEURE DE CELUI QUI LE SUIT
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  POURQUOI
--  Le plan annonçait « BedTime: 10:00 PM » et « WakeTime: 7:00 AM » —
--  ecrits en dur dans internal/planner/growth_plan.go, identiques pour
--  tout le monde, et au format americain sur un site francais. Un
--  adolescent qui se leve a 6 h 20 pour le bus recevait la meme consigne
--  qu un autre qui se leve a 8 h.
--
--  Un plan « personnalise » qui donne la meme heure a tout le monde
--  n est pas un plan personnalise. Ces cinq reponses, demandees UNE
--  fois apres le paiement, suffisent a poser des heures reelles.
--
--  CE QU ON N ECRIT PAS ICI
--  Aucune taille, aucun poids, aucune mesure. Des horaires et des
--  habitudes, rien d autre.
--
--  Sans risque : IF NOT EXISTS, aucune donnee existante touchee.

CREATE TABLE IF NOT EXISTS preferences_plan (
    user_id       uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Minutes depuis minuit. Un entier se compare et se decale sans
    -- avoir a analyser une chaine : « 30 minutes plus tot » est une
    -- soustraction. 1350 = 22 h 30.
    coucher_min   int         NOT NULL DEFAULT 1350,
    lever_min     int         NOT NULL DEFAULT 420,

    -- "toujours", "parfois", "jamais". Sauter le petit-dejeuner est le
    -- levier nutritionnel le plus frequent a cet age.
    petit_dej     text        NOT NULL DEFAULT 'toujours',

    -- Jours de sport, 1 = lundi ... 7 = dimanche. Les exercices se
    -- posent les autres jours, pour ne pas s ajouter a un entrainement.
    jours_sport   int[]       NOT NULL DEFAULT '{}',

    -- Ce qui bloque : "coucher", "manger", "bouger", "regularite".
    -- Decide de ce que le plan met en avant.
    difficulte    text        NOT NULL DEFAULT 'regularite',

    repondu_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security ACTIVEE, sans aucune politique.
--
-- Supabase publie les tables du schema public via son API REST : sans
-- RLS, ces reponses seraient lisibles avec la cle anon. Aucune politique
-- n est creee, personne ne passe par PostgREST — le backend se connecte
-- en direct via DATABASE_URL avec un role qui contourne RLS.
ALTER TABLE preferences_plan ENABLE ROW LEVEL SECURITY;

-- ---------- Verification ----------
SELECT 'table_preferences_plan' AS objet, count(*)::text AS valeur
FROM   information_schema.tables
WHERE  table_name = 'preferences_plan';

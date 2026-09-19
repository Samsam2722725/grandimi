-- SUIVI DE TAILLE — une ligne par mesure, par utilisateur.
--
-- POURQUOI CETTE TABLE EXISTE
--
-- L estimation d une taille adulte sans age osseux plafonne autour de
-- quatre a cinq centimetres d erreur. Ce plafond tient a une variable que
-- le questionnaire ne voit pas : l avance ou le retard pubertaire. Une
-- radiographie la donnerait ; une suite de mesures dans le temps aussi,
-- parce qu elle rend la vitesse de croissance REELLE au lieu d une vitesse
-- rappelee de memoire.
--
-- C est la seule source d information nouvelle que ce produit puisse
-- creer lui-meme, et la seule qu un concurrent vendant une prediction
-- unique ne peut pas repliquer.
--
-- Les mesures sont accessibles a tout compte authentifie, pas seulement
-- aux abonnes : la relance a J+30 promet deja une mise a jour gratuite de
-- l estimation (voir BRIEF-BACKEND.md), et c est ce qui maximise la
-- collecte.

CREATE TABLE IF NOT EXISTS mesures (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Date de la mesure, pas de la saisie : on peut rattraper une mesure
    -- prise la semaine derniere sur le carnet de sante.
    mesuree_le date         NOT NULL,
    taille_cm  numeric(5,1) NOT NULL CHECK (taille_cm > 80 AND taille_cm < 230),
    created_at timestamptz  NOT NULL DEFAULT now(),
    -- Deux mesures le meme jour ne sont pas deux mesures : c est une
    -- correction. La seconde remplace la premiere (voir EnregistrerMesure).
    UNIQUE (user_id, mesuree_le)
);

CREATE INDEX IF NOT EXISTS mesures_user_date_idx
    ON mesures (user_id, mesuree_le);

ALTER TABLE mesures ENABLE ROW LEVEL SECURITY;

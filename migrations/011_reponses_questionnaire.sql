-- REPONSES DU QUESTIONNAIRE — une ligne par compte.
--
-- POURQUOI CETTE TABLE EXISTE
--
-- Les reponses du questionnaire (coucher, telephone, posture, proteines,
-- taille revee...) ne vivaient que dans le navigateur. Un abonne qui se
-- reconnectait sur un autre telephone retrouvait son estimation (table
-- predictions) mais plus ses reponses : « Ce qui te freine » et le mois 1
-- du plan redevenaient generiques. Mesure en local le 24/10/2026.
--
-- On garde l'objet tel que le site le construit a la fin du questionnaire
-- (predictionData), pour le lui rendre a l'identique a la connexion.
--
-- Le serveur se passe de cette table tant qu'elle n'existe pas : lecture
-- et ecriture echouent sans rien casser, le plan reste generique comme
-- avant.

CREATE TABLE IF NOT EXISTS reponses_questionnaire (
    user_id    uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    donnees    jsonb       NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reponses_questionnaire ENABLE ROW LEVEL SECURITY;

SELECT 'table_reponses_questionnaire' AS objet, count(*)::text AS valeur
FROM   information_schema.tables
WHERE  table_name = 'reponses_questionnaire';

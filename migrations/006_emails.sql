-- ============================================================
--  E-MAILS : désinscription et journal des envois
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  POURQUOI
--  Le questionnaire demande son adresse à l'utilisateur au 13e écran et
--  la stocke depuis le premier jour, alors qu'aucun e-mail n'a jamais
--  été envoyé : le dépôt ne contenait aucune intégration d'envoi.
--
--  Une donnée personnelle collectée auprès d'un mineur sans finalité
--  effective est exactement ce qu'interdit le principe de minimisation
--  (RGPD art. 5.1.c). Il fallait soit se servir de l'adresse, soit
--  cesser de la collecter. Ces deux tables permettent de s'en servir
--  proprement.
--
--  Sans risque : IF NOT EXISTS partout, aucune donnée existante touchée.

-- ---------- Désinscription ----------
-- Non nul = l'utilisateur a cliqué le lien de désinscription. Une date
-- plutôt qu'un booléen : savoir QUAND sert à répondre à une réclamation
-- ("je me suis désinscrit et j'ai encore reçu"), un booléen ne le peut
-- pas. Aucune ligne n'est supprimée à la désinscription : effacer le
-- compte ferait repartir la personne de zéro au prochain questionnaire
-- et elle recevrait de nouveau l'e-mail.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_optout_at timestamptz;

-- ---------- Journal des envois ----------
-- Une ligne par (utilisateur, type d'e-mail). L'index UNIQUE est la
-- pièce maîtresse : c'est lui, et non la logique de sélection Go, qui
-- garantit qu'une personne ne reçoit jamais deux fois le même e-mail.
-- La tâche d'envoi peut donc être relancée, doublée ou rejouée après
-- une panne sans conséquence — la seconde insertion est refusée par la
-- base, pas par du code qu'on pourrait oublier de recopier.
--
-- L'insertion a lieu AVANT l'appel au fournisseur : en cas de doute on
-- préfère ne pas envoyer un e-mail plutôt que d'en envoyer deux.
CREATE TABLE IF NOT EXISTS email_envois (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- 'relance_j30' aujourd'hui ; d'autres types viendront (confirmation
    -- de résiliation, par exemple). Le type fait partie de la clé unique
    -- pour qu'ajouter un type n'empêche pas les envois déjà faits.
    type       text        NOT NULL,
    envoye_at  timestamptz NOT NULL DEFAULT now(),
    -- Renseigné si le fournisseur a refusé : la ligne reste (donc pas de
    -- seconde tentative en boucle) mais on sait que rien n'est parti.
    erreur     text,
    UNIQUE (user_id, type)
);

CREATE INDEX IF NOT EXISTS email_envois_type_idx ON email_envois (type, envoye_at);

-- ---------- Vérification ----------
-- Doit renvoyer la colonne et la table, et 0 envoi.

SELECT 'colonne_email_optout_at' AS objet,
       count(*)::text AS valeur
FROM   information_schema.columns
WHERE  table_name = 'users' AND column_name = 'email_optout_at'

UNION ALL

SELECT 'table_email_envois', count(*)::text
FROM   information_schema.tables
WHERE  table_name = 'email_envois'

UNION ALL

SELECT 'envois_enregistres', count(*)::text FROM email_envois;

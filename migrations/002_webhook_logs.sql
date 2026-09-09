-- 002 — table webhook_logs
--
-- À exécuter dans Supabase → SQL Editor, après 001.
--
-- La table n'existait pas :
--   pq: relation "webhook_logs" does not exist
--
-- Conséquences observées en production :
--   - db.LogWebhook échoue à chaque webhook Whop reçu. L'erreur n'est
--     pas remontée (l'appel ignore son retour), donc aucune trace des
--     paiements n'était conservée.
--   - /api/admin/stats répond 500 : le tableau de bord admin est
--     entièrement inutilisable.
--   - /api/admin/webhooks ne peut rien afficher — or c'est précisément
--     l'écran qui sert à vérifier que Whop renvoie bien child_user_id
--     dans le metadata après un paiement par un parent.

CREATE TABLE IF NOT EXISTS webhook_logs (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text        NOT NULL DEFAULT '',
    user_email text        NOT NULL DEFAULT '',
    payload    text        NOT NULL DEFAULT '',
    status     text        NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Les journaux sont toujours lus par date décroissante, limités à 100.
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx
    ON webhook_logs (created_at DESC);

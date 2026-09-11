-- ============================================================
--  Deux offres (mensuel 4,99 €, annuel 29,99 €) au lieu d'une.
--  A COLLER DANS SUPABASE -> SQL Editor -> Run
-- ============================================================
--
--  Sans risque : IF NOT EXISTS partout, DEFAULT 'monthly' pour ne pas
--  casser les lignes existantes. Les abonnements déjà actifs gardent
--  leur montant Whop réel — cette migration ne les touche pas, elle
--  ajoute seulement de quoi enregistrer les nouveaux.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'monthly';

-- Date du prochain prélèvement, lue depuis renewal_period_end dans le
-- webhook Whop. Sans cette colonne, "Mon compte" ne peut pas afficher
-- la date du prochain paiement.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- true dès que la résiliation est demandée (par notre bouton ou
-- directement depuis le portail Whop) mais avant la fin de la période
-- déjà payée : l'accès reste actif, seul le renouvellement s'arrête.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- Lien Whop hébergé de gestion de l'abonnement (whop.com/billing/manage/mem_xxx).
-- Whop le fournit dans chaque webhook ; le stocker évite un appel API
-- supplémentaire pour l'afficher dans "Mon compte".
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS manage_url text;

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

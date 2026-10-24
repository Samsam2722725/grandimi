-- Tables qui n existent que dans Supabase (aucune migration du depot ne les
-- cree), reconstituees a partir des requetes du code. Test local seulement.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  is_premium boolean DEFAULT false,
  whop_customer_id text UNIQUE,
  whop_subscription_id text,
  consent_parental boolean DEFAULT false,
  email_optout_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  whop_subscription_id text,
  status text,
  created_at timestamp DEFAULT (now() AT TIME ZONE 'UTC'),
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  age numeric, sex text, height_cm numeric, weight_kg numeric,
  father_height_cm numeric, mother_height_cm numeric, predicted_height numeric,
  confidence_level text, confidence_min numeric, confidence_max numeric,
  created_at timestamptz DEFAULT now()
);

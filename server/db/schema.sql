CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE subscription_status AS ENUM ('pending','active','past_due','suspended','cancelled','expired');
CREATE TYPE transaction_status AS ENUM ('created','pending','paid','failed','cancelled','expired','refunded');
CREATE TYPE payment_provider AS ENUM ('paymob','fawry');

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  phone text NOT NULL UNIQUE,
  full_name text NOT NULL,
  password_hash text,
  paymob_customer_id text,
  fawry_customer_id text UNIQUE,
  -- Token envelope encrypted with AES-256-GCM; PAN/CVV are never stored.
  card_token text,
  card_provider payment_provider,
  card_last4 char(4),
  card_brand text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code text NOT NULL CHECK (plan_code IN ('plus_monthly','plus_annual')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL DEFAULT 'EGP',
  provider payment_provider NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('card','fawry_reference')),
  status subscription_status NOT NULL DEFAULT 'pending',
  provider_subscription_id text,
  provider_plan_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  failure_count integer NOT NULL DEFAULT 0,
  last_failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subscription_id)
);
CREATE INDEX IF NOT EXISTS subscriptions_due_idx ON subscriptions(next_billing_at) WHERE status IN ('active','past_due');
CREATE UNIQUE INDEX IF NOT EXISTS one_live_subscription_per_user ON subscriptions(user_id) WHERE status IN ('pending','active','past_due','suspended');

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  type text NOT NULL CHECK (type IN ('initial','renewal','refund')),
  status transaction_status NOT NULL DEFAULT 'created',
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency char(3) NOT NULL DEFAULT 'EGP',
  merchant_reference text NOT NULL UNIQUE,
  provider_transaction_id text,
  provider_reference_code text,
  provider_order_id text,
  failure_code text,
  failure_message text,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_transaction_id)
);
CREATE INDEX IF NOT EXISTS transactions_subscription_idx ON transactions(subscription_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id bigserial PRIMARY KEY,
  provider payment_provider NOT NULL,
  event_key text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, event_key)
);

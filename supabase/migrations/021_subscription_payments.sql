-- ============================================================================
-- Migration 021: Subscription Payments with E-Billing
-- Adds subscription tracking, payment history, and secure token access
-- ============================================================================

-- ─── Add WhatsApp channel URL to merchants ─────────────────────────────────
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS whatsapp_channel_url TEXT;

-- ─── Add subscription columns to merchants ─────────────────────────────────
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS last_renewal_reminder_at TIMESTAMPTZ;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS last_trial_reminder_at TIMESTAMPTZ;

-- Index for cron queries on expiry date
CREATE INDEX IF NOT EXISTS idx_merchants_subscription_expires_at
  ON merchants (subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;

-- ─── Subscription payments table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  amount_xaf INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('new', 'renewal')),
  external_reference TEXT UNIQUE NOT NULL,
  ebilling_bill_id TEXT,
  mysql_init_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_merchant_id
  ON subscription_payments (merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_external_reference
  ON subscription_payments (external_reference);

-- RLS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own payments"
  ON subscription_payments FOR SELECT
  USING (auth.uid()::text = merchant_id::text);

CREATE POLICY "Service role full access on subscription_payments"
  ON subscription_payments FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Subscription tokens table (public page access) ────────────────────────
CREATE TABLE IF NOT EXISTS subscription_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('trial_payment', 'renewal_payment')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_tokens_token
  ON subscription_tokens (token);

-- RLS
ALTER TABLE subscription_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on subscription_tokens"
  ON subscription_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- ─── Update subscription_tiers with XAF pricing ────────────────────────────
INSERT INTO subscription_tiers (tier_name, max_locations, price, features)
VALUES
  ('essentiel', 1, 10000, '{"price_xaf": 10000}'::jsonb),
  ('premium', 3, 25000, '{"price_xaf": 25000}'::jsonb),
  ('sur-mesure', -1, 0, '{"price_xaf": 0}'::jsonb)
ON CONFLICT (tier_name) DO UPDATE SET
  price = EXCLUDED.price,
  features = COALESCE(subscription_tiers.features, '{}'::jsonb) || EXCLUDED.features;

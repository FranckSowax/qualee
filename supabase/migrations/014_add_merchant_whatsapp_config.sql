-- ============================================================================
-- CARTELLE - Migration 014: Configuration WhatsApp Business par Merchant
-- ============================================================================

CREATE TABLE IF NOT EXISTS merchant_whatsapp_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'meta' CHECK (provider IN ('whapi', 'meta')),
    -- Meta Cloud API
    waba_id TEXT,
    phone_number_id TEXT,
    access_token TEXT,
    display_phone TEXT,
    -- Status
    is_verified BOOLEAN DEFAULT false,
    webhook_verify_token TEXT,
    -- Whapi fallback (transition)
    whapi_api_key TEXT,
    -- Audit
    configured_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE merchant_whatsapp_config IS 'Configuration WhatsApp Business API par merchant';
COMMENT ON COLUMN merchant_whatsapp_config.provider IS 'Provider actif: meta (Cloud API) ou whapi (legacy)';
COMMENT ON COLUMN merchant_whatsapp_config.waba_id IS 'WhatsApp Business Account ID (Meta)';
COMMENT ON COLUMN merchant_whatsapp_config.phone_number_id IS 'Phone Number ID dans Meta Business';
COMMENT ON COLUMN merchant_whatsapp_config.access_token IS 'Token permanent Bearer pour Meta API';

-- Index
CREATE INDEX IF NOT EXISTS idx_wa_config_merchant ON merchant_whatsapp_config(merchant_id);

-- Trigger updated_at
CREATE TRIGGER update_wa_config_updated_at
    BEFORE UPDATE ON merchant_whatsapp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: service_role uniquement (tokens sensibles)
ALTER TABLE merchant_whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access wa_config"
ON merchant_whatsapp_config FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

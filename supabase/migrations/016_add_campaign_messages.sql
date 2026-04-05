-- ============================================================================
-- CARTELLE - Migration 016: Campaign Messages Tracking + Campaign Enrichment
-- ============================================================================

-- Enrichir whatsapp_campaigns
ALTER TABLE whatsapp_campaigns
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES whatsapp_templates(id),
    ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS estimated_cost_fcfa INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_cost_fcfa INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;

-- Suivi par message individuel
CREATE TABLE IF NOT EXISTS whatsapp_campaign_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    meta_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    cost_fcfa INTEGER DEFAULT 50,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_campaign_messages IS 'Suivi individuel de chaque message de campagne';

-- Index
CREATE INDEX IF NOT EXISTS idx_campaign_msgs_campaign ON whatsapp_campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_msgs_merchant ON whatsapp_campaign_messages(merchant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_msgs_status ON whatsapp_campaign_messages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_msgs_meta_id ON whatsapp_campaign_messages(meta_message_id);
CREATE INDEX IF NOT EXISTS idx_campaign_msgs_created ON whatsapp_campaign_messages(created_at DESC);

-- RLS
ALTER TABLE whatsapp_campaign_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own campaign messages"
ON whatsapp_campaign_messages FOR SELECT
TO authenticated
USING (auth.uid() = merchant_id);

CREATE POLICY "Service role full access campaign messages"
ON whatsapp_campaign_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

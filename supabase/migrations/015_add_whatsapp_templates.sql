-- ============================================================================
-- CARTELLE - Migration 015: Templates WhatsApp (sync Meta)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    meta_template_id TEXT,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'fr',
    category TEXT NOT NULL DEFAULT 'MARKETING'
        CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, name, language)
);

COMMENT ON TABLE whatsapp_templates IS 'Templates WhatsApp synchronisés depuis Meta';

-- Index
CREATE INDEX IF NOT EXISTS idx_wa_templates_merchant ON whatsapp_templates(merchant_id);
CREATE INDEX IF NOT EXISTS idx_wa_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_wa_templates_name ON whatsapp_templates(name);

-- Trigger
CREATE TRIGGER update_wa_templates_updated_at
    BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own templates"
ON whatsapp_templates FOR SELECT
TO authenticated
USING (auth.uid() = merchant_id);

CREATE POLICY "Service role full access templates"
ON whatsapp_templates FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

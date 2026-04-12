// ============================================================================
// WhatsApp Service Types — Shared across Whapi & Meta Cloud API
// ============================================================================

export type WhatsAppProvider = 'whapi' | 'meta';

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  // Meta Cloud API
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  displayPhone?: string;
  // Whapi (legacy)
  whapiApiKey?: string;
}

// ─── Message Payloads ────────────────────────────

export interface WhatsAppButton {
  type: 'url' | 'quick_reply' | 'phone_number';
  title: string;
  url?: string;
  id?: string;
  phone_number?: string;
}

export interface WhatsAppInteractivePayload {
  to: string;
  header?: { text?: string; type?: 'text' | 'image' | 'video'; media?: string };
  body: { text: string };
  footer?: { text: string };
  buttons: WhatsAppButton[];
}

export interface WhatsAppTextPayload {
  to: string;
  body: string;
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: { link: string };
  video?: { link: string };
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: number;
  parameters: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplatePayload {
  to: string;
  templateName: string;
  languageCode: string;
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppCarouselCard {
  header: { type: 'image' | 'video'; media: string };
  body: { text: string };
  buttons: WhatsAppButton[];
}

export interface WhatsAppCarouselPayload {
  to: string;
  body: string;
  cards: WhatsAppCarouselCard[];
}

// ─── Responses ────────────────────────────

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Database Types ────────────────────────────

export interface MerchantWhatsAppConfig {
  id: string;
  merchant_id: string;
  provider: WhatsAppProvider;
  waba_id: string | null;
  phone_number_id: string | null;
  access_token: string | null;
  display_phone: string | null;
  is_verified: boolean;
  webhook_verify_token: string | null;
  whapi_api_key: string | null;
  created_at: string;
  updated_at: string;
  configured_by: string | null;
}

export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface WhatsAppTemplate {
  id: string;
  merchant_id: string;
  meta_template_id: string | null;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: any[];
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CampaignMessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppCampaignMessage {
  id: string;
  campaign_id: string;
  merchant_id: string;
  recipient_phone: string;
  recipient_name: string | null;
  meta_message_id: string | null;
  status: CampaignMessageStatus;
  error_message: string | null;
  cost_eur: number;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
}

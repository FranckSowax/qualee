import type {
  WhatsAppConfig,
  WhatsAppInteractivePayload,
  WhatsAppTextPayload,
  WhatsAppTemplatePayload,
  WhatsAppCarouselPayload,
  WhatsAppSendResult,
} from './types';

// ─── Whapi endpoints ────────────────────────────
const WHAPI_BASE = 'https://gate.whapi.cloud';
const WHAPI_INTERACTIVE_URL = `${WHAPI_BASE}/messages/interactive`;
const WHAPI_TEXT_URL = `${WHAPI_BASE}/messages/text`;
const WHAPI_CAROUSEL_URL = `${WHAPI_BASE}/messages/carousel`;

// ─── Meta Cloud API ────────────────────────────
const META_API_VERSION = 'v21.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ============================================================================
// SEND INTERACTIVE MESSAGE (with buttons)
// ============================================================================
export async function sendInteractiveMessage(
  config: WhatsAppConfig,
  payload: WhatsAppInteractivePayload
): Promise<WhatsAppSendResult> {
  if (config.provider === 'meta') {
    return sendMetaInteractive(config, payload);
  }
  return sendWhapiInteractive(config, payload);
}

// ============================================================================
// SEND TEXT MESSAGE (fallback)
// ============================================================================
export async function sendTextMessage(
  config: WhatsAppConfig,
  payload: WhatsAppTextPayload
): Promise<WhatsAppSendResult> {
  if (config.provider === 'meta') {
    return sendMetaText(config, payload);
  }
  return sendWhapiText(config, payload);
}

// ============================================================================
// SEND TEMPLATE MESSAGE (Meta Cloud API only — for campaigns)
// ============================================================================
export async function sendTemplateMessage(
  config: WhatsAppConfig,
  payload: WhatsAppTemplatePayload
): Promise<WhatsAppSendResult> {
  if (config.provider !== 'meta' || !config.phoneNumberId || !config.accessToken) {
    return { success: false, error: 'Meta Cloud API config required for template messages' };
  }

  try {
    const metaPayload: any = {
      messaging_product: 'whatsapp',
      to: payload.to,
      type: 'template',
      template: {
        name: payload.templateName,
        language: { code: payload.languageCode },
      },
    };

    if (payload.components && payload.components.length > 0) {
      metaPayload.template.components = payload.components;
    }

    const response = await fetch(`${META_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[META] Template send failed:', response.status, errorData);
      return {
        success: false,
        error: errorData?.error?.message || `Meta API error ${response.status}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error('[META] Template send exception:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SEND CAROUSEL (Whapi only — legacy campaigns)
// ============================================================================
export async function sendCarouselMessage(
  config: WhatsAppConfig,
  payload: WhatsAppCarouselPayload
): Promise<WhatsAppSendResult> {
  const apiKey = config.whapiApiKey;
  if (!apiKey) {
    return { success: false, error: 'Whapi API key required for carousel messages' };
  }

  try {
    const response = await fetch(WHAPI_CAROUSEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: payload.to,
        body: payload.body,
        cards: payload.cards,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WHAPI] Carousel send failed:', response.status, errorText);
      return { success: false, error: `Whapi error ${response.status}` };
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.sent?.id || result.message_id,
    };
  } catch (error: any) {
    console.error('[WHAPI] Carousel send exception:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INTERNAL — Meta Cloud API implementations
// ============================================================================
async function sendMetaInteractive(
  config: WhatsAppConfig,
  payload: WhatsAppInteractivePayload
): Promise<WhatsAppSendResult> {
  try {
    // Meta uses a different interactive format
    const buttons = payload.buttons.map((btn, i) => ({
      type: 'reply',
      reply: { id: btn.id || `btn_${i}`, title: btn.title.substring(0, 20) },
    }));

    const metaPayload: any = {
      messaging_product: 'whatsapp',
      to: payload.to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: payload.body.text },
        action: { buttons },
      },
    };

    if (payload.header?.text) {
      metaPayload.interactive.header = { type: 'text', text: payload.header.text };
    }
    if (payload.footer?.text) {
      metaPayload.interactive.footer = { text: payload.footer.text };
    }

    const response = await fetch(`${META_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || `Meta error ${response.status}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendMetaText(
  config: WhatsAppConfig,
  payload: WhatsAppTextPayload
): Promise<WhatsAppSendResult> {
  try {
    const response = await fetch(`${META_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: payload.to,
        type: 'text',
        text: { body: payload.body },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || `Meta error ${response.status}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INTERNAL — Whapi implementations
// ============================================================================
async function sendWhapiInteractive(
  config: WhatsAppConfig,
  payload: WhatsAppInteractivePayload
): Promise<WhatsAppSendResult> {
  const apiKey = config.whapiApiKey;
  if (!apiKey) return { success: false, error: 'Whapi API key missing' };

  try {
    const whapiPayload = {
      to: payload.to,
      type: 'button',
      header: payload.header ? { text: payload.header.text?.substring(0, 60) } : undefined,
      body: { text: payload.body.text },
      footer: payload.footer ? { text: payload.footer.text } : undefined,
      action: {
        buttons: payload.buttons.map(btn => ({
          type: btn.type,
          title: btn.title.substring(0, 25),
          id: btn.id,
          url: btn.url,
        })),
      },
    };

    const response = await fetch(WHAPI_INTERACTIVE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whapiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Whapi error ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.sent?.id || result.message_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendWhapiText(
  config: WhatsAppConfig,
  payload: WhatsAppTextPayload
): Promise<WhatsAppSendResult> {
  const apiKey = config.whapiApiKey;
  if (!apiKey) return { success: false, error: 'Whapi API key missing' };

  try {
    const response = await fetch(WHAPI_TEXT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: payload.to, body: payload.body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Whapi error ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.sent?.id || result.message_id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

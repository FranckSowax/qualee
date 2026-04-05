import { createClient } from '@supabase/supabase-js';
import type { WhatsAppConfig } from './types';

const WHAPI_FALLBACK_KEY = process.env.WHAPI_API_KEY || '';

/**
 * Resolve WhatsApp config for a merchant.
 * Priority: merchant_whatsapp_config table → global WHAPI_API_KEY fallback
 */
export async function getWhatsAppConfig(merchantId?: string): Promise<WhatsAppConfig> {
  if (!merchantId) {
    return { provider: 'whapi', whapiApiKey: WHAPI_FALLBACK_KEY };
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('merchant_whatsapp_config')
      .select('*')
      .eq('merchant_id', merchantId)
      .single();

    if (error || !data) {
      // No per-merchant config — fallback to global Whapi
      return { provider: 'whapi', whapiApiKey: WHAPI_FALLBACK_KEY };
    }

    if (data.provider === 'meta' && data.access_token && data.phone_number_id) {
      return {
        provider: 'meta',
        wabaId: data.waba_id,
        phoneNumberId: data.phone_number_id,
        accessToken: data.access_token,
        displayPhone: data.display_phone,
      };
    }

    if (data.provider === 'whapi' && data.whapi_api_key) {
      return { provider: 'whapi', whapiApiKey: data.whapi_api_key };
    }

    // Config exists but incomplete — fallback
    return { provider: 'whapi', whapiApiKey: WHAPI_FALLBACK_KEY };
  } catch {
    return { provider: 'whapi', whapiApiKey: WHAPI_FALLBACK_KEY };
  }
}

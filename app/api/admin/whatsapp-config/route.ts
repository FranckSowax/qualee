import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — List all merchant WhatsApp configs (with merchant info)
export async function GET(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get('merchantId');

    if (merchantId) {
      const { data, error } = await supabaseAdmin
        .from('merchant_whatsapp_config')
        .select('*')
        .eq('merchant_id', merchantId)
        .single();

      if (error) return NextResponse.json({ config: null });
      return NextResponse.json({ config: data });
    }

    // List all configs with merchant names
    const { data: configs } = await supabaseAdmin
      .from('merchant_whatsapp_config')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: merchants } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, email')
      .eq('is_active', true)
      .order('business_name');

    return NextResponse.json({ configs: configs || [], merchants: merchants || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Create or update merchant WhatsApp config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, provider, wabaId, phoneNumberId, accessToken, displayPhone, whapiApiKey, messagePriceFcfa, action } = body;

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId requis' }, { status: 400 });
    }

    // Verify action — test token against Meta
    if (action === 'verify') {
      if (!phoneNumberId || !accessToken) {
        return NextResponse.json({ error: 'phoneNumberId et accessToken requis' }, { status: 400 });
      }

      try {
        const metaRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!metaRes.ok) {
          const err = await metaRes.json().catch(() => ({}));
          return NextResponse.json({
            verified: false,
            error: err?.error?.message || `Meta API error ${metaRes.status}`,
          });
        }

        const phoneData = await metaRes.json();

        // Update verified status in DB
        await supabaseAdmin
          .from('merchant_whatsapp_config')
          .update({ is_verified: true, display_phone: phoneData.display_phone_number || displayPhone })
          .eq('merchant_id', merchantId);

        return NextResponse.json({
          verified: true,
          phoneNumber: phoneData.display_phone_number,
          qualityRating: phoneData.quality_rating,
        });
      } catch (err: any) {
        return NextResponse.json({ verified: false, error: err.message });
      }
    }

    // Upsert config
    const configData: any = {
      merchant_id: merchantId,
      provider: provider || 'meta',
      waba_id: wabaId || null,
      phone_number_id: phoneNumberId || null,
      access_token: accessToken || null,
      display_phone: displayPhone || null,
      whapi_api_key: whapiApiKey || null,
      is_verified: false,
      message_price_fcfa: messagePriceFcfa || 50,
    };

    const { data, error } = await supabaseAdmin
      .from('merchant_whatsapp_config')
      .upsert(configData, { onConflict: 'merchant_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Remove merchant WhatsApp config
export async function DELETE(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get('merchantId');
    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId requis' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('merchant_whatsapp_config')
      .delete()
      .eq('merchant_id', merchantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

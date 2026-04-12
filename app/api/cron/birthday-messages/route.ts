import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHAPI_BASE = 'https://gate.whapi.cloud/messages/text';

/**
 * CRON: Send WhatsApp birthday messages to loyalty clients.
 *
 * Called daily by Railway cron or external scheduler.
 * Auth: Requires CRON_SECRET in query params or Authorization header.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret =
    request.nextUrl.searchParams.get('secret') ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1;

    // Fetch all loyalty clients with a birthday, joined with their merchant
    const { data: clients, error } = await supabaseAdmin
      .from('loyalty_clients')
      .select(`
        id, name, phone, birthday, points, qr_code_data,
        last_birthday_message_at,
        merchants!inner(id, business_name, auto_birthday_enabled)
      `)
      .not('birthday', 'is', null)
      .not('phone', 'is', null)
      .eq('status', 'active');

    if (error || !clients) {
      return NextResponse.json({ error: error?.message || 'No clients found' }, { status: 500 });
    }

    // Filter: birthday matches today, merchant has auto_birthday_enabled, not sent within 300 days
    const eligible = clients.filter((c: any) => {
      const merchant = c.merchants;
      if (!merchant?.auto_birthday_enabled) return false;

      const bday = new Date(c.birthday);
      if (bday.getDate() !== todayDay || bday.getMonth() + 1 !== todayMonth) return false;

      if (c.last_birthday_message_at) {
        const daysSince =
          (now.getTime() - new Date(c.last_birthday_message_at).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSince < 300) return false;
      }

      return true;
    });

    const globalWhapiKey = process.env.WHAPI_API_KEY;
    if (!globalWhapiKey) {
      return NextResponse.json(
        { error: 'WHAPI_API_KEY not configured', eligible: eligible.length },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://qualee.app';

    let sent = 0;
    let failed = 0;

    for (const client of eligible) {
      const merchant = (client as any).merchants;
      const phone = client.phone!.replace(/^\+/, '');
      const name = client.name || 'cher client';
      const businessName = merchant.business_name || 'votre commerce';
      const cardUrl = `${baseUrl}/card/${client.qr_code_data}`;

      const message = `🎂 Joyeux anniversaire ${name} ! ${businessName} vous offre une surprise. Consultez votre carte fidélité !\n${cardUrl}`;

      try {
        // Check per-merchant Whapi key
        const { data: waConfig } = await supabaseAdmin
          .from('merchant_whatsapp_config')
          .select('whapi_api_key, provider')
          .eq('merchant_id', merchant.id)
          .single();

        const apiKey =
          waConfig?.provider === 'whapi' && waConfig?.whapi_api_key
            ? waConfig.whapi_api_key
            : globalWhapiKey;

        const response = await fetch(WHAPI_BASE, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: phone, body: message }),
        });

        if (response.ok) {
          sent++;
          await supabaseAdmin
            .from('loyalty_clients')
            .update({ last_birthday_message_at: now.toISOString() })
            .eq('id', client.id);
        } else {
          failed++;
          console.error(`[BIRTHDAY] Failed for ${client.id}:`, await response.text());
        }

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[BIRTHDAY] Error for ${client.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: clients.length,
      eligible: eligible.length,
      sent,
      failed,
    });
  } catch (error: any) {
    console.error('[BIRTHDAY CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

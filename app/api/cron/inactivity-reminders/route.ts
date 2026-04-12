import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHAPI_BASE = 'https://gate.whapi.cloud/messages/text';

/**
 * CRON: Send WhatsApp inactivity reminders to loyalty clients who haven't visited recently.
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

    // Fetch all active loyalty clients with last_visit, joined with merchant
    const { data: clients, error } = await supabaseAdmin
      .from('loyalty_clients')
      .select(`
        id, name, phone, points, qr_code_data, last_visit,
        last_inactivity_reminder_at,
        merchants!inner(id, business_name, auto_inactivity_enabled, inactivity_threshold_days)
      `)
      .not('phone', 'is', null)
      .not('last_visit', 'is', null)
      .eq('status', 'active');

    if (error || !clients) {
      return NextResponse.json({ error: error?.message || 'No clients found' }, { status: 500 });
    }

    // Filter: inactive beyond threshold, merchant enabled, not reminded within 14 days
    const eligible = clients.filter((c: any) => {
      const merchant = c.merchants;
      if (!merchant?.auto_inactivity_enabled) return false;

      const thresholdDays = merchant.inactivity_threshold_days || 30;
      const lastVisit = new Date(c.last_visit);
      const daysSinceVisit =
        (now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceVisit < thresholdDays) return false;

      if (c.last_inactivity_reminder_at) {
        const daysSinceReminder =
          (now.getTime() - new Date(c.last_inactivity_reminder_at).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceReminder < 14) return false;
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

      const message = `Bonjour ${name} ! Vous nous manquez chez ${businessName}. Revenez profiter de vos ${client.points || 0} points ! ${cardUrl}`;

      try {
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
            .update({ last_inactivity_reminder_at: now.toISOString() })
            .eq('id', client.id);
        } else {
          failed++;
          console.error(`[INACTIVITY] Failed for ${client.id}:`, await response.text());
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[INACTIVITY] Error for ${client.id}:`, err);
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
    console.error('[INACTIVITY CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

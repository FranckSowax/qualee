import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHAPI_BASE = 'https://gate.whapi.cloud/messages/text';

/**
 * CRON: Send WhatsApp notifications when loyalty clients cross a points milestone.
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

    // Fetch active loyalty clients with points > 0, joined with merchant
    const { data: clients, error } = await supabaseAdmin
      .from('loyalty_clients')
      .select(`
        id, name, phone, points, qr_code_data,
        last_milestone_notified,
        merchants!inner(id, business_name, auto_milestone_enabled, points_milestones)
      `)
      .not('phone', 'is', null)
      .eq('status', 'active')
      .gt('points', 0);

    if (error || !clients) {
      return NextResponse.json({ error: error?.message || 'No clients found' }, { status: 500 });
    }

    // Filter: find clients who crossed a new milestone
    const eligible: Array<{ client: any; milestone: number }> = [];

    for (const c of clients) {
      const merchant = (c as any).merchants;
      if (!merchant?.auto_milestone_enabled) continue;

      const milestones: number[] = Array.isArray(merchant.points_milestones)
        ? merchant.points_milestones
        : [50, 100, 200, 500];

      const lastNotified = c.last_milestone_notified || 0;
      const points = c.points || 0;

      // Find the highest milestone the client has crossed that is above last_milestone_notified
      const crossedMilestones = milestones
        .filter((m: number) => m > lastNotified && m <= points)
        .sort((a: number, b: number) => b - a);

      if (crossedMilestones.length > 0) {
        eligible.push({ client: c, milestone: crossedMilestones[0] });
      }
    }

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

    for (const { client, milestone } of eligible) {
      const merchant = (client as any).merchants;
      const phone = client.phone!.replace(/^\+/, '');
      const name = client.name || 'cher client';
      const businessName = merchant.business_name || 'votre commerce';
      const cardUrl = `${baseUrl}/card/${client.qr_code_data}`;

      const message = `🎉 Félicitations ${name} ! Vous avez atteint ${milestone} points chez ${businessName} ! Consultez vos récompenses : ${cardUrl}`;

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
            .update({ last_milestone_notified: milestone })
            .eq('id', client.id);
        } else {
          failed++;
          console.error(`[MILESTONE] Failed for ${client.id}:`, await response.text());
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[MILESTONE] Error for ${client.id}:`, err);
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
    console.error('[MILESTONE CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

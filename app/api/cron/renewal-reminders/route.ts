import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendInteractiveMessage } from '@/lib/whatsapp/client';
import { generatePaymentToken } from '@/lib/payments/tokens';
import { notifySubscriptionExpiringSoon } from '@/lib/utils/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://qualee.app';

/**
 * CRON: Send WhatsApp renewal reminders 1 day before subscription expiry.
 *
 * Called daily by Railway cron or external scheduler.
 * Sends an interactive message with a URL button to renew via E-Billing.
 *
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
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const twentyFiveDaysAgo = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString();

    // Find merchants whose subscription expires within the next 24 hours
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, email, phone, subscription_tier, subscription_expires_at, last_renewal_reminder_at')
      .eq('is_active', true)
      .not('subscription_expires_at', 'is', null)
      .not('phone', 'is', null)
      .lte('subscription_expires_at', tomorrow)
      .gte('subscription_expires_at', now.toISOString());

    if (error || !merchants) {
      return NextResponse.json({ error: error?.message || 'No merchants found' }, { status: 500 });
    }

    // Filter: don't resend within 25 days
    const eligible = merchants.filter((m) => {
      if (!m.phone) return false;
      if (m.last_renewal_reminder_at && m.last_renewal_reminder_at > twentyFiveDaysAgo) return false;
      return true;
    });

    let sent = 0;
    let failed = 0;

    for (const merchant of eligible) {
      try {
        const token = await generatePaymentToken(merchant.id, 'renewal_payment');
        const subscribeUrl = `${APP_URL}/subscribe/${token}`;

        const config = await getWhatsAppConfig(merchant.id);
        const phone = merchant.phone!.replace(/^\+/, '');
        const name = merchant.business_name || 'votre commerce';
        const tier = merchant.subscription_tier || 'starter';

        const result = await sendInteractiveMessage(config, {
          to: phone,
          header: { text: 'Rappel de renouvellement Qualee', type: 'text' },
          body: {
            text: `Bonjour ${name} !\n\nVotre abonnement Qualee (plan ${tier}) expire *demain*.\n\nRenouvelez maintenant pour ne pas interrompre votre service de fidélisation client.`,
          },
          footer: { text: 'Qualee - Fidélisation client' },
          buttons: [{ type: 'url', title: 'Renouveler maintenant', url: subscribeUrl }],
        });

        if (result.success) {
          sent++;
          await supabaseAdmin
            .from('merchants')
            .update({ last_renewal_reminder_at: now.toISOString() })
            .eq('id', merchant.id);

          // Create dashboard notification
          await notifySubscriptionExpiringSoon(merchant.id, tier, 1);
        } else {
          failed++;
          console.error(`[RENEWAL] Failed for ${merchant.email}:`, result.error);
        }

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[RENEWAL] Error for ${merchant.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: merchants.length,
      eligible: eligible.length,
      sent,
      failed,
    });
  } catch (error: any) {
    console.error('[RENEWAL CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

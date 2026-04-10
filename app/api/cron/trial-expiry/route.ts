import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendInteractiveMessage } from '@/lib/whatsapp/client';
import { generatePaymentToken } from '@/lib/payments/tokens';
import { notifySubscriptionExpiry } from '@/lib/utils/notifications';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://cartelle-production.up.railway.app';

/**
 * CRON: Send WhatsApp messages to merchants after 13 days of free trial.
 *
 * Called daily by Railway cron or external scheduler.
 * Sends an interactive message with a URL button to choose a subscription plan.
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
    const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString();
    const twentyFiveDaysAgo = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();

    // Find merchants who:
    // - Have no subscription (still on free trial)
    // - Signed up 13+ days ago
    // - Have a phone number
    // - Haven't been reminded recently
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, email, phone, subscription_tier, created_at, last_trial_reminder_at')
      .eq('is_active', true)
      .is('subscription_expires_at', null)
      .not('phone', 'is', null)
      .lte('created_at', thirteenDaysAgo);

    if (error || !merchants) {
      return NextResponse.json({ error: error?.message || 'No merchants found' }, { status: 500 });
    }

    // Filter: don't resend within 25 days
    const eligible = merchants.filter((m) => {
      if (!m.phone) return false;
      if (m.last_trial_reminder_at && m.last_trial_reminder_at > twentyFiveDaysAgo) return false;
      return true;
    });

    let sent = 0;
    let failed = 0;

    for (const merchant of eligible) {
      try {
        // Generate payment token (7 days expiry)
        const token = await generatePaymentToken(merchant.id, 'trial_payment');
        const subscribeUrl = `${APP_URL}/subscribe/${token}`;

        const config = await getWhatsAppConfig(merchant.id);
        const phone = merchant.phone!.replace(/^\+/, '');
        const name = merchant.business_name || 'votre commerce';

        const result = await sendInteractiveMessage(config, {
          to: phone,
          header: { text: 'Votre essai gratuit Cartelle se termine', type: 'text' },
          body: {
            text: `Bonjour ${name} !\n\nVotre période d'essai gratuit de 13 jours arrive à sa fin.\n\nPour continuer à utiliser Cartelle et fidéliser vos clients, choisissez votre abonnement dès maintenant.\n\nPrix à partir de 9 000 XAF/mois.`,
          },
          footer: { text: 'Cartelle - Fidélisation client' },
          buttons: [{ type: 'url', title: 'Choisir mon plan', url: subscribeUrl }],
        });

        if (result.success) {
          sent++;
          await supabaseAdmin
            .from('merchants')
            .update({ last_trial_reminder_at: new Date().toISOString() })
            .eq('id', merchant.id);

          // Create dashboard notification
          await notifySubscriptionExpiry(
            merchant.id,
            merchant.subscription_tier || 'starter',
            merchant.created_at
          );
        } else {
          failed++;
          console.error(`[TRIAL] Failed for ${merchant.email}:`, result.error);
        }

        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[TRIAL] Error for ${merchant.email}:`, err);
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
    console.error('[TRIAL CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

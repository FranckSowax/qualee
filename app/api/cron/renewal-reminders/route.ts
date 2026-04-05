import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHAPI_BASE = 'https://gate.whapi.cloud/messages/text';

/**
 * CRON: Send WhatsApp renewal reminders 2 days before subscription anniversary.
 *
 * Called daily by Railway cron or external scheduler.
 * Uses Whapi (legacy) for sending since these are system messages, not campaigns.
 *
 * Auth: Requires CRON_SECRET in query params or Authorization header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.nextUrl.searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Find merchants whose subscription anniversary is in 2 days
    // Anniversary = same day/month as subscription_started_at
    const targetDay = twoDaysFromNow.getDate();
    const targetMonth = twoDaysFromNow.getMonth() + 1; // 1-indexed

    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, email, phone, subscription_tier, subscription_started_at, last_renewal_reminder_at')
      .eq('is_active', true)
      .not('subscription_started_at', 'is', null)
      .not('phone', 'is', null);

    if (error || !merchants) {
      return NextResponse.json({ error: error?.message || 'No merchants found' }, { status: 500 });
    }

    // Filter merchants whose anniversary matches target date
    const merchantsToRemind = merchants.filter(m => {
      if (!m.subscription_started_at || !m.phone) return false;

      const startDate = new Date(m.subscription_started_at);
      const anniversaryDay = startDate.getDate();
      const anniversaryMonth = startDate.getMonth() + 1;

      // Check if anniversary is in 2 days (same day of month, any year)
      // For monthly subscriptions: check day only
      if (anniversaryDay !== targetDay) return false;

      // Don't send if already reminded this month
      if (m.last_renewal_reminder_at) {
        const lastReminder = new Date(m.last_renewal_reminder_at);
        const daysSinceReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceReminder < 25) return false; // Don't resend within 25 days
      }

      return true;
    });

    const globalWhapiKey = process.env.WHAPI_API_KEY;
    if (!globalWhapiKey) {
      return NextResponse.json({ error: 'WHAPI_API_KEY not configured', merchantsToRemind: merchantsToRemind.length }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;

    for (const merchant of merchantsToRemind) {
      const phone = merchant.phone.replace(/^\+/, '');
      const businessName = merchant.business_name || 'votre commerce';
      const tier = merchant.subscription_tier || 'starter';

      const message = `🔔 *Rappel d'abonnement Cartelle*

Bonjour ${businessName} !

Votre abonnement Cartelle (plan ${tier}) arrive à renouvellement dans *2 jours*.

Pour continuer à fidéliser vos clients sans interruption, pensez à renouveler votre abonnement.

💳 Renouvelez maintenant depuis votre dashboard :
${process.env.NEXT_PUBLIC_APP_URL || 'https://cartelle.app'}/dashboard/billing

Besoin d'aide ? Contactez-nous sur contact@cartelle.app

— L'équipe Cartelle`;

      try {
        // Check if merchant has per-merchant Whapi config
        const { data: waConfig } = await supabaseAdmin
          .from('merchant_whatsapp_config')
          .select('whapi_api_key, provider')
          .eq('merchant_id', merchant.id)
          .single();

        const apiKey = (waConfig?.provider === 'whapi' && waConfig?.whapi_api_key) ? waConfig.whapi_api_key : globalWhapiKey;

        const response = await fetch(WHAPI_BASE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: phone, body: message }),
        });

        if (response.ok) {
          sent++;
          // Update last_renewal_reminder_at
          await supabaseAdmin
            .from('merchants')
            .update({ last_renewal_reminder_at: now.toISOString() })
            .eq('id', merchant.id);
        } else {
          failed++;
          console.error(`[RENEWAL] Failed for ${merchant.email}:`, await response.text());
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[RENEWAL] Error for ${merchant.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: merchants.length,
      eligible: merchantsToRemind.length,
      sent,
      failed,
      targetDate: twoDaysFromNow.toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('[RENEWAL CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

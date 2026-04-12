import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHAPI_BASE = 'https://gate.whapi.cloud/messages/text';

/**
 * CRON: Send WhatsApp reminders for coupons expiring within 6 hours.
 *
 * Called every few hours by Railway cron or external scheduler.
 * Joins coupons -> spins -> feedback to retrieve customer_phone.
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
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    // Fetch coupons expiring between now and 6 hours from now, not yet used
    // Join with merchant to check auto_coupon_expiry_enabled
    const { data: coupons, error } = await supabaseAdmin
      .from('coupons')
      .select(`
        id, code, prize_name, expires_at, spin_id, merchant_id,
        merchants!inner(id, business_name, auto_coupon_expiry_enabled)
      `)
      .eq('used', false)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', sixHoursFromNow.toISOString());

    if (error || !coupons) {
      return NextResponse.json({ error: error?.message || 'No coupons found' }, { status: 500 });
    }

    // Filter only merchants with auto_coupon_expiry_enabled
    const enabledCoupons = coupons.filter(
      (c: any) => c.merchants?.auto_coupon_expiry_enabled
    );

    const globalWhapiKey = process.env.WHAPI_API_KEY;
    if (!globalWhapiKey) {
      return NextResponse.json(
        { error: 'WHAPI_API_KEY not configured', eligible: enabledCoupons.length },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://qualee.app';

    let sent = 0;
    let failed = 0;
    let noPhone = 0;

    for (const coupon of enabledCoupons) {
      const merchant = (coupon as any).merchants;

      // Resolve customer phone: join spin -> feedback via user_token
      let customerPhone: string | null = null;

      if (coupon.spin_id) {
        const { data: spin } = await supabaseAdmin
          .from('spins')
          .select('user_token, merchant_id')
          .eq('id', coupon.spin_id)
          .single();

        if (spin?.user_token) {
          const { data: feedback } = await supabaseAdmin
            .from('feedback')
            .select('customer_phone')
            .eq('merchant_id', spin.merchant_id)
            .eq('user_token', spin.user_token)
            .not('customer_phone', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          customerPhone = feedback?.customer_phone || null;
        }
      }

      if (!customerPhone) {
        noPhone++;
        continue;
      }

      const phone = customerPhone.replace(/^\+/, '');
      const businessName = merchant.business_name || 'votre commerce';
      const couponUrl = `${baseUrl}/coupon/${coupon.merchant_id}?code=${coupon.code}`;
      const prizeName = coupon.prize_name || 'votre prix';

      const message = `⏰ Votre coupon ${prizeName} chez ${businessName} expire bientôt ! Utilisez-le avant qu'il ne soit trop tard : ${couponUrl}`;

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
        } else {
          failed++;
          console.error(`[COUPON-EXPIRY] Failed for coupon ${coupon.id}:`, await response.text());
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        failed++;
        console.error(`[COUPON-EXPIRY] Error for coupon ${coupon.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      checked: coupons.length,
      eligible: enabledCoupons.length,
      sent,
      failed,
      noPhone,
    });
  } catch (error: any) {
    console.error('[COUPON-EXPIRY CRON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validatePaymentToken, markTokenUsed } from '@/lib/payments/tokens';
import { checkPaymentStatus } from '@/lib/payments/ebilling';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/payments/status?external_reference=...&token=...
 *
 * Checks E-Billing payment status and updates subscription on completion.
 */
export async function GET(request: NextRequest) {
  try {
    const externalReference = request.nextUrl.searchParams.get('external_reference');
    const token = request.nextUrl.searchParams.get('token');

    if (!externalReference || !token) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // Validate token
    const tokenData = await validatePaymentToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 403 });
    }

    // Check payment exists for this merchant
    const { data: payment } = await supabaseAdmin
      .from('subscription_payments')
      .select('id, merchant_id, tier, status, amount_eur')
      .eq('external_reference', externalReference)
      .eq('merchant_id', tokenData.merchant_id)
      .single();

    if (!payment) {
      return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 });
    }

    // If already completed, return immediately
    if (payment.status === 'completed') {
      return NextResponse.json({ success: true, status: 'completed' });
    }

    // If already terminal, return immediately
    if (['failed', 'cancelled', 'expired'].includes(payment.status)) {
      return NextResponse.json({ success: true, status: payment.status });
    }

    // Check status via E-Billing backend
    const statusResult = await checkPaymentStatus(externalReference);

    if (statusResult.status === 'completed') {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Update payment record
      await supabaseAdmin
        .from('subscription_payments')
        .update({ status: 'completed', paid_at: now })
        .eq('id', payment.id);

      // Update merchant subscription
      await supabaseAdmin
        .from('merchants')
        .update({
          subscription_tier: payment.tier,
          subscription_started_at: now,
          subscription_expires_at: expiresAt,
        })
        .eq('id', payment.merchant_id);

      // Mark token as used
      await markTokenUsed(token);

      return NextResponse.json({ success: true, status: 'completed' });
    }

    // Update payment status if changed
    if (statusResult.status !== payment.status) {
      await supabaseAdmin
        .from('subscription_payments')
        .update({ status: statusResult.status })
        .eq('id', payment.id);
    }

    return NextResponse.json({
      success: true,
      status: statusResult.status,
    });
  } catch (error: any) {
    console.error('[PAYMENT STATUS] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

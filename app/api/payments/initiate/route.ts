import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validatePaymentToken } from '@/lib/payments/tokens';
import { getPlan } from '@/lib/payments/plans';
import {
  generateExternalReference,
  formatPhoneNumber,
  initTransaction,
  createEBill,
  getPortalUrl,
} from '@/lib/payments/ebilling';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/payments/initiate
 *
 * Initiates an E-Billing payment for a subscription.
 * Strict flow: init.php FIRST → e_bills → portal URL
 */
export async function POST(request: NextRequest) {
  try {
    const { token, tier } = await request.json();

    if (!token || !tier) {
      return NextResponse.json({ error: 'Token et plan requis' }, { status: 400 });
    }

    // 1. Validate token
    const tokenData = await validatePaymentToken(token);
    if (!tokenData) {
      return NextResponse.json({ error: 'Lien de paiement invalide ou expiré' }, { status: 403 });
    }

    // 2. Validate plan
    const plan = getPlan(tier);
    if (!plan) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
    }

    // 3. Get merchant phone
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('phone, email, business_name')
      .eq('id', tokenData.merchant_id)
      .single();

    const externalReference = generateExternalReference();
    const phone = formatPhoneNumber(merchant?.phone);
    const description = `Abonnement Cartelle ${plan.name}`;

    // ─── STEP 1: init.php (OBLIGATOIRE — TOUJOURS EN PREMIER) ──────────
    const initResult = await initTransaction({
      userId: tokenData.merchant_id,
      amount: plan.price_xaf,
      phone,
      description,
      externalReference,
    });

    // Si init échoue → STOP IMMÉDIAT, ne PAS continuer
    if (!initResult.success) {
      return NextResponse.json(
        { error: initResult.message || 'Erreur initialisation paiement' },
        { status: 502 }
      );
    }

    // ─── STEP 2: e_bills (SEULEMENT après init réussi) ─────────────────
    const ebillResult = await createEBill({
      email: tokenData.email,
      phone,
      amount: plan.price_xaf,
      description,
      externalReference,
      payerName: tokenData.business_name || 'Marchand Cartelle',
    });

    if (!ebillResult.success || !ebillResult.bill_id) {
      return NextResponse.json(
        { error: ebillResult.message || 'Erreur création facture' },
        { status: 502 }
      );
    }

    // 4. Save payment record
    const paymentType = tokenData.purpose === 'renewal_payment' ? 'renewal' : 'new';

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        merchant_id: tokenData.merchant_id,
        tier,
        amount_xaf: plan.price_xaf,
        payment_type: paymentType,
        external_reference: externalReference,
        ebilling_bill_id: ebillResult.bill_id,
        mysql_init_id: initResult.mysql_id,
        status: 'pending',
      })
      .select('id')
      .single();

    if (paymentError) {
      console.error('[PAYMENT] Insert error:', paymentError);
      return NextResponse.json({ error: 'Erreur enregistrement paiement' }, { status: 500 });
    }

    // 5. Return portal URL
    const portalUrl = getPortalUrl(ebillResult.bill_id);

    return NextResponse.json({
      success: true,
      portal_url: portalUrl,
      external_reference: externalReference,
      payment_id: payment.id,
    });
  } catch (error: any) {
    console.error('[PAYMENT INITIATE] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { token, tier } = body;

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
      return NextResponse.json({ error: `Plan "${tier}" invalide` }, { status: 400 });
    }

    // 3. Get merchant info
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('phone, email, business_name')
      .eq('id', tokenData.merchant_id)
      .single();

    if (merchantError) {
      console.error('[PAYMENT] Merchant fetch error:', merchantError);
      return NextResponse.json({ error: 'Marchand introuvable' }, { status: 404 });
    }

    const externalReference = generateExternalReference();
    const phone = formatPhoneNumber(merchant?.phone);
    const email = tokenData.email || merchant?.email || '';
    const payerName = tokenData.business_name || merchant?.business_name || 'Marchand Qualee';
    const description = `Abonnement Qualee ${plan.name}`;

    console.log('[PAYMENT] Initiating:', { tier, amount: plan.price_eur, phone, externalReference });

    // ─── STEP 1: init.php (OBLIGATOIRE — TOUJOURS EN PREMIER) ──────────
    let initResult;
    try {
      initResult = await initTransaction({
        userId: tokenData.merchant_id,
        amount: plan.price_eur,
        phone,
        description,
        externalReference,
      });
    } catch (initError: any) {
      console.error('[PAYMENT] init.php network error:', initError);
      return NextResponse.json(
        { error: 'Impossible de contacter le serveur de paiement. Réessayez.' },
        { status: 502 }
      );
    }

    // Si init échoue → STOP IMMÉDIAT, ne PAS continuer
    if (!initResult.success) {
      console.error('[PAYMENT] init.php failed:', initResult.message);
      return NextResponse.json(
        { error: initResult.message || 'Erreur initialisation paiement' },
        { status: 502 }
      );
    }

    console.log('[PAYMENT] init.php OK, mysql_id:', initResult.mysql_id);

    // ─── STEP 2: e_bills (SEULEMENT après init réussi) ─────────────────
    let ebillResult;
    try {
      ebillResult = await createEBill({
        email,
        phone,
        amount: plan.price_eur,
        description,
        externalReference,
        payerName,
      });
    } catch (ebillError: any) {
      console.error('[PAYMENT] e_bills network error:', ebillError);
      return NextResponse.json(
        { error: 'Impossible de créer la facture. Réessayez.' },
        { status: 502 }
      );
    }

    if (!ebillResult.success || !ebillResult.bill_id) {
      console.error('[PAYMENT] e_bills failed:', ebillResult.message);
      return NextResponse.json(
        { error: ebillResult.message || 'Erreur création facture' },
        { status: 502 }
      );
    }

    console.log('[PAYMENT] e_bills OK, bill_id:', ebillResult.bill_id);

    // 4. Save payment record
    const paymentType = tokenData.purpose === 'renewal_payment' ? 'renewal' : 'new';

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('subscription_payments')
      .insert({
        merchant_id: tokenData.merchant_id,
        tier,
        amount_eur: plan.price_eur,
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
    console.error('[PAYMENT INITIATE] Unhandled error:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

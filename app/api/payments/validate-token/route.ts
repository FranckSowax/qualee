import { NextRequest, NextResponse } from 'next/server';
import { validatePaymentToken } from '@/lib/payments/tokens';

/**
 * GET /api/payments/validate-token?token=...
 *
 * Validates a subscription token for the public subscribe page.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token manquant' }, { status: 400 });
    }

    const tokenData = await validatePaymentToken(token);

    if (!tokenData) {
      return NextResponse.json({ valid: false, error: 'Lien invalide ou expiré' });
    }

    return NextResponse.json({
      valid: true,
      merchant_id: tokenData.merchant_id,
      business_name: tokenData.business_name,
      current_tier: tokenData.current_tier,
      purpose: tokenData.purpose,
    });
  } catch (error: any) {
    console.error('[VALIDATE TOKEN] Error:', error);
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

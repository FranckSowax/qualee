import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generatePaymentToken } from '@/lib/payments/tokens';

/**
 * POST /api/payments/generate-token
 *
 * Generates a payment token for an authenticated merchant.
 * Used from the billing dashboard to navigate to the subscription page.
 */
export async function POST(request: NextRequest) {
  try {
    const { purpose } = await request.json();

    if (!purpose || !['trial_payment', 'renewal_payment'].includes(purpose)) {
      return NextResponse.json({ error: 'Purpose invalide' }, { status: 400 });
    }

    // Verify authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const token = await generatePaymentToken(user.id, purpose as 'trial_payment' | 'renewal_payment');

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    console.error('[GENERATE TOKEN] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

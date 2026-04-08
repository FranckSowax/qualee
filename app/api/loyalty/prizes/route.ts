import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Returns all prizes (coupons) won by a loyalty client.
 * Links: loyalty_client.user_token → spins.user_token → coupons.spin_id
 *
 * Query params: clientId (loyalty client UUID) OR userToken
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const userToken = searchParams.get('userToken');

    if (!clientId && !userToken) {
      return NextResponse.json({ error: 'clientId ou userToken requis' }, { status: 400 });
    }

    let tokenToUse = userToken;

    // If clientId provided, look up the user_token
    if (clientId && !tokenToUse) {
      const { data: client } = await supabaseAdmin
        .from('loyalty_clients')
        .select('user_token, merchant_id')
        .eq('id', clientId)
        .maybeSingle();

      if (!client?.user_token) {
        return NextResponse.json({ prizes: [] });
      }
      tokenToUse = client.user_token;
    }

    if (!tokenToUse) {
      return NextResponse.json({ prizes: [] });
    }

    // Find all spins with this user_token
    const { data: spins } = await supabaseAdmin
      .from('spins')
      .select('id, merchant_id, prize_id, created_at')
      .eq('user_token', tokenToUse)
      .not('prize_id', 'is', null);

    if (!spins || spins.length === 0) {
      return NextResponse.json({ prizes: [] });
    }

    const spinIds = spins.map(s => s.id);

    // Get all coupons linked to these spins
    const { data: coupons } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .in('spin_id', spinIds)
      .order('created_at', { ascending: false });

    // Enrich with merchant info
    const merchantIds = [...new Set((coupons || []).map(c => c.merchant_id))];
    const { data: merchants } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, logo_url')
      .in('id', merchantIds);

    const merchantMap = new Map((merchants || []).map(m => [m.id, m]));

    const prizes = (coupons || []).map(coupon => {
      const merchant = merchantMap.get(coupon.merchant_id);
      const now = new Date();
      const expiresAt = new Date(coupon.expires_at);
      const isExpired = expiresAt < now;
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: coupon.id,
        code: coupon.code,
        prize_name: coupon.prize_name,
        expires_at: coupon.expires_at,
        used: coupon.used,
        used_at: coupon.used_at,
        created_at: coupon.created_at,
        merchant_id: coupon.merchant_id,
        business_name: merchant?.business_name || 'Commerce',
        logo_url: merchant?.logo_url || null,
        is_expired: isExpired,
        days_left: isExpired ? 0 : daysLeft,
        status: coupon.used ? 'used' : isExpired ? 'expired' : 'active',
      };
    });

    return NextResponse.json({ prizes });
  } catch (error: any) {
    console.error('[LOYALTY PRIZES] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

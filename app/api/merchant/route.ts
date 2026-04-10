import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service role client pour bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/merchant
 *
 * Récupère les informations d'un merchant
 *
 * Query params:
 * - id: UUID du merchant
 * - shopId: shop_id du merchant (pour les pages publiques)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const shopId = searchParams.get('shopId');

    if (!id && !shopId) {
      return NextResponse.json(
        { error: 'id or shopId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('merchants')
      .select('*');

    if (id) {
      query = query.eq('id', id);
    } else if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data: merchant, error } = await query.single();

    if (error || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ merchant });
  } catch (error) {
    console.error('[MERCHANT GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

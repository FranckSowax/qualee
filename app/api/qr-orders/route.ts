import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isAdminEmail } from '@/lib/config/admin';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/qr-orders
 * - Merchants: get their own orders
 * - Admin: get all orders (with ?all=true)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const all = request.nextUrl.searchParams.get('all');

    if (all === 'true' && isAdminEmail(user.email)) {
      // Admin: get all orders with merchant info
      const { data, error } = await supabaseAdmin
        .from('qr_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ orders: data || [] });
    }

    // Merchant: own orders
    const { data, error } = await supabaseAdmin
      .from('qr_orders')
      .select('*')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/qr-orders
 * Create a new QR support order
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const { support_type, quantity, shipping_address, phone, notes } = body;

    if (!support_type || !['paper', 'plexiglas', 'dtf'].includes(support_type)) {
      return NextResponse.json({ error: 'Type de support invalide' }, { status: 400 });
    }

    // Pricing
    let amount_eur = 0;
    const qty = Math.max(1, quantity || 1);

    if (support_type === 'plexiglas') {
      amount_eur = 5000 * qty;
    } else if (support_type === 'dtf') {
      if (qty < 4) {
        return NextResponse.json({ error: 'Minimum 4 unités pour le DTF' }, { status: 400 });
      }
      amount_eur = 10000; // Forfait 4 DTF
      if (qty > 4) {
        amount_eur = Math.ceil(qty / 4) * 10000;
      }
    }
    // paper = gratuit (0)

    // Get merchant info
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('business_name, email')
      .eq('id', user.id)
      .single();

    const { data: order, error } = await supabaseAdmin
      .from('qr_orders')
      .insert({
        merchant_id: user.id,
        merchant_email: merchant?.email || user.email,
        merchant_name: merchant?.business_name || '',
        support_type,
        quantity: qty,
        amount_eur,
        shipping_address: shipping_address || null,
        phone: phone || null,
        notes: notes || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/qr-orders
 * Admin: update order status
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'id et status requis' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('qr_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, order: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

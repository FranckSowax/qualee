import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forfaits disponibles
export const CREDIT_PACKS = [
  { id: 'pack_100', name: '100 crédits', credits: 100, price: 8000, pricePerMsg: 80 },
  { id: 'pack_500', name: '500 crédits', credits: 500, price: 30000, pricePerMsg: 60 },
  { id: 'pack_1000', name: '1 000 crédits', credits: 1000, price: 50000, pricePerMsg: 50 },
  { id: 'pack_5000', name: '5 000 crédits', credits: 5000, price: 200000, pricePerMsg: 40 },
];

// GET — Solde de crédits + forfaits disponibles + historique
export async function GET(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get('merchantId');
    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId requis' }, { status: 400 });
    }

    // Solde actuel
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('campaign_credits')
      .eq('id', merchantId)
      .single();

    // Historique des achats
    const { data: purchases } = await supabaseAdmin
      .from('campaign_credit_purchases')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('purchased_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      credits: merchant?.campaign_credits || 0,
      packs: CREDIT_PACKS,
      purchases: purchases || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Acheter un forfait (pour l'instant sans paiement réel — placeholder eBilling)
export async function POST(request: NextRequest) {
  try {
    const { merchantId, packId } = await request.json();

    if (!merchantId || !packId) {
      return NextResponse.json({ error: 'merchantId et packId requis' }, { status: 400 });
    }

    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: 'Forfait invalide' }, { status: 400 });
    }

    // TODO: Intégrer eBilling Mobile Money ici
    // Pour l'instant, on crédite directement (simulation)

    // Enregistrer l'achat
    await supabaseAdmin.from('campaign_credit_purchases').insert({
      merchant_id: merchantId,
      pack_name: pack.name,
      credits: pack.credits,
      price_fcfa: pack.price,
    });

    // Créditer le merchant
    const { data: current } = await supabaseAdmin
      .from('merchants')
      .select('campaign_credits')
      .eq('id', merchantId)
      .single();

    const newBalance = (current?.campaign_credits || 0) + pack.credits;

    await supabaseAdmin
      .from('merchants')
      .update({ campaign_credits: newBalance })
      .eq('id', merchantId);

    return NextResponse.json({
      success: true,
      credited: pack.credits,
      balance: newBalance,
      pack: pack.name,
      price: pack.price,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

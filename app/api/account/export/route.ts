import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const merchantId = user.id;

    const [
      merchant,
      feedback,
      spins,
      coupons,
      prizes,
      loyaltyClients,
      pointsTransactions,
      loyaltyRewards,
      whatsappCampaigns,
    ] = await Promise.all([
      supabaseAdmin.from('merchants').select('*').eq('id', merchantId).single(),
      supabaseAdmin.from('feedback').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('spins').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('coupons').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('prizes').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('loyalty_clients').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('points_transactions').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('loyalty_rewards').select('*').eq('merchant_id', merchantId),
      supabaseAdmin.from('whatsapp_campaigns').select('*').eq('merchant_id', merchantId),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_email: user.email,
      merchant: merchant.data,
      feedback: feedback.data || [],
      spins: spins.data || [],
      coupons: coupons.data || [],
      prizes: prizes.data || [],
      loyalty_clients: loyaltyClients.data || [],
      points_transactions: pointsTransactions.data || [],
      loyalty_rewards: loyaltyRewards.data || [],
      whatsapp_campaigns: whatsappCampaigns.data || [],
    };

    const filename = `qualee-export-${merchantId}-${Date.now()}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

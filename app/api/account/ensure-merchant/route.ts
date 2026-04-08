import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Safety net endpoint: ensures the authenticated user has a merchant profile.
 * Called by the dashboard on load. If no merchant exists for the user:
 * - Try to find merchant by email and sync the id (orphan recovery)
 * - Otherwise create a fresh merchant profile
 *
 * Returns the merchant data (creates if missing).
 */
export async function POST(_request: NextRequest) {
  try {
    // Get authenticated user from cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use service_role for merchant operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if merchant exists by id
    const { data: existingById } = await supabaseAdmin
      .from('merchants')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (existingById) {
      return NextResponse.json({ merchant: existingById, created: false });
    }

    // Check by email (orphan from previous signup)
    if (user.email) {
      const { data: existingByEmail } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (existingByEmail) {
        // Sync the id
        const { data: updated } = await supabaseAdmin
          .from('merchants')
          .update({ id: user.id })
          .eq('id', existingByEmail.id)
          .select()
          .single();

        return NextResponse.json({ merchant: updated, synced: true });
      }
    }

    // Create new merchant
    const businessName = user.user_metadata?.business_name || 'Mon Commerce';
    const generateRefCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'CART-';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const { data: newMerchant, error: insertError } = await supabaseAdmin
      .from('merchants')
      .insert({
        id: user.id,
        email: user.email,
        business_name: businessName,
        subscription_tier: 'starter',
        is_headquarters: true,
        referral_code: generateRefCode(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ merchant: newMerchant, created: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

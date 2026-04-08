import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom email confirmation route.
 * Exchanges the token_hash from the email link for a session,
 * creates the merchant profile if missing, and redirects to /dashboard.
 *
 * URL pattern: /auth/confirm?token_hash=XXX&type=signup&next=/dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') || 'signup';
  const next = searchParams.get('next') || '/dashboard';

  if (!tokenHash) {
    return NextResponse.redirect(new URL('/auth/login?error=missing_token', request.url));
  }

  // Use anon client to verify the OTP
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.verifyOtp({
    type: type as any,
    token_hash: tokenHash,
  });

  if (error || !data.user) {
    console.error('[CONFIRM] Verify OTP error:', error);
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error?.message || 'verification_failed')}`, request.url));
  }

  // Create merchant profile if it doesn't exist (uses service_role to bypass RLS)
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingMerchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!existingMerchant) {
      const businessName = data.user.user_metadata?.business_name || 'Mon Commerce';

      // Generate referral code
      const generateRefCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'CART-';
        for (let i = 0; i < 4; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      await supabaseAdmin.from('merchants').insert({
        id: data.user.id,
        email: data.user.email,
        business_name: businessName,
        subscription_tier: 'starter',
        is_headquarters: true,
        referral_code: generateRefCode(),
      });

      // Process referral if present
      const refCode = data.user.user_metadata?.referral_code;
      if (refCode) {
        const { data: referrer } = await supabaseAdmin
          .from('merchants')
          .select('id, campaign_credits')
          .eq('referral_code', refCode)
          .single();

        if (referrer) {
          // Insert referral record
          await supabaseAdmin.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: data.user.id,
            status: 'activated',
            credit_amount: 50,
          });

          // Credit both merchants
          await supabaseAdmin
            .from('merchants')
            .update({ campaign_credits: (referrer.campaign_credits || 0) + 50 })
            .eq('id', referrer.id);

          await supabaseAdmin
            .from('merchants')
            .update({ referred_by: referrer.id, campaign_credits: 50 })
            .eq('id', data.user.id);
        }
      }
    }
  } catch (err) {
    console.error('[CONFIRM] Merchant creation error:', err);
    // Continue anyway — user can complete setup later
  }

  // Redirect to dashboard (or wherever)
  return NextResponse.redirect(new URL(next, request.url));
}

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type TokenPurpose = 'trial_payment' | 'renewal_payment';

interface TokenData {
  merchant_id: string;
  purpose: TokenPurpose;
  business_name: string | null;
  email: string;
  current_tier: string;
}

/**
 * Generate a secure payment token for public subscription page access.
 * Token expires in 7 days.
 */
export async function generatePaymentToken(
  merchantId: string,
  purpose: TokenPurpose
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('subscription_tokens').insert({
    merchant_id: merchantId,
    token,
    purpose,
    expires_at: expiresAt,
  });

  if (error) throw new Error(`Failed to create payment token: ${error.message}`);

  return token;
}

/**
 * Validate a payment token. Returns merchant data if valid, null otherwise.
 */
export async function validatePaymentToken(token: string): Promise<TokenData | null> {
  const supabase = getSupabaseAdmin();

  const { data: tokenRow, error: tokenError } = await supabase
    .from('subscription_tokens')
    .select('merchant_id, purpose, expires_at, used_at')
    .eq('token', token)
    .single();

  if (tokenError || !tokenRow) return null;
  if (tokenRow.used_at) return null;
  if (new Date(tokenRow.expires_at) < new Date()) return null;

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id, business_name, email, subscription_tier')
    .eq('id', tokenRow.merchant_id)
    .single();

  if (merchantError || !merchant) return null;

  return {
    merchant_id: merchant.id,
    purpose: tokenRow.purpose,
    business_name: merchant.business_name,
    email: merchant.email,
    current_tier: merchant.subscription_tier || 'starter',
  };
}

/**
 * Mark a token as used.
 */
export async function markTokenUsed(token: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase
    .from('subscription_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token);
}

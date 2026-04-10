import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tier limits for max additional locations (child establishments)
const TIER_MAX_LOCATIONS: Record<string, number> = {
  // Free / trial — no additional locations
  starter: 0,
  free: 0,
  // Paid plans
  essentiel: 1,
  premium: 3,
  'sur-mesure': -1, // unlimited
};

/**
 * GET /api/merchant/locations?merchantId=X
 * List all locations for a parent merchant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
    }

    const { data: locations, error } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, location_name, location_address, email, is_headquarters, created_at')
      .or(`id.eq.${merchantId},parent_merchant_id.eq.${merchantId}`)
      .order('is_headquarters', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[LOCATIONS GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get parent merchant subscription tier for limit info
    const { data: parent } = await supabaseAdmin
      .from('merchants')
      .select('subscription_tier')
      .eq('id', merchantId)
      .single();

    const tier = parent?.subscription_tier || 'starter';
    const maxLocations = TIER_MAX_LOCATIONS[tier] ?? 0;

    return NextResponse.json({ locations: locations || [], maxLocations, tier });
  } catch (error) {
    console.error('[LOCATIONS GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/merchant/locations
 * Create a new location for a parent merchant
 * Body: { parentMerchantId, locationName, locationAddress, email }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentMerchantId, locationName, locationAddress, email } = body;

    if (!parentMerchantId || !locationName || !email) {
      return NextResponse.json(
        { error: 'parentMerchantId, locationName, and email are required' },
        { status: 400 }
      );
    }

    // Check parent merchant exists and get tier
    const { data: parent, error: parentError } = await supabaseAdmin
      .from('merchants')
      .select('id, subscription_tier, business_name')
      .eq('id', parentMerchantId)
      .single();

    if (parentError || !parent) {
      return NextResponse.json({ error: 'Parent merchant not found' }, { status: 404 });
    }

    const tier = parent.subscription_tier || 'starter';
    const maxLocations = TIER_MAX_LOCATIONS[tier] ?? 0;

    // Free plan cannot add any location
    if (maxLocations === 0) {
      return NextResponse.json(
        { error: 'Votre plan gratuit ne permet pas d\'ajouter d\'établissements supplémentaires. Passez au plan Essentiel ou Premium.' },
        { status: 403 }
      );
    }

    // Count existing locations
    const { count } = await supabaseAdmin
      .from('merchants')
      .select('id', { count: 'exact', head: true })
      .eq('parent_merchant_id', parentMerchantId);

    // -1 means unlimited
    if (maxLocations !== -1 && (count || 0) >= maxLocations) {
      return NextResponse.json(
        { error: `Limite atteinte : votre plan ${tier} autorise ${maxLocations} établissement(s) supplémentaire(s). Passez au plan supérieur.` },
        { status: 403 }
      );
    }

    // Create the new location as a merchant row
    const { data: newLocation, error: insertError } = await supabaseAdmin
      .from('merchants')
      .insert({
        email,
        business_name: parent.business_name,
        location_name: locationName,
        location_address: locationAddress,
        parent_merchant_id: parentMerchantId,
        is_headquarters: false,
        subscription_tier: tier,
      })
      .select('id, business_name, location_name, location_address, email, is_headquarters, created_at')
      .single();

    if (insertError) {
      console.error('[LOCATIONS POST] Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ location: newLocation }, { status: 201 });
  } catch (error) {
    console.error('[LOCATIONS POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/merchant/locations?locationId=X&merchantId=Y
 * Delete a location (cannot delete headquarters)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const merchantId = searchParams.get('merchantId');

    if (!locationId || !merchantId) {
      return NextResponse.json(
        { error: 'locationId and merchantId are required' },
        { status: 400 }
      );
    }

    // Verify the location belongs to this parent merchant and is not HQ
    const { data: location, error: fetchError } = await supabaseAdmin
      .from('merchants')
      .select('id, is_headquarters, parent_merchant_id')
      .eq('id', locationId)
      .single();

    if (fetchError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (location.parent_merchant_id !== merchantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (location.is_headquarters) {
      return NextResponse.json(
        { error: 'Impossible de supprimer le siège principal' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('merchants')
      .delete()
      .eq('id', locationId);

    if (deleteError) {
      console.error('[LOCATIONS DELETE] Error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LOCATIONS DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

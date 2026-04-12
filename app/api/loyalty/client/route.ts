import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Helper to get Supabase admin client
function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[LOYALTY CLIENT] Missing env vars:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// NOTE: WhatsApp messages are now sent via /api/whatsapp/combined
// This API no longer sends WhatsApp messages directly to avoid duplicate messages
// The combined message (with both Spin Wheel and Loyalty Card buttons) is sent from the redirect page

/**
 * GET /api/loyalty/client
 *
 * Query params:
 * - merchantId: UUID du merchant (obligatoire)
 * - clientId: UUID du client fidélité (optionnel)
 * - qrCode: QR code data du client (optionnel)
 * - phone: Numéro de téléphone (optionnel)
 * - email: Email du client (optionnel)
 *
 * Returns: LoyaltyClient ou liste de clients
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que Supabase est configuré
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[LOYALTY CLIENT GET] Failed to create Supabase client');
      return NextResponse.json(
        { error: 'Server configuration error', clients: [] },
        { status: 200 } // Return 200 with empty array to not break UI
      );
    }

    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const clientId = searchParams.get('clientId');
    const qrCode = searchParams.get('qrCode');
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    if (!merchantId && !qrCode) {
      return NextResponse.json(
        { error: 'merchantId or qrCode is required' },
        { status: 400 }
      );
    }

    // Recherche par ID client spécifique
    if (clientId) {
      const { data, error } = await supabaseAdmin
        .from('loyalty_clients')
        .select('*')
        .eq('id', clientId)
        .eq('merchant_id', merchantId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ client: data });
    }

    // Recherche par QR code
    if (qrCode) {
      const { data, error } = await supabaseAdmin
        .from('loyalty_clients')
        .select('*')
        .eq('qr_code_data', qrCode)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Client not found', found: false }, { status: 404 });
      }

      // Récupérer les infos du merchant pour l'affichage de la carte
      let merchantData = null;
      if (data?.merchant_id) {
        const { data: merchant } = await supabaseAdmin
          .from('merchants')
          .select('id, business_name, logo_url, logo_background_color, background_url, loyalty_card_image_url, loyalty_enabled')
          .eq('id', data.merchant_id)
          .single();
        merchantData = merchant;
      }

      return NextResponse.json({ client: data, merchant: merchantData, found: true });
    }

    // Recherche par téléphone
    if (phone) {
      const { data, error } = await supabaseAdmin
        .from('loyalty_clients')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('phone', phone)
        .single();

      if (error) {
        return NextResponse.json({ client: null, found: false });
      }

      return NextResponse.json({ client: data, found: true });
    }

    // Recherche par email
    if (email) {
      const { data, error } = await supabaseAdmin
        .from('loyalty_clients')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        return NextResponse.json({ client: null, found: false });
      }

      return NextResponse.json({ client: data, found: true });
    }

    // Liste tous les clients du merchant
    const { data, error } = await supabaseAdmin
      .from('loyalty_clients')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clients: data });
  } catch (error) {
    console.error('[LOYALTY CLIENT GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loyalty/client
 *
 * Crée un nouveau client fidélité ou retourne l'existant
 *
 * Body: {
 *   merchantId: string,
 *   name?: string,
 *   phone?: string,
 *   email?: string,
 *   userToken?: string (lien avec feedback)
 * }
 *
 * Returns: { client: LoyaltyClient, isNew: boolean, welcomePoints?: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que Supabase est configuré
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[LOYALTY CLIENT POST] Failed to create Supabase client');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { merchantId, name, phone, email, userToken } = body;

    if (!merchantId) {
      return NextResponse.json(
        { error: 'merchantId is required' },
        { status: 400 }
      );
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'phone or email is required' },
        { status: 400 }
      );
    }

    // Vérifier que le merchant existe et a la fidélité activée
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, business_name, loyalty_enabled, welcome_points')
      .eq('id', merchantId)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    if (!merchant.loyalty_enabled) {
      return NextResponse.json(
        { error: 'Loyalty program not enabled for this merchant' },
        { status: 400 }
      );
    }

    // Vérifier si le client existe déjà (par phone ou email)
    let existingClient = null;

    if (phone) {
      const { data } = await supabaseAdmin
        .from('loyalty_clients')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('phone', phone)
        .single();
      existingClient = data;
    }

    if (!existingClient && email) {
      const { data } = await supabaseAdmin
        .from('loyalty_clients')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('email', email.toLowerCase())
        .single();
      existingClient = data;
    }

    // Si existe, mettre à jour last_visit et envoyer message de rappel
    if (existingClient) {
      const { data: updatedClient, error: updateError } = await supabaseAdmin
        .from('loyalty_clients')
        .update({
          last_visit: new Date().toISOString(),
          // Mettre à jour le user_token si fourni
          ...(userToken && { user_token: userToken })
        })
        .eq('id', existingClient.id)
        .select()
        .single();

      if (updateError) {
        console.error('[LOYALTY CLIENT] Update error:', updateError);
      }

      const clientData = updatedClient || existingClient;

      // NOTE: WhatsApp message is now sent via /api/whatsapp/combined from redirect page
      // This avoids duplicate messages and consolidates spin wheel + loyalty card into one message

      return NextResponse.json({
        client: clientData,
        isNew: false,
        cardUrl: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://qualee.app'}/card/${clientData.qr_code_data}`
      });
    }

    // Générer un nouveau card_id unique
    // Format: XXXX-YYYY-XXXXXXXX (4 premières lettres du merchant + année + timestamp + random)
    // Exemple: WEED-2026-123456AB pour "Weedin Coffee"
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    // Extraire les 4 premières lettres du nom du merchant (en majuscules, sans espaces/caractères spéciaux)
    const merchantPrefix = (merchant.business_name || 'CART')
      .replace(/[^a-zA-Z]/g, '') // Garder seulement les lettres
      .substring(0, 4)
      .toUpperCase()
      .padEnd(4, 'X'); // Compléter avec X si moins de 4 lettres
    const cardId = `${merchantPrefix}-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}${randomSuffix}`;

    // Générer un QR code unique
    const qrCodeData = uuidv4();

    // Créer le nouveau client
    const welcomePoints = merchant.welcome_points || 50;

    console.log('[LOYALTY CLIENT] Creating new client with:', {
      merchant_id: merchantId,
      card_id: cardId,
      phone: phone || null,
      points: welcomePoints,
      qr_code_data: qrCodeData
    });

    const { data: newClient, error: createError } = await supabaseAdmin
      .from('loyalty_clients')
      .insert({
        merchant_id: merchantId,
        card_id: cardId,
        name: name || null,
        phone: phone || null,
        email: email ? email.toLowerCase() : null,
        points: welcomePoints,
        total_purchases: 0,
        total_spent: 0,
        qr_code_data: qrCodeData,
        user_token: userToken || null,
        preferred_language: body.language || 'fr',
        status: 'active',
        last_visit: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[LOYALTY CLIENT] Create error:', JSON.stringify(createError, null, 2));
      return NextResponse.json(
        { error: createError.message, details: createError },
        { status: 500 }
      );
    }

    console.log('[LOYALTY CLIENT] Client created successfully:', newClient?.id);

    // Créer la transaction de points de bienvenue
    if (welcomePoints > 0) {
      await supabaseAdmin
        .from('points_transactions')
        .insert({
          client_id: newClient.id,
          merchant_id: merchantId,
          type: 'welcome',
          points: welcomePoints,
          balance_after: welcomePoints,
          description: 'Points de bienvenue'
        });
    }

    // NOTE: WhatsApp message is now sent via /api/whatsapp/combined from redirect page
    // This consolidates spin wheel + loyalty card into one message with 2 buttons

    return NextResponse.json({
      client: newClient,
      isNew: true,
      welcomePoints,
      cardUrl: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://qualee.app'}/card/${qrCodeData}`
    });
  } catch (error) {
    console.error('[LOYALTY CLIENT POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/loyalty/client
 *
 * Met à jour un client fidélité
 *
 * Body: {
 *   clientId: string,
 *   merchantId: string,
 *   updates: Partial<LoyaltyClient>
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Vérifier que Supabase est configuré
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[LOYALTY CLIENT PATCH] Failed to create Supabase client');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { clientId, merchantId, qrCode, updates } = body;

    // Mode 1: Mise à jour par merchant (clientId + merchantId)
    // Mode 2: Mise à jour par client lui-même (qrCode)
    if (!qrCode && (!clientId || !merchantId)) {
      return NextResponse.json(
        { error: 'qrCode or (clientId and merchantId) are required' },
        { status: 400 }
      );
    }

    // Champs autorisés pour mise à jour
    const allowedFields = ['name', 'phone', 'email', 'birthday', 'status', 'preferred_language'];
    const sanitizedUpdates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        if (key === 'email') {
          sanitizedUpdates[key] = updates[key]?.toLowerCase() || null;
        } else if (key === 'birthday') {
          // Valider le format de date
          sanitizedUpdates[key] = updates[key] || null;
        } else {
          sanitizedUpdates[key] = updates[key];
        }
      }
    }

    let query = supabaseAdmin
      .from('loyalty_clients')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      });

    // Utiliser qrCode ou clientId+merchantId selon le mode
    if (qrCode) {
      query = query.eq('qr_code_data', qrCode);
    } else {
      query = query.eq('id', clientId).eq('merchant_id', merchantId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client: data });
  } catch (error) {
    console.error('[LOYALTY CLIENT PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

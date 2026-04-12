import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Vérification des variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role client pour bypass RLS
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * GET /api/loyalty/points
 *
 * Récupère l'historique des transactions de points
 *
 * Query params:
 * - clientId: UUID du client fidélité (obligatoire)
 * - merchantId: UUID du merchant (obligatoire)
 * - limit: Nombre de transactions (optionnel, défaut 50)
 * - offset: Offset pour pagination (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que Supabase est configuré
    if (!supabaseAdmin) {
      console.error('[LOYALTY POINTS GET] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error', transactions: [] },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const merchantId = searchParams.get('merchantId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // clientId is required
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required', transactions: [] },
        { status: 200 }
      );
    }

    // Build query - merchantId is optional for public card page
    let query = supabaseAdmin
      .from('points_transactions')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Récupérer le solde actuel
    const { data: client } = await supabaseAdmin
      .from('loyalty_clients')
      .select('points')
      .eq('id', clientId)
      .single();

    return NextResponse.json({
      transactions,
      total: count,
      currentBalance: client?.points || 0
    });
  } catch (error) {
    console.error('[LOYALTY POINTS GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loyalty/points
 *
 * Ajoute ou retire des points
 *
 * Body: {
 *   clientId: string,
 *   merchantId: string,
 *   action: 'earn' | 'redeem' | 'bonus' | 'adjustment',
 *   points?: number (pour bonus/adjustment),
 *   purchaseAmount?: number (pour earn - calcul automatique),
 *   description?: string,
 *   referenceId?: string (ID récompense pour redeem)
 * }
 *
 * Returns: { transaction: PointsTransaction, newBalance: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que Supabase est configuré
    if (!supabaseAdmin) {
      console.error('[LOYALTY POINTS POST] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      clientId,
      merchantId,
      action,
      points: providedPoints,
      purchaseAmount,
      description,
      referenceId
    } = body;

    if (!clientId || !merchantId || !action) {
      return NextResponse.json(
        { error: 'clientId, merchantId, and action are required' },
        { status: 400 }
      );
    }

    // Récupérer les infos du merchant et du client
    const [merchantResult, clientResult] = await Promise.all([
      supabaseAdmin
        .from('merchants')
        .select('points_per_purchase, purchase_amount_threshold, loyalty_currency')
        .eq('id', merchantId)
        .single(),
      supabaseAdmin
        .from('loyalty_clients')
        .select('id, points, total_purchases, total_spent')
        .eq('id', clientId)
        .eq('merchant_id', merchantId)
        .single()
    ]);

    if (merchantResult.error || !merchantResult.data) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }

    if (clientResult.error || !clientResult.data) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const merchant = merchantResult.data;
    const client = clientResult.data;

    let pointsToAdd = 0;
    let transactionDescription = description || '';

    switch (action) {
      case 'earn':
        if (!purchaseAmount || purchaseAmount <= 0) {
          return NextResponse.json(
            { error: 'purchaseAmount is required for earn action' },
            { status: 400 }
          );
        }

        // Calculer les points basés sur le montant d'achat
        const threshold = merchant.purchase_amount_threshold || 1000;
        const pointsPerPurchase = merchant.points_per_purchase || 10;
        pointsToAdd = Math.floor(purchaseAmount / threshold) * pointsPerPurchase;

        if (pointsToAdd <= 0) {
          return NextResponse.json(
            { error: `Minimum purchase of ${threshold} EUR required to earn points` },
            { status: 400 }
          );
        }

        transactionDescription = transactionDescription || `Achat de ${purchaseAmount} EUR`;
        break;

      case 'bonus':
        if (!providedPoints || providedPoints <= 0) {
          return NextResponse.json(
            { error: 'points is required for bonus action' },
            { status: 400 }
          );
        }
        pointsToAdd = providedPoints;
        transactionDescription = transactionDescription || 'Points bonus';
        break;

      case 'adjustment':
        if (providedPoints === undefined) {
          return NextResponse.json(
            { error: 'points is required for adjustment action' },
            { status: 400 }
          );
        }
        pointsToAdd = providedPoints; // Peut être négatif
        transactionDescription = transactionDescription || 'Ajustement manuel';
        break;

      case 'redeem':
        if (!providedPoints || providedPoints <= 0) {
          return NextResponse.json(
            { error: 'points is required for redeem action' },
            { status: 400 }
          );
        }
        if (client.points < providedPoints) {
          return NextResponse.json(
            { error: 'Insufficient points', currentBalance: client.points },
            { status: 400 }
          );
        }
        pointsToAdd = -providedPoints; // Négatif pour déduire
        transactionDescription = transactionDescription || 'Échange de points';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: earn, redeem, bonus, or adjustment' },
          { status: 400 }
        );
    }

    const newBalance = client.points + pointsToAdd;

    // Vérifier que le solde ne devient pas négatif
    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Operation would result in negative balance', currentBalance: client.points },
        { status: 400 }
      );
    }

    // Créer la transaction
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('points_transactions')
      .insert({
        client_id: clientId,
        merchant_id: merchantId,
        type: action,
        points: pointsToAdd,
        balance_after: newBalance,
        purchase_amount: purchaseAmount || null,
        description: transactionDescription,
        reference_id: referenceId || null
      })
      .select()
      .single();

    if (transactionError) {
      console.error('[LOYALTY POINTS] Transaction error:', transactionError);
      return NextResponse.json(
        { error: transactionError.message },
        { status: 500 }
      );
    }

    // Mettre à jour le client
    const updateData: Record<string, any> = {
      points: newBalance,
      last_visit: new Date().toISOString()
    };

    // Pour les achats, mettre à jour les statistiques
    if (action === 'earn' && purchaseAmount) {
      updateData.total_purchases = client.total_purchases + 1;
      updateData.total_spent = parseFloat(client.total_spent) + purchaseAmount;
    }

    const { error: updateError } = await supabaseAdmin
      .from('loyalty_clients')
      .update(updateData)
      .eq('id', clientId);

    if (updateError) {
      console.error('[LOYALTY POINTS] Update client error:', updateError);
      // Ne pas échouer la requête, la transaction est déjà créée
    }

    return NextResponse.json({
      transaction,
      newBalance,
      pointsAdded: pointsToAdd
    });
  } catch (error) {
    console.error('[LOYALTY POINTS POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

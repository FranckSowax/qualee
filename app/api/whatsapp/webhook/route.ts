import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_SECRET = process.env.META_WHATSAPP_APP_SECRET || '';

// Status priority — only advance forward
const STATUS_PRIORITY: Record<string, number> = {
  queued: 0, sent: 1, delivered: 2, read: 3, failed: 1,
};

// GET — Meta webhook verification
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && challenge) {
    // Look up the verify token in any merchant config
    if (token) {
      const { data } = await supabaseAdmin
        .from('merchant_whatsapp_config')
        .select('id')
        .eq('webhook_verify_token', token)
        .limit(1);

      if (data && data.length > 0) {
        return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
    }

    // Also accept if a global verify token matches
    if (token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    return new Response('Forbidden', { status: 403 });
  }

  return new Response('OK', { status: 200 });
}

// POST — Receive status updates from Meta
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Validate signature if APP_SECRET is configured
    if (APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (signature) {
        const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');
        if (signature !== expected) {
          console.error('[WEBHOOK] Invalid signature');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      }
    }

    const body = JSON.parse(rawBody);

    // Process status updates
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const statuses = change?.value?.statuses || [];

        for (const status of statuses) {
          const messageId = status.id; // wamid
          const newStatus = mapMetaStatus(status.status);
          const timestamp = status.timestamp ? new Date(parseInt(status.timestamp) * 1000).toISOString() : new Date().toISOString();

          if (!messageId || !newStatus) continue;

          // Look up the message
          const { data: msg } = await supabaseAdmin
            .from('whatsapp_campaign_messages')
            .select('id, status')
            .eq('meta_message_id', messageId)
            .single();

          if (!msg) continue;

          // Only advance status forward
          const currentPriority = STATUS_PRIORITY[msg.status] || 0;
          const newPriority = STATUS_PRIORITY[newStatus] || 0;
          if (newPriority <= currentPriority && newStatus !== 'failed') continue;

          const updateData: any = { status: newStatus };
          if (newStatus === 'delivered') updateData.delivered_at = timestamp;
          if (newStatus === 'read') updateData.read_at = timestamp;
          if (newStatus === 'failed') {
            updateData.failed_at = timestamp;
            updateData.error_message = status.errors?.[0]?.title || 'Delivery failed';
          }

          await supabaseAdmin
            .from('whatsapp_campaign_messages')
            .update(updateData)
            .eq('id', msg.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function mapMetaStatus(metaStatus: string): string | null {
  switch (metaStatus) {
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'read': return 'read';
    case 'failed': return 'failed';
    default: return null;
  }
}

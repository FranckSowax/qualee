import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendTemplateMessage } from '@/lib/whatsapp/client';

const DEFAULT_COST_PER_MESSAGE = 50; // FCFA

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Return message price for a merchant (used by send page for cost preview)
export async function GET(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get('merchantId');
    if (!merchantId) {
      return NextResponse.json({ price: DEFAULT_COST_PER_MESSAGE });
    }

    const { data } = await supabaseAdmin
      .from('merchant_whatsapp_config')
      .select('message_price_fcfa')
      .eq('merchant_id', merchantId)
      .single();

    return NextResponse.json({
      price: data?.message_price_fcfa || DEFAULT_COST_PER_MESSAGE,
    });
  } catch {
    return NextResponse.json({ price: DEFAULT_COST_PER_MESSAGE });
  }
}

// POST — Send campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, merchantId, templateId, recipients, variables } = body;

    if (!merchantId || !templateId || !recipients?.length) {
      return NextResponse.json({ error: 'merchantId, templateId et recipients requis' }, { status: 400 });
    }

    // 1. Get merchant WhatsApp config + price
    const config = await getWhatsAppConfig(merchantId);
    if (config.provider !== 'meta' || !config.accessToken) {
      return NextResponse.json({ error: 'Configuration Meta WhatsApp requise' }, { status: 400 });
    }

    const { data: waConfig } = await supabaseAdmin
      .from('merchant_whatsapp_config')
      .select('message_price_fcfa')
      .eq('merchant_id', merchantId)
      .single();

    const costPerMessage = waConfig?.message_price_fcfa || DEFAULT_COST_PER_MESSAGE;

    // 2. Verify template is APPROVED
    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .eq('merchant_id', merchantId)
      .single();

    if (!template || template.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Le template doit être approuvé par Meta avant envoi' }, { status: 400 });
    }

    // 3. Calculate cost
    const estimatedCost = recipients.length * costPerMessage;

    // 4. Create or update campaign record
    let actualCampaignId = campaignId;
    if (!actualCampaignId) {
      const { data: campaign, error: campErr } = await supabaseAdmin
        .from('whatsapp_campaigns')
        .insert({
          merchant_id: merchantId,
          name: `Campagne ${template.name} — ${new Date().toLocaleDateString('fr')}`,
          template_id: templateId,
          template_variables: variables || {},
          estimated_cost_fcfa: estimatedCost,
          total_recipients: recipients.length,
        })
        .select()
        .single();

      if (campErr) {
        return NextResponse.json({ error: campErr.message }, { status: 500 });
      }
      actualCampaignId = campaign.id;
    } else {
      await supabaseAdmin
        .from('whatsapp_campaigns')
        .update({
          template_id: templateId,
          template_variables: variables || {},
          estimated_cost_fcfa: estimatedCost,
          total_recipients: recipients.length,
        })
        .eq('id', actualCampaignId);
    }

    // 5. Insert message rows as queued
    const messageRows = recipients.map((r: { phone: string; name?: string }) => ({
      campaign_id: actualCampaignId,
      merchant_id: merchantId,
      recipient_phone: r.phone,
      recipient_name: r.name || null,
      status: 'queued',
      cost_fcfa: costPerMessage,
    }));

    await supabaseAdmin.from('whatsapp_campaign_messages').insert(messageRows);

    // 6. Send messages
    let sent = 0;
    let failed = 0;
    let totalCost = 0;

    const templateComponents = variables?.components || [];

    for (const recipient of recipients) {
      const phone = recipient.phone.replace(/^\+/, '');

      const result = await sendTemplateMessage(config, {
        to: phone,
        templateName: template.name,
        languageCode: template.language,
        components: templateComponents,
      });

      const updateData: any = {};
      if (result.success) {
        updateData.status = 'sent';
        updateData.sent_at = new Date().toISOString();
        updateData.meta_message_id = result.messageId;
        sent++;
        totalCost += costPerMessage;
      } else {
        updateData.status = 'failed';
        updateData.failed_at = new Date().toISOString();
        updateData.error_message = result.error;
        failed++;
      }

      await supabaseAdmin
        .from('whatsapp_campaign_messages')
        .update(updateData)
        .eq('campaign_id', actualCampaignId)
        .eq('recipient_phone', recipient.phone)
        .eq('status', 'queued');

      // Rate limiting — ~10 msg/sec
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 7. Update campaign totals
    await supabaseAdmin
      .from('whatsapp_campaigns')
      .update({
        actual_cost_fcfa: totalCost,
        send_count: sent,
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', actualCampaignId);

    return NextResponse.json({
      success: true,
      campaignId: actualCampaignId,
      sent,
      failed,
      totalCost,
      estimatedCost,
      costPerMessage,
    });
  } catch (error: any) {
    console.error('[CAMPAIGN SEND] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

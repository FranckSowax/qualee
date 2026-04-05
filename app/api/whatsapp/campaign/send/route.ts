import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';
import { sendTemplateMessage } from '@/lib/whatsapp/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Return merchant credit balance
export async function GET(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get('merchantId');
    if (!merchantId) {
      return NextResponse.json({ credits: 0 });
    }

    const { data } = await supabaseAdmin
      .from('merchants')
      .select('campaign_credits')
      .eq('id', merchantId)
      .single();

    return NextResponse.json({
      credits: data?.campaign_credits || 0,
    });
  } catch {
    return NextResponse.json({ credits: 0 });
  }
}

// POST — Send campaign (1 credit = 1 message)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, merchantId, templateId, recipients, variables } = body;

    if (!merchantId || !templateId || !recipients?.length) {
      return NextResponse.json({ error: 'merchantId, templateId et recipients requis' }, { status: 400 });
    }

    // 1. Check credits
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('campaign_credits')
      .eq('id', merchantId)
      .single();

    const currentCredits = merchant?.campaign_credits || 0;
    const requiredCredits = recipients.length;

    if (currentCredits < requiredCredits) {
      return NextResponse.json({
        error: `Crédits insuffisants. Vous avez ${currentCredits} crédit(s) mais cette campagne nécessite ${requiredCredits} crédit(s). Achetez un forfait pour continuer.`,
        creditsAvailable: currentCredits,
        creditsRequired: requiredCredits,
      }, { status: 402 });
    }

    // 2. Get merchant WhatsApp config
    const config = await getWhatsAppConfig(merchantId);
    if (config.provider !== 'meta' || !config.accessToken) {
      return NextResponse.json({ error: 'Configuration Meta WhatsApp requise' }, { status: 400 });
    }

    // 3. Verify template is APPROVED
    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .eq('merchant_id', merchantId)
      .single();

    if (!template || template.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Le template doit être approuvé par Meta avant envoi' }, { status: 400 });
    }

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
          estimated_cost_fcfa: 0,
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
      cost_fcfa: 0,
    }));

    await supabaseAdmin.from('whatsapp_campaign_messages').insert(messageRows);

    // 6. Send messages
    let sent = 0;
    let failed = 0;
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

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 7. Deduct credits (only for successfully sent messages)
    const newBalance = currentCredits - sent;
    await supabaseAdmin
      .from('merchants')
      .update({ campaign_credits: Math.max(0, newBalance) })
      .eq('id', merchantId);

    // 8. Update campaign totals
    await supabaseAdmin
      .from('whatsapp_campaigns')
      .update({
        send_count: sent,
        total_recipients: recipients.length,
        last_sent_at: new Date().toISOString(),
      })
      .eq('id', actualCampaignId);

    return NextResponse.json({
      success: true,
      campaignId: actualCampaignId,
      sent,
      failed,
      creditsUsed: sent,
      creditsRemaining: Math.max(0, newBalance),
    });
  } catch (error: any) {
    console.error('[CAMPAIGN SEND] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

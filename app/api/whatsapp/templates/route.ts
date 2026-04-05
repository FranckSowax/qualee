import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppConfig } from '@/lib/whatsapp/config';

const META_API = 'https://graph.facebook.com/v21.0';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — List templates for a merchant
export async function GET(request: NextRequest) {
  try {
    const merchantId = request.nextUrl.searchParams.get('merchantId');
    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId requis' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Sync from Meta, Create template, or Delete
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, merchantId } = body;

    if (!merchantId) {
      return NextResponse.json({ error: 'merchantId requis' }, { status: 400 });
    }

    const config = await getWhatsAppConfig(merchantId);
    if (config.provider !== 'meta' || !config.wabaId || !config.accessToken) {
      return NextResponse.json({ error: 'Configuration Meta WhatsApp requise. Contactez l\'administrateur.' }, { status: 400 });
    }

    // ─── SYNC FROM META ─────────────────────────
    if (action === 'sync') {
      const metaRes = await fetch(
        `${META_API}/${config.wabaId}/message_templates?limit=100`,
        { headers: { 'Authorization': `Bearer ${config.accessToken}` } }
      );

      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        return NextResponse.json({ error: err?.error?.message || 'Erreur sync Meta' }, { status: 500 });
      }

      const metaData = await metaRes.json();
      const metaTemplates = metaData.data || [];
      let synced = 0;

      for (const tpl of metaTemplates) {
        await supabaseAdmin
          .from('whatsapp_templates')
          .upsert({
            merchant_id: merchantId,
            meta_template_id: tpl.id,
            name: tpl.name,
            language: tpl.language,
            category: tpl.category,
            status: tpl.status,
            components: tpl.components || [],
            rejection_reason: tpl.rejected_reason || null,
            approved_at: tpl.status === 'APPROVED' ? new Date().toISOString() : null,
          }, { onConflict: 'merchant_id,name,language' });
        synced++;
      }

      return NextResponse.json({ success: true, synced, total: metaTemplates.length });
    }

    // ─── CREATE & SUBMIT TO META ─────────────────────────
    if (action === 'create') {
      const { name, language, category, components } = body;

      if (!name || !components) {
        return NextResponse.json({ error: 'name et components requis' }, { status: 400 });
      }

      // Submit to Meta
      const metaPayload = {
        name: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        language: language || 'fr',
        category: category || 'MARKETING',
        components,
      };

      const metaRes = await fetch(
        `${META_API}/${config.wabaId}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        }
      );

      const metaResult = await metaRes.json();

      if (!metaRes.ok) {
        return NextResponse.json({
          error: metaResult?.error?.message || 'Erreur création template Meta',
          details: metaResult?.error,
        }, { status: 400 });
      }

      // Store locally
      const { data, error } = await supabaseAdmin
        .from('whatsapp_templates')
        .insert({
          merchant_id: merchantId,
          meta_template_id: metaResult.id,
          name: metaPayload.name,
          language: metaPayload.language,
          category: metaPayload.category,
          status: metaResult.status || 'PENDING',
          components,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ template: data, metaId: metaResult.id, status: metaResult.status });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Delete template from Meta and local DB
export async function DELETE(request: NextRequest) {
  try {
    const templateId = request.nextUrl.searchParams.get('templateId');
    const merchantId = request.nextUrl.searchParams.get('merchantId');

    if (!templateId || !merchantId) {
      return NextResponse.json({ error: 'templateId et merchantId requis' }, { status: 400 });
    }

    // Get template info
    const { data: template } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .eq('merchant_id', merchantId)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template introuvable' }, { status: 404 });
    }

    // Delete from Meta if it has a meta_template_id
    if (template.meta_template_id) {
      const config = await getWhatsAppConfig(merchantId);
      if (config.provider === 'meta' && config.wabaId && config.accessToken) {
        await fetch(
          `${META_API}/${config.wabaId}/message_templates?name=${template.name}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${config.accessToken}` },
          }
        );
      }
    }

    // Delete locally
    await supabaseAdmin
      .from('whatsapp_templates')
      .delete()
      .eq('id', templateId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

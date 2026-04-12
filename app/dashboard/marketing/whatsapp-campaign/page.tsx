'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CampaignOnboarding } from '@/components/dashboard/CampaignOnboarding';
import { CampaignLock } from '@/components/dashboard/CampaignLock';
import { EXEMPT_EMAILS } from '@/lib/config/admin';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Send,
  Eye,
  Check,
  Upload,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Users,
  Save,
  FolderOpen,
  Star,
  Clock,
  EyeOff,
  ChevronRight,
  FileText,
  LayoutTemplate,
  Layers,
  Type,
  MousePointerClick,
  Hash,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarouselCard {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  text: string;
  buttonType: 'url' | 'quick_reply';
  buttonTitle: string;
  buttonUrl?: string;
}

interface SavedCampaign {
  id: string;
  merchant_id: string;
  name: string;
  main_message: string;
  cards: CarouselCard[];
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  send_count: number;
  last_sent_at: string | null;
}

interface TemplateButton {
  type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO';
  text?: string;
  buttons?: TemplateButton[];
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
  created_at: string;
}

type CampaignMode = 'template' | 'carousel';

const generateId = () => Math.random().toString(36).substring(2, 9);

// ---------------------------------------------------------------------------
// Helper: extract {{1}}, {{2}}, etc. from template body text
// ---------------------------------------------------------------------------
function extractVariables(components: TemplateComponent[]): { section: string; index: number; placeholder: string }[] {
  const vars: { section: string; index: number; placeholder: string }[] = [];
  for (const comp of components) {
    if (comp.text) {
      const matches = comp.text.matchAll(/\{\{(\d+)\}\}/g);
      for (const m of matches) {
        vars.push({
          section: comp.type,
          index: parseInt(m[1]),
          placeholder: m[0],
        });
      }
    }
  }
  return vars;
}

// ---------------------------------------------------------------------------
// Template Preview Component
// ---------------------------------------------------------------------------
function TemplatePreview({ template, variables }: { template: WhatsAppTemplate; variables: Record<string, string> }) {
  const header = template.components.find(c => c.type === 'HEADER');
  const body = template.components.find(c => c.type === 'BODY');
  const footer = template.components.find(c => c.type === 'FOOTER');
  const buttons = template.components.find(c => c.type === 'BUTTONS');

  const replaceVars = (text: string) => {
    return text.replace(/\{\{(\d+)\}\}/g, (match, num) => {
      return variables[`BODY_${num}`] || variables[`HEADER_${num}`] || match;
    });
  };

  return (
    <div className="bg-[#E5DDD5] rounded-xl p-3 max-h-[400px] overflow-y-auto">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden max-w-[260px] mx-auto">
        {/* Header */}
        {header && header.format === 'IMAGE' && (
          <div className="h-32 bg-gray-200 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        {header && header.text && (
          <div className="px-3 pt-3">
            <p className="text-xs font-bold text-gray-900">{replaceVars(header.text)}</p>
          </div>
        )}

        {/* Body */}
        {body?.text && (
          <div className="px-3 py-2">
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{replaceVars(body.text)}</p>
          </div>
        )}

        {/* Footer */}
        {footer?.text && (
          <div className="px-3 pb-2">
            <p className="text-[10px] text-gray-400">{footer.text}</p>
          </div>
        )}

        {/* Buttons */}
        {buttons?.buttons && buttons.buttons.length > 0 && (
          <div className="border-t border-gray-100">
            {buttons.buttons.map((btn, i) => (
              <div
                key={i}
                className="py-2 text-center text-xs font-medium text-pink-600 border-b border-gray-100 last:border-b-0 flex items-center justify-center gap-1"
              >
                {btn.type === 'URL' && <LinkIcon className="w-3 h-3" />}
                {btn.type === 'PHONE_NUMBER' && <Hash className="w-3 h-3" />}
                {btn.type === 'QUICK_REPLY' && <MousePointerClick className="w-3 h-3" />}
                {btn.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function WhatsAppCampaignPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Mode toggle
  const [mode, setMode] = useState<CampaignMode>('template');

  // Credits
  const [credits, setCredits] = useState(0);
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  // ─── Template mode state ────────────────────────────────
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // ─── Carousel mode state (existing) ─────────────────────
  const [campaignName, setCampaignName] = useState('');
  const [mainMessage, setMainMessage] = useState('');
  const [cards, setCards] = useState<CarouselCard[]>([
    {
      id: generateId(),
      mediaUrl: '',
      mediaType: 'image',
      text: '',
      buttonType: 'url',
      buttonTitle: '',
      buttonUrl: '',
    },
  ]);

  // UI state
  const [showPreview, setShowPreview] = useState(true);
  const [uploadingCard, setUploadingCard] = useState<string | null>(null);

  // Saved campaigns state
  const [savedCampaigns, setSavedCampaigns] = useState<SavedCampaign[]>([]);
  const [showSavedCampaigns, setShowSavedCampaigns] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Onboarding + lock gate
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loyaltyClientCount, setLoyaltyClientCount] = useState<number>(0);
  const [gateChecked, setGateChecked] = useState(false);

  useEffect(() => {
    const fetchMerchant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', user.id)
          .single();
        setMerchant(data);

        // Count loyalty clients for the 100-client gate
        const { count } = await supabase
          .from('loyalty_clients')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', user.id);
        setLoyaltyClientCount(count || 0);
        setGateChecked(true);

        // Auto-show onboarding if never dismissed
        const dismissed = localStorage.getItem('qualee_campaign_onboarding_dismissed');
        if (!dismissed) {
          setTimeout(() => setShowOnboarding(true), 600);
        }

        // Fetch saved campaigns
        fetchSavedCampaigns(user.id);
        // Fetch templates
        fetchTemplates(user.id);
        // Fetch credits
        fetchCredits(user.id);
      }
      setLoading(false);
    };
    fetchMerchant();
  }, []);

  // ─── Template fetching ──────────────────────────────────
  const fetchTemplates = async (merchantId: string) => {
    setTemplatesLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/templates?merchantId=${merchantId}`);
      const data = await response.json();
      if (data.templates) {
        // Only show APPROVED templates
        setTemplates(data.templates.filter((tpl: WhatsAppTemplate) => tpl.status === 'APPROVED'));
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchCredits = async (merchantId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/credits?merchantId=${merchantId}`);
      const data = await res.json();
      setCredits(data.credits || 0);
      setCreditPacks(data.packs || []);
    } catch { /* ignore */ }
  };

  const buyPack = async (packId: string) => {
    if (!merchant) return;
    setBuyingPack(packId);
    try {
      const res = await fetch('/api/whatsapp/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id, packId }),
      });
      const data = await res.json();
      if (data.success) {
        setCredits(data.balance);
        alert(`${data.credited} crédits ajoutés ! Solde : ${data.balance}`);
      } else {
        alert(data.error || 'Erreur');
      }
    } catch { alert('Erreur réseau'); }
    finally { setBuyingPack(null); }
  };

  const selectTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    // Initialize variables
    const vars = extractVariables(template.components);
    const initial: Record<string, string> = {};
    for (const v of vars) {
      initial[`${v.section}_${v.index}`] = '';
    }
    setTemplateVariables(initial);
  };

  const goToTemplateSend = () => {
    if (!selectedTemplate || !merchant) return;
    const params = new URLSearchParams({
      mode: 'template',
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      templateLanguage: selectedTemplate.language,
    });
    // Pass variables
    const varsJson = JSON.stringify(templateVariables);
    params.set('variables', varsJson);
    router.push(`/dashboard/marketing/whatsapp-campaign/send?${params.toString()}`);
  };

  // ─── Carousel saved campaigns ───────────────────────────
  const fetchSavedCampaigns = async (merchantId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/campaigns?merchantId=${merchantId}`);
      const data = await response.json();
      if (data.campaigns) {
        setSavedCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const saveCampaign = async () => {
    if (!merchant || !campaignName.trim()) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const payload = {
        merchantId: merchant.id,
        name: campaignName,
        mainMessage: mainMessage,
        cards: cards,
      };

      let response;
      if (currentCampaignId) {
        response = await fetch('/api/whatsapp/campaigns', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: currentCampaignId }),
        });
      } else {
        response = await fetch('/api/whatsapp/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (response.ok && data.campaign) {
        setSaveMessage({ type: 'success', text: t('marketing.whatsappCampaign.campaignSaved') });
        setCurrentCampaignId(data.campaign.id);
        fetchSavedCampaigns(merchant.id);
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: data.error || t('marketing.whatsappCampaign.saveFailed') });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: t('marketing.whatsappCampaign.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  const loadCampaign = (campaign: SavedCampaign) => {
    setCampaignName(campaign.name);
    setMainMessage(campaign.main_message);
    setCards(campaign.cards);
    setCurrentCampaignId(campaign.id);
    setShowSavedCampaigns(false);
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!merchant) return;

    try {
      const response = await fetch(
        `/api/whatsapp/campaigns?id=${campaignId}&merchantId=${merchant.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setSavedCampaigns(savedCampaigns.filter(c => c.id !== campaignId));
        if (currentCampaignId === campaignId) {
          setCurrentCampaignId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const toggleFavorite = async (campaignId: string, currentValue: boolean) => {
    if (!merchant) return;

    try {
      await fetch('/api/whatsapp/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaignId,
          merchantId: merchant.id,
          isFavorite: !currentValue,
        }),
      });

      setSavedCampaigns(savedCampaigns.map(c =>
        c.id === campaignId ? { ...c, is_favorite: !currentValue } : c
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const startNewCampaign = () => {
    setCampaignName('');
    setMainMessage('');
    setCards([{
      id: generateId(),
      mediaUrl: '',
      mediaType: 'image',
      text: '',
      buttonType: 'url',
      buttonTitle: '',
      buttonUrl: '',
    }]);
    setCurrentCampaignId(null);
    setShowSavedCampaigns(false);
  };

  const addCard = () => {
    if (cards.length >= 10) return;
    setCards([
      ...cards,
      {
        id: generateId(),
        mediaUrl: '',
        mediaType: 'image',
        text: '',
        buttonType: 'url',
        buttonTitle: '',
        buttonUrl: '',
      },
    ]);
  };

  const removeCard = (id: string) => {
    if (cards.length <= 1) return;
    setCards(cards.filter((card) => card.id !== id));
  };

  const updateCard = (id: string, updates: Partial<CarouselCard>) => {
    setCards(cards.map((card) => (card.id === id ? { ...card, ...updates } : card)));
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newCards = [...cards];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cards.length) return;
    [newCards[index], newCards[newIndex]] = [newCards[newIndex], newCards[index]];
    setCards(newCards);
  };

  const handleFileUpload = async (cardId: string, file: File) => {
    if (!merchant) return;

    setUploadingCard(cardId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${merchant.id}/campaigns/${cardId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('merchant-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('merchant-assets')
        .getPublicUrl(fileName);

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      updateCard(cardId, { mediaUrl: publicUrl, mediaType });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingCard(null);
    }
  };

  const isCardValid = (card: CarouselCard) => {
    return card.mediaUrl && card.text && card.buttonTitle && (card.buttonType !== 'url' || card.buttonUrl);
  };

  const isCampaignValid = () => {
    return mainMessage && cards.every(isCardValid);
  };

  // Wizard step indicators (carousel)
  const step1Done = !!campaignName.trim() && !!mainMessage.trim();
  const step2Done = cards.every(isCardValid);
  const step3Done = step1Done && step2Done;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </DashboardLayout>
    );
  }

  // Gate: require 100 loyalty clients (exempt emails bypass)
  const isExempt = merchant?.email
    ? EXEMPT_EMAILS.map(e => e.toLowerCase()).includes(merchant.email.toLowerCase())
    : false;
  const isLocked = gateChecked && !isExempt && loyaltyClientCount < 100;

  if (isLocked) {
    return (
      <DashboardLayout merchant={merchant}>
        {showOnboarding && <CampaignOnboarding variant="campaign" onClose={() => setShowOnboarding(false)} />}
        <CampaignLock
          currentClients={loyaltyClientCount}
          required={100}
          onOpenGuide={() => setShowOnboarding(true)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      {showOnboarding && <CampaignOnboarding variant="campaign" onClose={() => setShowOnboarding(false)} />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('marketing.whatsappCampaign.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('marketing.whatsappCampaign.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-violet-700 font-medium transition-colors self-start"
          >
            <HelpCircle className="w-4 h-4" />
            Guide
          </button>
        </div>

        {/* ═══ Credit Balance Banner ═══ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
              <Send className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Crédits campagne disponibles</p>
              <p className="text-3xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{credits.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {creditPacks.map((pack: any) => (
              <button
                key={pack.id}
                onClick={() => buyPack(pack.id)}
                disabled={buyingPack === pack.id}
                className="px-4 py-2 rounded-xl border border-pink-200 bg-white text-sm font-medium text-violet-700 hover:bg-pink-50 hover:border-pink-300 transition-all disabled:opacity-50"
              >
                {buyingPack === pack.id ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                ) : null}
                {pack.credits} crédits — {pack.price.toLocaleString()} F
              </button>
            ))}
          </div>
        </div>

        {/* ═══ Mode Toggle ═══ */}
        {/* Mode toggle masqué — Carousel désactivé */}

        {/* ═══════════════════════════════════════════════════════════════════
            TEMPLATE MODE
        ═══════════════════════════════════════════════════════════════════ */}
        {mode === 'template' && (
          <div className="space-y-6">
            {/* Template Info Banner */}
            <div className="group relative p-4 border border-pink-200 rounded-xl overflow-hidden bg-gradient-to-r from-pink-50 to-violet-50">
              <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7]" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-900">Campagne Template (Meta Cloud API)</p>
                  <p className="text-xs text-violet-700">
                    Envoyez des messages via des templates approuves par Meta. Fiable et conforme.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Template Selector — Left Column (3/5) */}
              <div className="lg:col-span-3 space-y-5">
                {/* Step 1: Choisir un template */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">Etape 1 : Choisir un template</h2>
                        <p className="text-xs text-gray-500">Seuls les templates approuves par Meta sont affiches</p>
                      </div>
                    </div>
                    {merchant && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTemplates(merchant.id)}
                        disabled={templatesLoading}
                        className="gap-1.5 text-xs h-8"
                      >
                        {templatesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                        Rafraichir
                      </Button>
                    )}
                  </div>

                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium text-gray-900">Aucun template approuve</p>
                      <p className="text-xs mt-1">Creez et faites approuver vos templates dans la section Templates.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-1.5"
                        onClick={() => router.push('/dashboard/marketing/whatsapp-campaign/templates')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Gerer les templates
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                            selectedTemplate?.id === tpl.id
                              ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                              : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{tpl.name}</h3>
                            {selectedTemplate?.id === tpl.id && (
                              <div className="w-5 h-5 rounded-full bg-pink-600 text-white flex items-center justify-center shrink-0 ml-2">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                              Approuve
                            </span>
                            <span className="text-[10px] text-gray-400">{tpl.language}</span>
                            <span className="text-[10px] text-gray-400">{tpl.category}</span>
                          </div>
                          {/* Show body preview */}
                          {tpl.components.find(c => c.type === 'BODY')?.text && (
                            <p className="text-xs text-gray-500 line-clamp-2">
                              {tpl.components.find(c => c.type === 'BODY')!.text}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Variables */}
                {selectedTemplate && (
                  <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                    <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <Type className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">Etape 2 : Personnaliser les variables</h2>
                        <p className="text-xs text-gray-500">Remplissez les variables dynamiques du template</p>
                      </div>
                    </div>

                    {/* Show each component */}
                    <div className="space-y-4">
                      {selectedTemplate.components.map((comp, ci) => {
                        const vars = comp.text ? [...comp.text.matchAll(/\{\{(\d+)\}\}/g)] : [];
                        if (vars.length === 0 && comp.type !== 'BUTTONS') return null;

                        return (
                          <div key={ci}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                comp.type === 'HEADER' ? 'bg-blue-100 text-blue-700' :
                                comp.type === 'BODY' ? 'bg-gray-100 text-gray-700' :
                                comp.type === 'FOOTER' ? 'bg-gray-100 text-gray-500' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {comp.type}
                              </span>
                              {comp.format && (
                                <span className="text-[10px] text-gray-400">{comp.format}</span>
                              )}
                            </div>

                            {/* Show original text */}
                            {comp.text && (
                              <p className="text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded-lg font-mono">
                                {comp.text}
                              </p>
                            )}

                            {/* Variable inputs */}
                            {vars.length > 0 && (
                              <div className="space-y-2">
                                {vars.map((v) => {
                                  const key = `${comp.type}_${v[1]}`;
                                  return (
                                    <div key={key}>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        Variable {`{{${v[1]}}}`}
                                      </label>
                                      <input
                                        type="text"
                                        value={templateVariables[key] || ''}
                                        onChange={(e) => setTemplateVariables({ ...templateVariables, [key]: e.target.value })}
                                        placeholder={`Valeur pour {{${v[1]}}}`}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Buttons display */}
                            {comp.type === 'BUTTONS' && comp.buttons && (
                              <div className="space-y-1.5">
                                {comp.buttons.map((btn, bi) => (
                                  <div key={bi} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      btn.type === 'URL' ? 'bg-blue-100 text-blue-700' :
                                      btn.type === 'PHONE_NUMBER' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-200 text-gray-600'
                                    }`}>
                                      {btn.type}
                                    </span>
                                    <span className="text-gray-700">{btn.text}</span>
                                    {btn.url && <span className="text-gray-400 text-[10px] truncate">{btn.url}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {extractVariables(selectedTemplate.components).length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <Check className="w-6 h-6 mx-auto mb-1 text-green-500" />
                          <p className="text-xs">Ce template n&apos;a pas de variables. Pret a envoyer !</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview & Actions — Right Column (2/5) */}
              <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-4 lg:self-start">
                {/* Template Preview */}
                {selectedTemplate && (
                  <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                    <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <Eye className="w-5 h-5" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">Apercu</h2>
                    </div>
                    <TemplatePreview template={selectedTemplate} variables={templateVariables} />
                  </div>
                )}

                {/* Next Step CTA */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-br from-pink-50 to-violet-50">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-violet-900">Suivant</h3>
                      <p className="text-xs text-violet-700">Choisir les destinataires et envoyer</p>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-pink-600 hover:bg-violet-700 gap-2"
                    disabled={!selectedTemplate}
                    onClick={goToTemplateSend}
                  >
                    <Send className="w-4 h-4" />
                    Suivant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CAROUSEL MODE (existing)
        ═══════════════════════════════════════════════════════════════════ */}
        {/* Carousel masqué */}
        {false && mode === 'carousel' && (
          <div className="space-y-6">
            {/* Carousel Info Banner */}
            <div className="group relative p-4 border border-amber-200 rounded-xl overflow-hidden bg-gradient-to-r from-amber-50 to-yellow-50">
              <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 to-yellow-400" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Campagne Carousel (Whapi - Legacy)</p>
                  <p className="text-xs text-amber-700">
                    Envoyez des carousels interactifs via l&apos;API Whapi. Mode legacy.
                  </p>
                </div>
              </div>
            </div>

            {/* Carousel Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSavedCampaigns(!showSavedCampaigns)}
                className="gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {t('marketing.whatsappCampaign.myCampaigns')} ({savedCampaigns.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startNewCampaign}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('marketing.whatsappCampaign.newCampaign')}
              </Button>
              <Button
                onClick={saveCampaign}
                disabled={!campaignName.trim() || isSaving}
                size="sm"
                className="gap-1.5 bg-pink-600 hover:bg-violet-700"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {currentCampaignId ? t('marketing.whatsappCampaign.updateCampaign') : t('marketing.whatsappCampaign.saveCampaign')}
              </Button>
            </div>

            {/* Save Message */}
            {saveMessage ? (
              <div className={`p-2.5 rounded-lg flex items-center gap-2 text-sm ${
                (saveMessage as { type: string; text: string }).type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {(saveMessage as { type: string; text: string }).type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{(saveMessage as { type: string; text: string }).text}</span>
              </div>
            ) : null}

            {/* Wizard Steps Indicator */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${step1Done ? 'bg-pink-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step1Done ? 'bg-pink-600 text-white' : 'bg-gray-300 text-white'}`}>
                  {step1Done ? <Check className="w-3 h-3" /> : '1'}
                </div>
                {t('marketing.whatsappCampaign.campaignDetails')}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${step2Done ? 'bg-pink-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step2Done ? 'bg-pink-600 text-white' : 'bg-gray-300 text-white'}`}>
                  {step2Done ? <Check className="w-3 h-3" /> : '2'}
                </div>
                {t('marketing.whatsappCampaign.carouselCards')}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${step3Done ? 'bg-pink-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step3Done ? 'bg-pink-600 text-white' : 'bg-gray-300 text-white'}`}>
                  {step3Done ? <Check className="w-3 h-3" /> : '3'}
                </div>
                {t('marketing.whatsappCampaign.selectRecipients')}
              </div>
            </div>

            {/* Saved Campaigns Panel - Collapsible */}
            {showSavedCampaigns && (
              <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">{t('marketing.whatsappCampaign.savedCampaigns')}</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowSavedCampaigns(false)} className="h-8 w-8 p-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {savedCampaigns.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">{t('marketing.whatsappCampaign.noCampaigns')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {savedCampaigns
                        .sort((a, b) => {
                          if (a.is_favorite && !b.is_favorite) return -1;
                          if (!a.is_favorite && b.is_favorite) return 1;
                          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                        })
                        .map((campaign) => (
                        <div
                          key={campaign.id}
                          className={`border rounded-lg p-3 hover:border-pink-400 transition-colors cursor-pointer ${
                            currentCampaignId === campaign.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                          }`}
                          onClick={() => loadCampaign(campaign)}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{campaign.name}</h3>
                            <div className="flex items-center gap-0.5 shrink-0 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(campaign.id, campaign.is_favorite);
                                }}
                                className={`p-1 rounded hover:bg-gray-100 ${campaign.is_favorite ? 'text-amber-500' : 'text-gray-300'}`}
                              >
                                <Star className={`w-3.5 h-3.5 ${campaign.is_favorite ? 'fill-amber-500' : ''}`} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(t('marketing.whatsappCampaign.confirmDelete'))) {
                                    deleteCampaign(campaign.id);
                                  }
                                }}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{campaign.main_message}</p>
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {campaign.cards.length} {t('marketing.whatsappCampaign.cards')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(campaign.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                          {campaign.send_count > 0 && (
                            <div className="mt-1.5 text-[10px] text-pink-600 flex items-center gap-1">
                              <Send className="w-3 h-3" />
                              {t('marketing.whatsappCampaign.sentTimes', { count: campaign.send_count })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Campaign Builder - Left Column (3/5) */}
              <div className="lg:col-span-3 space-y-5">
                {/* Step 1: Campaign Details */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900">{t('marketing.whatsappCampaign.campaignDetails')}</h2>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        {t('marketing.whatsappCampaign.campaignName')}
                      </label>
                      <input
                        type="text"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder={t('marketing.whatsappCampaign.campaignNamePlaceholder')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        {t('marketing.whatsappCampaign.mainMessage')}
                      </label>
                      <textarea
                        value={mainMessage}
                        onChange={(e) => setMainMessage(e.target.value)}
                        placeholder={t('marketing.whatsappCampaign.mainMessagePlaceholder')}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Carousel Cards */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        {t('marketing.whatsappCampaign.carouselCards')} ({cards.length}/10)
                      </h2>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCard}
                      disabled={cards.length >= 10}
                      className="gap-1 text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('marketing.whatsappCampaign.addCard')}
                    </Button>
                  </div>

                  {/* Horizontal scrollable card list */}
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {cards.map((card, index) => (
                      <div
                        key={card.id}
                        className="flex-shrink-0 w-72 border border-gray-200 rounded-lg p-3 bg-gray-50/50"
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-700">
                            {t('marketing.whatsappCampaign.card')} {index + 1}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => moveCard(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveCard(index, 'down')}
                              disabled={index === cards.length - 1}
                              className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeCard(card.id)}
                              disabled={cards.length <= 1}
                              className="p-1 rounded hover:bg-red-100 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Media Upload */}
                        <div className="mb-3">
                          {card.mediaUrl ? (
                            <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-200">
                              {card.mediaType === 'video' ? (
                                <video src={card.mediaUrl} className="w-full h-full object-cover" controls />
                              ) : (
                                <img src={card.mediaUrl} alt={`Card ${index + 1}`} className="w-full h-full object-cover" />
                              )}
                              <button
                                onClick={() => updateCard(card.id, { mediaUrl: '', mediaType: 'image' })}
                                className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileInputRefs.current[card.id]?.click()}
                              className="w-full h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-pink-50/50 transition-colors"
                            >
                              {uploadingCard === card.id ? (
                                <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
                              ) : (
                                <>
                                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                  <span className="text-[10px] text-gray-500">{t('marketing.whatsappCampaign.uploadMedia')}</span>
                                </>
                              )}
                            </div>
                          )}
                          <input
                            ref={(el) => { fileInputRefs.current[card.id] = el; }}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,video/mp4"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(card.id, file);
                            }}
                            className="hidden"
                          />
                        </div>

                        {/* Card Text */}
                        <textarea
                          value={card.text}
                          onChange={(e) => updateCard(card.id, { text: e.target.value })}
                          placeholder={t('marketing.whatsappCampaign.cardTextPlaceholder')}
                          rows={2}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none text-xs mb-3"
                        />

                        {/* Button Type Toggle */}
                        <div className="flex gap-1 mb-2">
                          <button
                            onClick={() => updateCard(card.id, { buttonType: 'url' })}
                            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                              card.buttonType === 'url'
                                ? 'bg-pink-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <LinkIcon className="w-3 h-3" />
                            {t('marketing.whatsappCampaign.urlButton')}
                          </button>
                          <button
                            onClick={() => updateCard(card.id, { buttonType: 'quick_reply' })}
                            className={`flex-1 py-1.5 px-2 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                              card.buttonType === 'quick_reply'
                                ? 'bg-pink-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            {t('marketing.whatsappCampaign.quickReply')}
                          </button>
                        </div>

                        {/* Button Title */}
                        <input
                          type="text"
                          value={card.buttonTitle}
                          onChange={(e) => updateCard(card.id, { buttonTitle: e.target.value })}
                          placeholder={t('marketing.whatsappCampaign.buttonTitlePlaceholder')}
                          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs mb-2"
                        />

                        {/* Button URL (only for URL type) */}
                        {card.buttonType === 'url' && (
                          <input
                            type="url"
                            value={card.buttonUrl}
                            onChange={(e) => updateCard(card.id, { buttonUrl: e.target.value })}
                            placeholder="https://example.com"
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview & Actions - Right Column (2/5) */}
              <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-4 lg:self-start">
                {/* WhatsApp Preview */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                        <Eye className="w-5 h-5" />
                      </div>
                      <h2 className="text-sm font-semibold text-gray-900">{t('marketing.whatsappCampaign.preview')}</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="h-7 w-7 p-0"
                    >
                      {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {showPreview && (
                    <div className="bg-[#E5DDD5] rounded-xl p-3 max-h-[400px] overflow-y-auto">
                      {/* Main Message */}
                      {mainMessage && (
                        <div className="bg-white rounded-lg p-2.5 shadow-sm mb-2 max-w-[90%]">
                          <p className="text-xs text-gray-800">{mainMessage}</p>
                        </div>
                      )}

                      {/* Carousel Preview */}
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {cards.map((card, index) => (
                          <div
                            key={card.id}
                            className="flex-shrink-0 w-44 bg-white rounded-lg shadow-sm overflow-hidden"
                          >
                            <div className="h-24 bg-gray-200">
                              {card.mediaUrl ? (
                                card.mediaType === 'video' ? (
                                  <video src={card.mediaUrl} className="w-full h-full object-cover" />
                                ) : (
                                  <img src={card.mediaUrl} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-[10px] text-gray-700 line-clamp-2 mb-1.5">
                                {card.text || t('marketing.whatsappCampaign.cardTextPlaceholder')}
                              </p>
                              <button className="w-full py-1 bg-gray-100 rounded text-[10px] font-medium text-pink-600 flex items-center justify-center gap-1">
                                {card.buttonType === 'url' ? <LinkIcon className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                                {card.buttonTitle || t('marketing.whatsappCampaign.buttonTitlePlaceholder')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Step CTA */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-br from-pink-50 to-violet-50">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-violet-900">{t('marketing.whatsappCampaign.nextStep')}</h3>
                      <p className="text-xs text-violet-700">{t('marketing.whatsappCampaign.nextStepDescription')}</p>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-pink-600 hover:bg-violet-700 gap-2"
                    disabled={!isCampaignValid()}
                    onClick={() => {
                      localStorage.setItem('whatsapp_campaign_draft', JSON.stringify({
                        campaignName,
                        mainMessage,
                        cards,
                      }));
                      router.push('/dashboard/marketing/whatsapp-campaign/send');
                    }}
                  >
                    <Users className="w-4 h-4" />
                    {t('marketing.whatsappCampaign.selectRecipients')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

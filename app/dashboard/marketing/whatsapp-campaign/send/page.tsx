'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CampaignOnboarding } from '@/components/dashboard/CampaignOnboarding';
import { CampaignLock } from '@/components/dashboard/CampaignLock';
import { EXEMPT_EMAILS } from '@/lib/config/admin';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  Users,
  Search,
  Phone,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  MessageCircle,
  Calendar,
  Star,
  Check,
  FlaskConical,
  Plus,
  X,
  LayoutTemplate,
  Wallet,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatsAppCustomer {
  user_token?: string;
  phone: string;
  name?: string;
  source: 'feedback' | 'loyalty' | 'both';
  total_reviews: number;
  avg_rating: number;
  last_review: string;
  is_positive: boolean;
}

interface SendResult {
  phone: string;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SendCampaignPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-3 border-pink-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SendCampaignPage />
    </Suspense>
  );
}

function SendCampaignPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect mode from URL params
  const urlMode = searchParams.get('mode');
  const templateId = searchParams.get('templateId');
  const templateName = searchParams.get('templateName');
  const templateLanguage = searchParams.get('templateLanguage');
  const variablesJson = searchParams.get('variables');
  const isTemplateMode = urlMode === 'template' && !!templateId;

  const templateVariables = variablesJson ? JSON.parse(variablesJson) : {};

  const [merchant, setMerchant] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loyaltyClientCount, setLoyaltyClientCount] = useState<number>(0);
  const [gateChecked, setGateChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<WhatsAppCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<WhatsAppCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Campaign data from localStorage (carousel mode)
  const [campaignData, setCampaignData] = useState<any>(null);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [campaignResultId, setCampaignResultId] = useState<string | null>(null);

  // Test send state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testNumbers, setTestNumbers] = useState<string[]>(['']);
  const [isTestSending, setIsTestSending] = useState(false);
  const [testResults, setTestResults] = useState<SendResult[]>([]);

  // Credits
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Fetch credit balance
      try {
        const creditRes = await fetch(`/api/whatsapp/campaign/send?merchantId=${user.id}`);
        if (creditRes.ok) {
          const creditData = await creditRes.json();
          setCredits(creditData.credits || 0);
        }
      } catch { /* default 0 */ }

      // Fetch merchant
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();
      setMerchant(merchantData);

      // Loyalty client count gate
      const { count } = await supabase
        .from('loyalty_clients')
        .select('id', { count: 'exact', head: true })
        .eq('merchant_id', user.id);
      setLoyaltyClientCount(count || 0);
      setGateChecked(true);

      // Auto-show onboarding if never dismissed
      const dismissed = localStorage.getItem('qualee_send_onboarding_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowOnboarding(true), 600);
      }

      if (isTemplateMode) {
        // ─── Template mode: fetch from BOTH feedback + loyalty_clients ───
        await fetchAllRecipients(user.id);
      } else {
        // ─── Carousel mode: fetch from feedback only (existing) ────────
        await fetchFeedbackCustomers(user.id);
      }

      // Load carousel campaign data from localStorage (if not template mode)
      if (!isTemplateMode) {
        const savedCampaign = localStorage.getItem('whatsapp_campaign_draft');
        if (savedCampaign) {
          setCampaignData(JSON.parse(savedCampaign));
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [router, isTemplateMode]);

  // ─── Fetch from feedback only (carousel legacy) ─────────────────────
  const fetchFeedbackCustomers = async (userId: string) => {
    const { data: feedbackData } = await supabase
      .from('feedback')
      .select('*')
      .eq('merchant_id', userId)
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false });

    const customersMap = new Map<string, WhatsAppCustomer>();
    feedbackData?.forEach((feedback) => {
      if (!feedback.customer_phone) return;

      const existing = customersMap.get(feedback.customer_phone);
      if (!existing) {
        customersMap.set(feedback.customer_phone, {
          user_token: feedback.user_token,
          phone: feedback.customer_phone,
          source: 'feedback',
          total_reviews: 1,
          avg_rating: feedback.rating,
          last_review: feedback.created_at,
          is_positive: feedback.is_positive,
        });
      } else {
        existing.total_reviews += 1;
        existing.avg_rating = (existing.avg_rating * (existing.total_reviews - 1) + feedback.rating) / existing.total_reviews;
        if (new Date(feedback.created_at) > new Date(existing.last_review)) {
          existing.last_review = feedback.created_at;
        }
      }
    });

    const customersList = Array.from(customersMap.values());
    setCustomers(customersList);
    setFilteredCustomers(customersList);
  };

  // ─── Fetch from feedback + loyalty_clients (template mode) ──────────
  const fetchAllRecipients = async (userId: string) => {
    const customersMap = new Map<string, WhatsAppCustomer>();

    // 1. Feedback customers
    const { data: feedbackData } = await supabase
      .from('feedback')
      .select('*')
      .eq('merchant_id', userId)
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false });

    feedbackData?.forEach((feedback) => {
      if (!feedback.customer_phone) return;
      const phone = feedback.customer_phone;

      const existing = customersMap.get(phone);
      if (!existing) {
        customersMap.set(phone, {
          user_token: feedback.user_token,
          phone,
          name: feedback.customer_name || undefined,
          source: 'feedback',
          total_reviews: 1,
          avg_rating: feedback.rating,
          last_review: feedback.created_at,
          is_positive: feedback.is_positive,
        });
      } else {
        existing.total_reviews += 1;
        existing.avg_rating = (existing.avg_rating * (existing.total_reviews - 1) + feedback.rating) / existing.total_reviews;
        if (new Date(feedback.created_at) > new Date(existing.last_review)) {
          existing.last_review = feedback.created_at;
        }
      }
    });

    // 2. Loyalty clients
    const { data: loyaltyData } = await supabase
      .from('loyalty_clients')
      .select('*')
      .eq('merchant_id', userId)
      .not('phone', 'is', null);

    loyaltyData?.forEach((client) => {
      if (!client.phone) return;
      const phone = client.phone;

      const existing = customersMap.get(phone);
      if (!existing) {
        customersMap.set(phone, {
          phone,
          name: client.name || client.first_name || undefined,
          source: 'loyalty',
          total_reviews: 0,
          avg_rating: 0,
          last_review: client.created_at || new Date().toISOString(),
          is_positive: true,
        });
      } else {
        // Already exists from feedback — mark as both
        existing.source = 'both';
        if (!existing.name && (client.name || client.first_name)) {
          existing.name = client.name || client.first_name;
        }
      }
    });

    const customersList = Array.from(customersMap.values());
    setCustomers(customersList);
    setFilteredCustomers(customersList);
  };

  // Filter customers based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(c =>
          c.phone.includes(query) ||
          (c.name && c.name.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, customers]);

  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.phone)));
    }
  };

  const toggleCustomer = (phone: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(phone)) {
      newSelected.delete(phone);
    } else {
      newSelected.add(phone);
    }
    setSelectedCustomers(newSelected);
  };

  const selectPositiveOnly = () => {
    setSelectedCustomers(new Set(
      filteredCustomers.filter(c => c.avg_rating >= 4).map(c => c.phone)
    ));
  };

  // ─── Template campaign send ─────────────────────────────────────────
  const sendTemplateCampaign = async () => {
    if (!templateId || selectedCustomers.size === 0 || !merchant) return;

    setIsSending(true);
    setSendProgress(0);
    setSendResults([]);
    setShowResults(false);

    const recipients = Array.from(selectedCustomers).map(phone => {
      const customer = customers.find(c => c.phone === phone);
      return { phone, name: customer?.name || '' };
    });

    try {
      // Build template components from variables
      const components: any[] = [];
      const bodyParams = Object.entries(templateVariables)
        .filter(([key]) => key.startsWith('BODY_'))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, val]) => ({ type: 'text', text: val || '' }));

      if (bodyParams.length > 0) {
        components.push({ type: 'body', parameters: bodyParams });
      }

      const headerParams = Object.entries(templateVariables)
        .filter(([key]) => key.startsWith('HEADER_'))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, val]) => ({ type: 'text', text: val || '' }));

      if (headerParams.length > 0) {
        components.push({ type: 'header', parameters: headerParams });
      }

      const response = await fetch('/api/whatsapp/campaign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.id,
          templateId,
          recipients,
          variables: { components },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const results: SendResult[] = [];
        // Mark results based on API response
        for (const r of recipients) {
          // We don't have per-recipient info from the batch API, so approximate
          results.push({ phone: r.phone, success: true });
        }
        // Adjust for failures
        for (let i = 0; i < (data.failed || 0); i++) {
          if (results[results.length - 1 - i]) {
            results[results.length - 1 - i].success = false;
            results[results.length - 1 - i].error = 'Echec envoi';
          }
        }

        setSendResults(results);
        setSendProgress(100);
        setCampaignResultId(data.campaignId);
      } else {
        setSendResults(recipients.map(r => ({ phone: r.phone, success: false, error: data.error || 'Erreur serveur' })));
        setSendProgress(100);
      }
    } catch (error: any) {
      setSendResults([{ phone: 'all', success: false, error: error.message }]);
      setSendProgress(100);
    }

    setIsSending(false);
    setShowResults(true);
  };

  // ─── Carousel campaign send (existing) ──────────────────────────────
  const sendCarouselCampaign = async () => {
    if (!campaignData || selectedCustomers.size === 0) return;

    setIsSending(true);
    setSendProgress(0);
    setSendResults([]);
    setShowResults(false);

    const results: SendResult[] = [];
    const selectedArray = Array.from(selectedCustomers);
    const total = selectedArray.length;

    for (let i = 0; i < selectedArray.length; i++) {
      const phone = selectedArray[i];

      try {
        const carouselPayload = {
          body: { text: campaignData.mainMessage },
          cards: campaignData.cards.map((card: any, index: number) => ({
            media: { media: card.mediaUrl },
            text: card.text,
            id: `Card-ID${index + 1}`,
            buttons: [
              card.buttonType === 'url'
                ? { type: 'url', title: card.buttonTitle, id: `Button-ID${index + 1}`, url: card.buttonUrl }
                : { type: 'quick_reply', title: card.buttonTitle, id: `Button-ID${index + 1}` },
            ],
          })),
        };

        const response = await fetch('/api/whatsapp/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, carouselPayload }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          results.push({ phone, success: true });
        } else {
          results.push({ phone, success: false, error: data.error || 'Failed to send' });
        }
      } catch (error: any) {
        results.push({ phone, success: false, error: error.message || 'Network error' });
      }

      setSendProgress(Math.round(((i + 1) / total) * 100));
      setSendResults([...results]);

      if (i < selectedArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsSending(false);
    setShowResults(true);
  };

  const sendCampaign = isTemplateMode ? sendTemplateCampaign : sendCarouselCampaign;

  const successCount = sendResults.filter(r => r.success).length;
  const failureCount = sendResults.filter(r => !r.success).length;

  // Cost estimate
  const creditsNeeded = selectedCustomers.size;
  const hasEnoughCredits = credits >= creditsNeeded;

  // Test send functions
  const addTestNumber = () => {
    if (testNumbers.length < 2) {
      setTestNumbers([...testNumbers, '']);
    }
  };

  const removeTestNumber = (index: number) => {
    setTestNumbers(testNumbers.filter((_, i) => i !== index));
  };

  const updateTestNumber = (index: number, value: string) => {
    const newNumbers = [...testNumbers];
    newNumbers[index] = value;
    setTestNumbers(newNumbers);
  };

  const sendTestCampaign = async () => {
    const validNumbers = testNumbers.filter(n => n.trim().length > 0);
    if (validNumbers.length === 0) return;

    setIsTestSending(true);
    setTestResults([]);

    if (isTemplateMode) {
      // Test template send
      try {
        const components: any[] = [];
        const bodyParams = Object.entries(templateVariables)
          .filter(([key]) => key.startsWith('BODY_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, val]) => ({ type: 'text', text: val || '' }));
        if (bodyParams.length > 0) components.push({ type: 'body', parameters: bodyParams });

        const headerParams = Object.entries(templateVariables)
          .filter(([key]) => key.startsWith('HEADER_'))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, val]) => ({ type: 'text', text: val || '' }));
        if (headerParams.length > 0) components.push({ type: 'header', parameters: headerParams });

        const response = await fetch('/api/whatsapp/campaign/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: merchant?.id,
            templateId,
            recipients: validNumbers.map(p => ({ phone: p, name: 'Test' })),
            variables: { components },
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setTestResults(validNumbers.map(p => ({ phone: p, success: true })));
        } else {
          setTestResults(validNumbers.map(p => ({ phone: p, success: false, error: data.error })));
        }
      } catch (error: any) {
        setTestResults(validNumbers.map(p => ({ phone: p, success: false, error: error.message })));
      }
    } else {
      // Test carousel send (existing logic)
      const results: SendResult[] = [];
      for (const phone of validNumbers) {
        try {
          const carouselPayload = {
            body: { text: campaignData?.mainMessage },
            cards: campaignData?.cards.map((card: any, index: number) => ({
              media: { media: card.mediaUrl },
              text: card.text,
              id: `Card-ID${index + 1}`,
              buttons: [
                card.buttonType === 'url'
                  ? { type: 'url', title: card.buttonTitle, id: `Button-ID${index + 1}`, url: card.buttonUrl }
                  : { type: 'quick_reply', title: card.buttonTitle, id: `Button-ID${index + 1}` },
              ],
            })),
          };

          const response = await fetch('/api/whatsapp/carousel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone, carouselPayload }),
          });

          const data = await response.json();
          if (response.ok && data.success) {
            results.push({ phone, success: true });
          } else {
            results.push({ phone, success: false, error: data.error || 'Failed to send' });
          }
        } catch (error: any) {
          results.push({ phone, success: false, error: error.message || 'Network error' });
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setTestResults(results);
    }

    setIsTestSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">{t('dashboard.common.loading')}</p>
        </div>
      </div>
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
        {showOnboarding && <CampaignOnboarding variant="send" onClose={() => setShowOnboarding(false)} />}
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
      {showOnboarding && <CampaignOnboarding variant="send" onClose={() => setShowOnboarding(false)} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/marketing/whatsapp-campaign')}
            className="gap-1.5 h-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('dashboard.common.back')}
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {isTemplateMode ? 'Envoyer la campagne template' : t('marketing.whatsappCampaign.selectRecipients')}
            </h1>
            <p className="text-sm text-gray-500">
              {isTemplateMode
                ? 'Selectionnez les destinataires et envoyez votre campagne Meta Cloud API'
                : t('marketing.whatsappCampaign.selectRecipientsDesc')}
            </p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-violet-700 font-medium transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Guide
          </button>
        </div>

        {/* Campaign Summary Banner */}
        {isTemplateMode ? (
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-r from-pink-50 to-violet-50">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-900">{templateName}</p>
                  <p className="text-xs text-violet-700">Template {templateLanguage} - Meta Cloud API</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTestModal(true);
                  setTestResults([]);
                }}
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 h-8"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Test
              </Button>
            </div>
          </div>
        ) : campaignData ? (
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-r from-green-50 to-violet-50">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900">{campaignData.campaignName || t('marketing.whatsappCampaign.untitledCampaign')}</p>
                  <p className="text-xs text-green-700">{campaignData.cards?.length || 0} {t('marketing.whatsappCampaign.cards')}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTestModal(true);
                  setTestResults([]);
                }}
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 h-8"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                {t('marketing.whatsappCampaign.testSend')}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Test Send Modal */}
        {showTestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-xl">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FlaskConical className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {isTemplateMode ? 'Test template' : t('marketing.whatsappCampaign.testSend')}
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowTestModal(false)} className="h-7 w-7 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  {isTemplateMode
                    ? 'Envoyez un test du template a 1-2 numeros avant la campagne.'
                    : t('marketing.whatsappCampaign.testSendDesc')}
                </p>

                {/* Test Numbers */}
                <div className="space-y-2 mb-4">
                  {testNumbers.map((number, index) => (
                    <div key={index} className="flex gap-2">
                      <PhoneInputWithCountry
                        value={number}
                        onChange={(value) => updateTestNumber(index, value)}
                        placeholder={t('marketing.whatsappCampaign.testNumberPlaceholder')}
                        className="flex-1"
                      />
                      {testNumbers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestNumber(index)}
                          className="h-10 w-10 p-0 text-red-500 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {testNumbers.length < 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTestNumber}
                      className="w-full gap-1.5 border-dashed text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('marketing.whatsappCampaign.addTestNumber')}
                    </Button>
                  )}
                </div>

                {/* Test Results */}
                {testResults.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {testResults.map((result, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                          result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {result.success ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span className="font-medium">{result.phone}</span>
                        {result.error && <span className="text-[10px]">- {result.error}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowTestModal(false)}
                    className="flex-1"
                    size="sm"
                  >
                    {t('dashboard.common.close')}
                  </Button>
                  <Button
                    onClick={sendTestCampaign}
                    disabled={isTestSending || testNumbers.every(n => !n.trim())}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                    size="sm"
                  >
                    {isTestSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        {isTemplateMode ? 'Envoyer test' : t('marketing.whatsappCampaign.sendTest')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className={`grid gap-3 ${isTemplateMode ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{customers.length}</p>
                <p className="text-xs text-gray-500">{t('marketing.whatsappCampaign.totalContacts')}</p>
              </div>
            </div>
          </div>

          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{selectedCustomers.size}</p>
                <p className="text-xs text-gray-500">{t('marketing.whatsappCampaign.selected')}</p>
              </div>
            </div>
          </div>

          {isTemplateMode && (
            <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
              <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xl font-bold ${hasEnoughCredits ? 'text-gray-900' : 'text-red-600'}`}>{creditsNeeded} / {credits}</p>
                  <p className="text-xs text-gray-500">Crédits nécessaires / disponibles</p>
                </div>
              </div>
            </div>
          )}

          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {customers.filter(c => c.avg_rating >= 4).length}
                </p>
                <p className="text-xs text-gray-500">{t('marketing.whatsappCampaign.positiveCustomers')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Estimate Card (template mode) */}
        {isTemplateMode && selectedCustomers.size > 0 && (
          <div className="group relative p-4 border border-violet-200 rounded-xl overflow-hidden bg-gradient-to-r from-violet-50 to-pink-50">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 to-pink-500" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-900">Estimation du cout</p>
                  <p className="text-xs text-violet-700">
                    {selectedCustomers.size} destinataire{selectedCustomers.size > 1 ? 's' : ''} = <span className="font-bold">{creditsNeeded} crédit{creditsNeeded > 1 ? 's' : ''}</span>
                    {!hasEnoughCredits && (
                      <span className="block text-red-500 mt-1">Crédits insuffisants ({credits} disponible{credits > 1 ? 's' : ''}). <a href="/dashboard/marketing/whatsapp-campaign" className="underline font-semibold">Acheter un forfait</a></span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Progress */}
        {isSending && (
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7]" />
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-4 h-4 text-pink-600 animate-spin" />
              <p className="text-sm font-medium text-gray-900">Envoi en cours...</p>
              <span className="text-xs text-gray-500 ml-auto">{sendProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#EB1E99] to-[#7209B7] h-2 rounded-full transition-all duration-300"
                style={{ width: `${sendProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div className="group relative p-5 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7]" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Resultats de l&apos;envoi</h3>
              <div className="flex gap-2">
                {isTemplateMode && campaignResultId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/marketing/whatsapp-campaign/${campaignResultId}`)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Eye className="w-3 h-3" />
                    Voir le rapport
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowResults(false)} className="h-7 text-xs">
                  {t('dashboard.common.close')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-xl font-bold text-green-900">{successCount}</p>
                  <p className="text-xs text-green-700">Envoyes avec succes</p>
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="text-xl font-bold text-red-900">{failureCount}</p>
                  <p className="text-xs text-red-700">Echoues</p>
                </div>
              </div>
            </div>
            {isTemplateMode && (
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="text-xs text-gray-600">
                  Crédits utilisés : <span className="font-bold text-gray-900">{successCount}</span> — Solde restant : <span className="font-bold text-pink-600">{Math.max(0, credits - successCount)}</span>
                </p>
              </div>
            )}
            {failureCount > 0 && (
              <div className="border border-red-200 rounded-lg p-2.5 bg-red-50 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-red-800 mb-1.5">Numeros echoues :</p>
                {sendResults.filter(r => !r.success).map((result, i) => (
                  <p key={i} className="text-[10px] text-red-700">
                    {result.phone}: {result.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customer Table Card */}
        <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

          {/* Card Header with Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={isTemplateMode ? 'Rechercher par telephone ou nom...' : t('marketing.whatsappCampaign.searchByPhone')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-1.5 text-xs h-9">
                  <Check className="w-3.5 h-3.5" />
                  {selectedCustomers.size === filteredCustomers.length
                    ? t('marketing.whatsappCampaign.deselectAll')
                    : t('marketing.whatsappCampaign.selectAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={selectPositiveOnly} className="gap-1.5 text-xs h-9">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  {t('marketing.whatsappCampaign.selectPositive')}
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('marketing.whatsappCampaign.phoneNumber')}</th>
                  {isTemplateMode && (
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                  )}
                  {isTemplateMode && (
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                  )}
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('marketing.whatsappCampaign.rating')}</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('marketing.whatsappCampaign.reviews')}</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t('marketing.whatsappCampaign.lastVisit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer.phone}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedCustomers.has(customer.phone) ? 'bg-pink-50/50' : ''
                      }`}
                      onClick={() => toggleCustomer(customer.phone)}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.phone)}
                          onChange={() => toggleCustomer(customer.phone)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-sm font-medium text-gray-900">{customer.phone}</span>
                        </div>
                      </td>
                      {isTemplateMode && (
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-700">{customer.name || '-'}</span>
                        </td>
                      )}
                      {isTemplateMode && (
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              customer.source === 'both' ? 'bg-purple-100 text-purple-700' :
                              customer.source === 'loyalty' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {customer.source === 'both' ? 'Avis + Fidelite' :
                             customer.source === 'loyalty' ? 'Fidelite' : 'Avis'}
                          </Badge>
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{customer.avg_rating > 0 ? customer.avg_rating.toFixed(1) : '-'}</span>
                          {customer.avg_rating > 0 && (
                            <Star className={`w-3.5 h-3.5 ${customer.avg_rating >= 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-[10px]">{customer.total_reviews}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(customer.last_review).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isTemplateMode ? 7 : 5} className="px-4 py-10 text-center text-gray-500">
                      <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">{t('marketing.whatsappCampaign.noContacts')}</p>
                      <p className="text-xs">{t('marketing.whatsappCampaign.noContactsDesc')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Action Bar */}
        {selectedCustomers.size > 0 && !isSending && (
          <div className="sticky bottom-4 z-10">
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedCustomers.size} selectionne{selectedCustomers.size > 1 ? 's' : ''}</p>
                  <p className="text-[10px] text-gray-500">
                    {isTemplateMode
                      ? `${creditsNeeded} crédit${creditsNeeded > 1 ? 's' : ''} (solde: ${credits})`
                      : (t('marketing.whatsappCampaign.readyToSend') || 'Pret a envoyer')}
                  </p>
                </div>
              </div>
              <Button
                onClick={sendCampaign}
                disabled={isTemplateMode ? !templateId : !campaignData}
                className="bg-pink-600 hover:bg-violet-700 gap-1.5"
              >
                <Send className="w-4 h-4" />
                Envoyer ({selectedCustomers.size})
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

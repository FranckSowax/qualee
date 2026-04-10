'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Calendar, MapPin, Star, Music, Instagram as InstagramIcon, Globe, MessageCircle, Palette, Link2, Route, Lightbulb, ChevronDown } from 'lucide-react';

const PLATFORMS = [
  { value: 'google_maps', label: 'Google Reviews', icon: MapPin, color: 'bg-red-500' },
  { value: 'tripadvisor', label: 'TripAdvisor', icon: Star, color: 'bg-green-500' },
  { value: 'tiktok', label: 'TikTok', icon: Music, color: 'bg-black' },
  { value: 'instagram', label: 'Instagram', icon: InstagramIcon, color: 'bg-pink-500' },
];

type TabId = 'workflow' | 'routing';

export default function StrategyPage() {
  const router = useRouter();
  const { i18n } = useTranslation(undefined, { useSuspense: false });
  const isFr = i18n.language === 'fr';

  const DAYS = isFr
    ? ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAYS_SHORT = isFr
    ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'workflow', icon: <Globe className="w-4 h-4" />, label: 'Workflow' },
    { id: 'routing', icon: <Route className="w-4 h-4" />, label: isFr ? 'Routage' : 'Routing' },
  ];

  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('workflow');
  const [showGoogleTip, setShowGoogleTip] = useState(false);

  // Workflow mode: 'web' or 'whatsapp'
  const [workflowMode, setWorkflowMode] = useState<'web' | 'whatsapp'>('web');

  // Logo background color
  const [logoBackgroundColor, setLogoBackgroundColor] = useState('#FFFFFF');

  // Redirect URLs
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [tripadvisorUrl, setTripadvisorUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

  // Weekly schedule: array of 7 days, each with a platform
  const [weeklySchedule, setWeeklySchedule] = useState<string[]>(
    Array(7).fill('google_maps')
  );

  // Current day index (0 = Monday, 6 = Sunday) - computed client-side to avoid hydration mismatch
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);

  // Set current day index on client-side only
  useEffect(() => {
    const jsDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert to 0 = Monday, 6 = Sunday
    setCurrentDayIndex(dayIndex);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();

      setMerchant(merchantData);

      // Load workflow mode
      setWorkflowMode(merchantData?.workflow_mode || 'web');

      // Load logo background color
      setLogoBackgroundColor(merchantData?.logo_background_color || '#FFFFFF');

      // Load redirect URLs
      setGoogleMapsUrl(merchantData?.google_maps_url || '');
      setTripadvisorUrl(merchantData?.tripadvisor_url || '');
      setTiktokUrl(merchantData?.tiktok_url || '');
      setInstagramUrl(merchantData?.instagram_url || '');

      // Load weekly schedule
      if (merchantData?.weekly_schedule) {
        try {
          const schedule = JSON.parse(merchantData.weekly_schedule);
          if (Array.isArray(schedule) && schedule.length === 7) {
            setWeeklySchedule(schedule);
          }
        } catch {
          // Invalid schedule format, use defaults
        }
      }
    };

    checkAuth();
  }, [router]);

  const handleDayChange = (dayIndex: number, platform: string) => {
    const newSchedule = [...weeklySchedule];
    newSchedule[dayIndex] = platform;
    setWeeklySchedule(newSchedule);
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const updates: any = {
        workflow_mode: workflowMode,
        logo_background_color: logoBackgroundColor || '#FFFFFF',
        google_maps_url: googleMapsUrl || null,
        tripadvisor_url: tripadvisorUrl || null,
        tiktok_url: tiktokUrl || null,
        instagram_url: instagramUrl || null,
        weekly_schedule: JSON.stringify(weeklySchedule),
      };

      const { error } = await supabase
        .from('merchants')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: isFr ? 'Stratégie sauvegardée avec succès !' : 'Strategy saved successfully!' });

      // Refresh merchant data
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();
      setMerchant(merchantData);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || (isFr ? 'Échec de la sauvegarde' : 'Failed to save') });
    } finally {
      setLoading(false);
    }
  };

  const getPlatformInfo = (platformValue: string) => {
    return PLATFORMS.find(p => p.value === platformValue) || PLATFORMS[0];
  };

  const handleReset = () => {
    setWorkflowMode(merchant.workflow_mode || 'web');
    setLogoBackgroundColor(merchant.logo_background_color || '#FFFFFF');
    setGoogleMapsUrl(merchant.google_maps_url || '');
    setTripadvisorUrl(merchant.tripadvisor_url || '');
    setTiktokUrl(merchant.tiktok_url || '');
    setInstagramUrl(merchant.instagram_url || '');
    if (merchant.weekly_schedule) {
      try {
        const schedule = JSON.parse(merchant.weekly_schedule);
        setWeeklySchedule(schedule);
      } catch {
        setWeeklySchedule(Array(7).fill('google_maps'));
      }
    }
  };

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{isFr ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{isFr ? 'Stratégie de Redirection' : 'Redirect Strategy'}</h1>
          <p className="text-gray-500 text-sm">{isFr ? 'Configurez vos liens et planifiez vos redirections' : 'Configure your links and schedule your redirects'}</p>
        </div>

        {/* Success/Error message */}
        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-teal-50 border border-teal-200 text-teal-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-teal-600 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-red-600 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {/* Tabs Navigation */}
        <nav className="flex gap-1 border-b-2 border-gray-100 overflow-x-auto" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-teal-700 hover:bg-teal-50/50'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 transition-transform duration-300 origin-left ${
                  activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="animate-[fadeIn_0.3s_ease-out]" key={activeTab}>

          {/* ===== WORKFLOW TAB ===== */}
          {activeTab === 'workflow' && (
            <div className="space-y-5">
              {/* Workflow Mode */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Mode de Workflow' : 'Workflow Mode'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'Comment vos clients reçoivent le lien vers la roue' : 'How your customers receive the link to the wheel'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Web Mode */}
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('web')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      workflowMode === 'web'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        workflowMode === 'web' ? 'bg-teal-500' : 'bg-gray-200'
                      }`}>
                        <Globe className={`w-5 h-5 ${workflowMode === 'web' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{isFr ? 'Mode Web' : 'Web Mode'}</h4>
                        <p className="text-xs text-gray-500">{isFr ? 'Workflow actuel' : 'Current workflow'}</p>
                      </div>
                      {workflowMode === 'web' && (
                        <Check className="w-5 h-5 text-teal-500 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {isFr
                        ? 'Après l\'avis Google, le client voit un timer de 15 secondes puis clique sur un bouton pour accéder à la roue.'
                        : 'After the Google review, the customer sees a 15-second timer then clicks a button to access the wheel.'}
                    </p>
                  </button>

                  {/* WhatsApp Mode */}
                  <button
                    type="button"
                    onClick={() => setWorkflowMode('whatsapp')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      workflowMode === 'whatsapp'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        workflowMode === 'whatsapp' ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                        <MessageCircle className={`w-5 h-5 ${workflowMode === 'whatsapp' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{isFr ? 'Mode WhatsApp' : 'WhatsApp Mode'}</h4>
                        <p className="text-xs text-gray-500">{isFr ? 'Nouveau' : 'New'}</p>
                      </div>
                      {workflowMode === 'whatsapp' && (
                        <Check className="w-5 h-5 text-green-500 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {isFr
                        ? 'Après l\'avis Google, le client reçoit automatiquement un message WhatsApp avec le lien vers la roue.'
                        : 'After the Google review, the customer automatically receives a WhatsApp message with the link to the wheel.'}
                    </p>
                  </button>
                </div>

                {/* WhatsApp Configuration (shown only when WhatsApp mode is selected) */}
                {workflowMode === 'whatsapp' && (
                  <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      {isFr ? 'Configuration WhatsApp' : 'WhatsApp Configuration'}
                    </h4>

                    <div className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
                      <p className="text-sm text-gray-700 font-medium">{isFr ? 'Messages automatiques' : 'Automatic messages'}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
                          <p className="font-medium text-green-800 text-xs mb-0.5">{isFr ? 'Nouveau client' : 'New customer'}</p>
                          <p className="text-gray-600 text-xs">
                            {isFr
                              ? '"Merci pour votre avis ! Tournez la roue pour gagner un cadeau."'
                              : '"Thank you for your review! Spin the wheel to win a gift."'}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                          <p className="font-medium text-blue-800 text-xs mb-0.5">{isFr ? 'Client fidèle' : 'Loyal customer'}</p>
                          <p className="text-gray-600 text-xs">
                            {isFr
                              ? '"Bon retour ! Tournez la roue pour tenter de gagner un cadeau."'
                              : '"Welcome back! Spin the wheel to try and win a gift."'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {isFr
                          ? 'Les messages sont traduits automatiquement (FR, EN, TH, ES, PT)'
                          : 'Messages are automatically translated (FR, EN, TH, ES, PT)'}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <p className="text-xs text-blue-800">
                        {isFr
                          ? <>Le client entre son numéro WhatsApp au lieu de son email. Après l&apos;avis, il reçoit un message avec 2 boutons : <strong>Tourner la Roue</strong> et <strong>Ma Carte Fidélité</strong>.</>
                          : <>The customer enters their WhatsApp number instead of email. After the review, they receive a message with 2 buttons: <strong>Spin the Wheel</strong> and <strong>My Loyalty Card</strong>.</>}
                      </p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Logo Background Color */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Couleur de Fond du Logo' : 'Logo Background Color'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'Cercle contenant votre logo sur la roue et la page coupon' : 'Circle containing your logo on the wheel and coupon page'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={logoBackgroundColor}
                      onChange={(e) => setLogoBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-teal-500 transition-colors"
                    />
                    <input
                      type="text"
                      value={logoBackgroundColor}
                      onChange={(e) => setLogoBackgroundColor(e.target.value)}
                      placeholder="#FFFFFF"
                      className="w-24 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                    />
                  </div>

                  {/* Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{isFr ? 'Aperçu' : 'Preview'} :</span>
                    <div
                      className="w-12 h-12 rounded-full border-4 border-[#ffd700] flex items-center justify-center shadow-md"
                      style={{ backgroundColor: logoBackgroundColor }}
                    >
                      {merchant?.logo_url ? (
                        <img
                          src={merchant.logo_url}
                          alt="Logo"
                          className="w-8 h-8 object-contain rounded-full"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">Logo</span>
                      )}
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex gap-1.5">
                    {[
                      { label: isFr ? 'Blanc' : 'White', value: '#FFFFFF' },
                      { label: isFr ? 'Noir' : 'Black', value: '#000000' },
                      { label: isFr ? 'Or' : 'Gold', value: '#FFD700' },
                      { label: isFr ? 'Nuit' : 'Night', value: '#1a1a2e' },
                    ].map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setLogoBackgroundColor(preset.value)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                          logoBackgroundColor === preset.value
                            ? 'bg-gray-100 border-gray-400'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ===== ROUTING TAB ===== */}
          {activeTab === 'routing' && (
            <div className="space-y-5">
              {/* Weekly Schedule - Compact */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Planification Hebdomadaire' : 'Weekly Schedule'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'Plateforme de redirection par jour de la semaine' : 'Redirect platform per day of the week'}</p>
                  </div>
                </div>

                {/* Compact 7-day grid */}
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, index) => {
                    const selectedPlatform = getPlatformInfo(weeklySchedule[index]);
                    const Icon = selectedPlatform.icon;
                    const isToday = currentDayIndex === index;

                    return (
                      <div key={index} className={`rounded-lg border-2 p-2 text-center transition-colors ${
                        isToday ? 'border-teal-400 bg-teal-50' : 'border-gray-200'
                      }`}>
                        <span className={`text-xs font-semibold block mb-1.5 ${isToday ? 'text-teal-600' : 'text-gray-700'}`}>
                          {DAYS_SHORT[index]}
                        </span>
                        <div className={`w-7 h-7 mx-auto ${selectedPlatform.color} rounded-full flex items-center justify-center mb-1.5`}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <select
                          value={weeklySchedule[index]}
                          onChange={(e) => handleDayChange(index, e.target.value)}
                          className="w-full px-0.5 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-white"
                        >
                          {PLATFORMS.map((platform) => (
                            <option key={platform.value} value={platform.value}>
                              {platform.label.split(' ')[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Today's preview */}
                {currentDayIndex !== null && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className={`w-8 h-8 ${getPlatformInfo(weeklySchedule[currentDayIndex]).color} rounded-full flex items-center justify-center flex-shrink-0`}>
                      {React.createElement(getPlatformInfo(weeklySchedule[currentDayIndex]).icon, {
                        className: "w-4 h-4 text-white"
                      })}
                    </div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{isFr ? `Aujourd'hui (${DAYS[currentDayIndex]})` : `Today (${DAYS[currentDayIndex]})`}</span>{isFr ? ' : redirection vers ' : ' : redirecting to '}
                      <span className="font-bold text-teal-700">
                        {getPlatformInfo(weeklySchedule[currentDayIndex]).label}
                      </span>
                    </p>
                  </div>
                )}
              </Card>

              {/* Redirect URLs */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Liens de Redirection' : 'Redirect Links'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'URLs vers lesquelles rediriger vos clients' : 'URLs to redirect your customers to'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Google Reviews URL */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Google Reviews
                    </label>
                    <input
                      type="url"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://g.page/your-business"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                    />

                    {/* Tips: Comment trouver le lien Google Reviews */}
                    <button
                      type="button"
                      onClick={() => setShowGoogleTip(!showGoogleTip)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 transition-colors"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>{isFr ? 'Comment trouver mon lien Google Reviews ?' : 'How to find my Google Reviews link?'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showGoogleTip ? 'rotate-180' : ''}`} />
                    </button>

                    {showGoogleTip && (
                      <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        <p className="font-semibold text-amber-800 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          {isFr ? 'Guide : Trouver votre lien Google Reviews' : 'Guide: Find your Google Reviews link'}
                        </p>

                        <ol className="list-decimal list-inside space-y-2 text-gray-700">
                          <li>
                            {isFr
                              ? <>Ouvrez <strong>Google Maps</strong> sur votre ordinateur ou téléphone</>
                              : <>Open <strong>Google Maps</strong> on your computer or phone</>}
                          </li>
                          <li>
                            {isFr
                              ? <>Recherchez le <strong>nom de votre établissement</strong></>
                              : <>Search for <strong>your business name</strong></>}
                          </li>
                          <li>
                            {isFr
                              ? <>Cliquez sur votre fiche, puis sur le bouton <strong>&quot;Avis&quot;</strong> (ou <strong>&quot;Reviews&quot;</strong>)</>
                              : <>Click on your listing, then on the <strong>&quot;Reviews&quot;</strong> button</>}
                          </li>
                          <li>
                            {isFr
                              ? <>Cliquez sur <strong>&quot;Donner un avis&quot;</strong> (ou <strong>&quot;Write a review&quot;</strong>)</>
                              : <>Click on <strong>&quot;Write a review&quot;</strong></>}
                          </li>
                          <li>
                            {isFr
                              ? <>Copiez l&apos;<strong>URL complète</strong> de la barre d&apos;adresse de votre navigateur</>
                              : <>Copy the <strong>full URL</strong> from your browser&apos;s address bar</>}
                          </li>
                          <li>
                            {isFr
                              ? <>Collez-la dans le champ ci-dessus</>
                              : <>Paste it in the field above</>}
                          </li>
                        </ol>

                        <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
                          <p className="font-medium text-amber-800 text-xs">
                            {isFr ? 'Méthode rapide (Google Business Profile) :' : 'Quick method (Google Business Profile):'}
                          </p>
                          <ol className="list-decimal list-inside space-y-1.5 text-gray-700 text-xs">
                            <li>
                              {isFr
                                ? <>Allez sur <strong>business.google.com</strong></>
                                : <>Go to <strong>business.google.com</strong></>}
                            </li>
                            <li>
                              {isFr
                                ? <>Cliquez sur <strong>&quot;Demander des avis&quot;</strong> dans le menu de gauche</>
                                : <>Click on <strong>&quot;Ask for reviews&quot;</strong> in the left menu</>}
                            </li>
                            <li>
                              {isFr
                                ? <>Copiez le <strong>lien court</strong> qui s&apos;affiche (format : <code className="bg-amber-100 px-1 rounded">g.page/r/...</code>)</>
                                : <>Copy the <strong>short link</strong> that appears (format: <code className="bg-amber-100 px-1 rounded">g.page/r/...</code>)</>}
                            </li>
                          </ol>
                        </div>

                        <p className="text-xs text-amber-700">
                          {isFr
                            ? 'Le lien doit ressembler à : https://g.page/r/CxxxxxxxxEBE/review ou https://search.google.com/local/writereview?placeid=...'
                            : 'The link should look like: https://g.page/r/CxxxxxxxxEBE/review or https://search.google.com/local/writereview?placeid=...'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* TripAdvisor URL */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <Star className="w-4 h-4 text-green-500" />
                      TripAdvisor
                    </label>
                    <input
                      type="url"
                      value={tripadvisorUrl}
                      onChange={(e) => setTripadvisorUrl(e.target.value)}
                      placeholder="https://www.tripadvisor.com/..."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                    />
                  </div>

                  {/* TikTok URL */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <Music className="w-4 h-4 text-black" />
                      TikTok
                    </label>
                    <input
                      type="url"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://www.tiktok.com/@your-account"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                    />
                  </div>

                  {/* Instagram URL */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <InstagramIcon className="w-4 h-4 text-pink-500" />
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://www.instagram.com/your-account"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Save / Reset Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleReset}>
            {isFr ? 'Réinitialiser' : 'Reset'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isFr ? 'Sauvegarde...' : 'Saving...'}
              </>
            ) : (
              isFr ? 'Sauvegarder' : 'Save'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

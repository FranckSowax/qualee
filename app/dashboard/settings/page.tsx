'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Check, X, Loader2, Globe, Bell, Shield, Link2,
  Settings, ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';

type TabId = 'general' | 'links';

const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'general', icon: <Settings className="w-4 h-4" />, label: 'Général' },
  { id: 'links', icon: <Link2 className="w-4 h-4" />, label: 'Liens' },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // General settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newReviewAlert, setNewReviewAlert] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [timezone, setTimezone] = useState('Europe/Paris');

  // Links settings
  const [googleReviewLink, setGoogleReviewLink] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');

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
      if (merchantData?.timezone) setTimezone(merchantData.timezone);
      if (merchantData?.email_notifications !== undefined) setEmailNotifications(merchantData.email_notifications);
      if (merchantData?.new_review_alert !== undefined) setNewReviewAlert(merchantData.new_review_alert);
      if (merchantData?.weekly_summary !== undefined) setWeeklySummary(merchantData.weekly_summary);

      // Links
      setGoogleReviewLink(merchantData?.google_review_link || '');
      setTiktokUrl(merchantData?.tiktok_url || '');
      setInstagramUrl(merchantData?.instagram_url || '');

    };

    checkAuth();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const updateData: Record<string, any> = {};

      if (activeTab === 'general') {
        updateData.timezone = timezone;
        updateData.email_notifications = emailNotifications;
        updateData.new_review_alert = newReviewAlert;
        updateData.weekly_summary = weeklySummary;
      } else if (activeTab === 'links') {
        updateData.google_review_link = googleReviewLink || null;
        updateData.tiktok_url = tiktokUrl || null;
        updateData.instagram_url = instagramUrl || null;
      }

      const { error } = await supabase
        .from('merchants')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Paramètres enregistrés avec succès !',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erreur lors de la sauvegarde',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{t('dashboard.nav.settings')}</h1>
          <p className="text-gray-500 text-sm">
            Gérez vos préférences et configurations
          </p>
        </div>

        {/* Success/Error message */}
        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-pink-50 border border-pink-200 text-violet-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-pink-600 shrink-0" />
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
                  ? 'text-pink-600'
                  : 'text-gray-500 hover:text-violet-700 hover:bg-pink-50/50'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {/* Active underline */}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#EB1E99] to-[#7209B7] transition-transform duration-300 origin-left ${
                  activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="animate-[fadeIn_0.3s_ease-out]" key={activeTab}>
          {/* ===== GENERAL TAB ===== */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Region */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Région
                    </h3>
                    <p className="text-xs text-gray-500">
                      Fuseau horaire
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fuseau horaire
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
                    >
                      <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                      <option value="Europe/Brussels">Europe/Bruxelles (UTC+1)</option>
                      <option value="Europe/Zurich">Europe/Zurich (UTC+1)</option>
                      <option value="Europe/London">Europe/Londres (UTC+0)</option>
                      <option value="Europe/Berlin">Europe/Berlin (UTC+1)</option>
                      <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
                      <option value="Europe/Rome">Europe/Rome (UTC+1)</option>
                      <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500">
                      Gérez vos alertes
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  <label className="flex items-center justify-between py-4 cursor-pointer rounded-lg hover:bg-gray-50/50 transition-colors duration-200 px-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Notifications par email</p>
                      <p className="text-xs text-gray-500">Recevoir les notifications par email</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
                      <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>

                  <label className="flex items-center justify-between py-4 cursor-pointer rounded-lg hover:bg-gray-50/50 transition-colors duration-200 px-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Alertes nouveaux avis</p>
                      <p className="text-xs text-gray-500">Être notifié quand un client laisse un avis</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={newReviewAlert}
                        onChange={(e) => setNewReviewAlert(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
                      <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>

                  <label className="flex items-center justify-between py-4 cursor-pointer rounded-lg hover:bg-gray-50/50 transition-colors duration-200 px-1">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Résumé hebdomadaire</p>
                      <p className="text-xs text-gray-500">Recevoir un résumé de performance chaque semaine</p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={weeklySummary}
                        onChange={(e) => setWeeklySummary(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
                      <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>
                </div>
              </Card>

              {/* Account */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Compte</h3>
                    <p className="text-xs text-gray-500">Informations de votre compte</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-600 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID du compte</label>
                    <p className="text-xs text-gray-500 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono">
                      {user.id}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ===== LINKS TAB ===== */}
          {activeTab === 'links' && (
            <div className="space-y-5">
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Liens de redirection</h3>
                    <p className="text-xs text-gray-500">Configurez les liens vers vos réseaux sociaux</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google Reviews
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={googleReviewLink}
                        onChange={(e) => setGoogleReviewLink(e.target.value)}
                        placeholder="https://g.page/r/..."
                        className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
                      />
                      {googleReviewLink && (
                        <a href={googleReviewLink} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.94a8.16 8.16 0 004.76 1.52V7.01a4.85 4.85 0 01-1-.32z"/>
                      </svg>
                      TikTok
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={tiktokUrl}
                        onChange={(e) => setTiktokUrl(e.target.value)}
                        placeholder="https://www.tiktok.com/@..."
                        className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
                      />
                      {tiktokUrl && (
                        <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-gradient)" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="5" stroke="url(#ig-gradient)" strokeWidth="2"/>
                        <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-gradient)"/>
                        <defs>
                          <linearGradient id="ig-gradient" x1="2" y1="22" x2="22" y2="2">
                            <stop stopColor="#F58529"/>
                            <stop offset="0.5" stopColor="#DD2A7B"/>
                            <stop offset="1" stopColor="#8134AF"/>
                          </linearGradient>
                        </defs>
                      </svg>
                      Instagram
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="https://www.instagram.com/..."
                        className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
                      />
                      {instagramUrl && (
                        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                </div>
              </Card>
            </div>
          )}

        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-pink-600 hover:bg-violet-700 text-white px-6"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

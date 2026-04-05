'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  Award,
  Users,
  Gift,
  TrendingUp,
  Search,
  Eye,
  Plus,
  CreditCard,
  History,
  Settings,
  ChevronRight,
  Star,
  Loader2,
  AlertCircle,
  Coins,
  Check,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Merchant, LoyaltyClient, LoyaltyStats } from '@/lib/types/database';

export default function LoyaltyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<LoyaltyClient[]>([]);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'clients'>('config');

  // Loyalty settings state
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [pointsPerPurchase, setPointsPerPurchase] = useState(10);
  const [purchaseThreshold, setPurchaseThreshold] = useState(1000);
  const [loyaltyCurrency, setLoyaltyCurrency] = useState<'XAF'>('XAF');
  const [welcomePoints, setWelcomePoints] = useState(50);
  const [loyaltyCardFile, setLoyaltyCardFile] = useState<File | null>(null);
  const [loyaltyCardPreview, setLoyaltyCardPreview] = useState<string>('');
  const [savingLoyalty, setSavingLoyalty] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      setUser(user);

      // Fetch merchant
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!merchantData) {
        router.push('/auth');
        return;
      }

      setMerchant(merchantData);

      // Load loyalty settings
      setLoyaltyEnabled(merchantData?.loyalty_enabled || false);
      setPointsPerPurchase(merchantData?.points_per_purchase || 10);
      setPurchaseThreshold(merchantData?.purchase_amount_threshold || 1000);
      setLoyaltyCurrency('XAF');
      setWelcomePoints(merchantData?.welcome_points || 50);
      if (merchantData?.loyalty_card_image_url) setLoyaltyCardPreview(merchantData.loyalty_card_image_url);

      // Fetch loyalty clients
      const clientsRes = await fetch(`/api/loyalty/client?merchantId=${user.id}`);
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients || []);
      }

      // Calculate stats
      const { data: allClients } = await supabase
        .from('loyalty_clients')
        .select('id, points, status')
        .eq('merchant_id', user.id);

      const { data: transactions } = await supabase
        .from('points_transactions')
        .select('points, type')
        .eq('merchant_id', user.id);

      const { data: redeemed } = await supabase
        .from('redeemed_rewards')
        .select('id, status')
        .eq('merchant_id', user.id);

      const total_clients = allClients?.length || 0;
      const active_clients = allClients?.filter(c => c.status === 'active').length || 0;
      const total_points_issued = transactions
        ?.filter(t => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0) || 0;
      const total_points_redeemed = transactions
        ?.filter(t => t.points < 0)
        .reduce((sum, t) => sum + Math.abs(t.points), 0) || 0;
      const total_rewards_redeemed = redeemed?.filter(r => r.status === 'used').length || 0;
      const average_points_per_client = total_clients > 0 ? Math.round(total_points_issued / total_clients) : 0;

      setStats({
        total_clients,
        active_clients,
        total_points_issued,
        total_points_redeemed,
        total_rewards_redeemed,
        average_points_per_client
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uploadImage = async (file: File) => {
    if (!user) throw new Error('Not authenticated');
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('merchant-assets')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw new Error(uploadError.message || 'Failed to upload image');

    const { data: { publicUrl } } = supabase.storage
      .from('merchant-assets')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleLoyaltyCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoyaltyCardFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLoyaltyCardPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLoyalty = async () => {
    if (!user) return;

    setSavingLoyalty(true);
    setMessage(null);

    try {
      const updates: any = {
        loyalty_enabled: loyaltyEnabled,
        points_per_purchase: pointsPerPurchase,
        purchase_amount_threshold: purchaseThreshold,
        loyalty_currency: loyaltyCurrency,
        welcome_points: welcomePoints
      };

      if (loyaltyCardFile) {
        const cardImageUrl = await uploadImage(loyaltyCardFile);
        updates.loyalty_card_image_url = cardImageUrl;
      }

      const { error } = await supabase
        .from('merchants')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ type: 'success', text: t('loyalty.settings.title') + ' - ' + t('dashboard.common.save') + '!' });
      setLoyaltyCardFile(null);

      // Refresh merchant data
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();
      setMerchant(merchantData);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save loyalty settings' });
    } finally {
      setSavingLoyalty(false);
    }
  };

  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(query) ||
      client.card_id?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200";

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              {t('loyalty.title')}
            </h1>
            <p className="text-gray-500 mt-1 ml-[52px]">{t('loyalty.subtitle')}</p>
          </div>
          {loyaltyEnabled && (
            <Link href="/dashboard/loyalty/rewards">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Gift className="w-4 h-4 mr-2" />
                {t('loyalty.rewards.title')}
              </Button>
            </Link>
          )}
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-teal-50 border border-teal-200' : 'bg-red-50 border border-red-200'}`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-teal-700' : 'text-red-700'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Stats Grid - compact 4-col */}
        {loyaltyEnabled && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('loyalty.overview.totalClients'), value: stats?.total_clients || 0, icon: Users, color: 'teal' },
              { label: t('loyalty.overview.totalPoints'), value: stats?.total_points_issued?.toLocaleString() || 0, icon: Star, color: 'emerald' },
              { label: t('loyalty.overview.totalRewards'), value: stats?.total_rewards_redeemed || 0, icon: Gift, color: 'teal' },
              { label: t('loyalty.overview.activeCards'), value: stats?.active_clients || 0, icon: CreditCard, color: 'emerald' },
            ].map((stat, i) => (
              <div key={i} className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {loyaltyEnabled && (
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === 'config'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              {t('loyalty.settings.title')}
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === 'clients'
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              {t('loyalty.clients.title')}
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {clients.length}
              </span>
            </button>
          </div>
        )}

        {/* Tab: Configuration */}
        {(activeTab === 'config' || !loyaltyEnabled) && (
          <div className="space-y-6">
            {/* Enable Toggle Card */}
            <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
              <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loyaltyEnabled ? 'bg-teal-50 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('loyalty.settings.enabled')}</h3>
                    <p className="text-sm text-gray-500">{t('loyalty.settings.enabledDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${loyaltyEnabled ? 'bg-teal-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${loyaltyEnabled ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {loyaltyEnabled && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Points Configuration */}
                  <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                    <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Coins className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{t('loyalty.settings.pointsPerPurchase')}</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('loyalty.settings.pointsPerPurchase')}</label>
                        <p className="text-xs text-gray-500 mb-2">{t('loyalty.settings.pointsPerPurchaseDesc')}</p>
                        <input
                          type="number"
                          min={1}
                          value={pointsPerPurchase}
                          onChange={(e) => setPointsPerPurchase(parseInt(e.target.value) || 10)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('loyalty.settings.purchaseThreshold')}</label>
                        <p className="text-xs text-gray-500 mb-2">{t('loyalty.settings.purchaseThresholdDesc')}</p>
                        <input
                          type="number"
                          min={1}
                          value={purchaseThreshold}
                          onChange={(e) => setPurchaseThreshold(parseInt(e.target.value) || 1000)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Currency & Welcome Points */}
                  <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                    <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Star className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{t('loyalty.settings.currency')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('loyalty.settings.currency')}</label>
                        <p className="text-xs text-gray-500 mb-2">{t('loyalty.settings.currencyDesc')}</p>
                        <div className={`${inputClass} flex items-center bg-gray-100 text-gray-700`}>
                          FCFA (XAF)
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('loyalty.settings.welcomePoints')}</label>
                        <p className="text-xs text-gray-500 mb-2">{t('loyalty.settings.welcomePointsDesc')}</p>
                        <input
                          type="number"
                          min={0}
                          value={welcomePoints}
                          onChange={(e) => setWelcomePoints(parseInt(e.target.value) || 0)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loyalty Card Image */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('loyalty.settings.cardImage')}</h3>
                        <p className="text-sm text-gray-500">{t('loyalty.settings.cardImageDesc')}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-teal-200 text-teal-700">16:9</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ImageUpload
                      preview={loyaltyCardPreview || null}
                      onFileSelect={(file) => {
                        setLoyaltyCardFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setLoyaltyCardPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                      onDelete={() => {
                        setLoyaltyCardFile(null);
                        setLoyaltyCardPreview('');
                      }}
                      label={t('loyalty.settings.uploadImage')}
                      sublabel="PNG, JPG (16:9) up to 5MB"
                      aspectRatio="16/9"
                    />
                  </div>
                </div>

                {/* Points Preview */}
                <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-br from-teal-50/50 to-emerald-50/50">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <h3 className="font-semibold text-gray-900 mb-4">Exemple de calcul des points</h3>
                  <div className="flex items-center justify-center gap-4 text-center">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-2xl font-bold text-teal-600">{purchaseThreshold.toLocaleString()} FCFA</p>
                      <p className="text-sm text-gray-500">Montant d'achat</p>
                    </div>
                    <div className="text-2xl text-teal-500 font-bold">=</div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <p className="text-2xl font-bold text-teal-600">{pointsPerPurchase}</p>
                      <p className="text-sm text-gray-500">Points gagnés</p>
                    </div>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Exemple : achat de {(purchaseThreshold * 5).toLocaleString()} FCFA = {pointsPerPurchase * 5} points
                  </p>
                </div>
              </>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveLoyalty}
                disabled={savingLoyalty}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {savingLoyalty ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('dashboard.common.save')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Tab: Clients */}
        {activeTab === 'clients' && loyaltyEnabled && (
          <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

            {/* Card Header with Search */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('loyalty.clients.title')}
                  </h2>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    placeholder={t('loyalty.clients.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {filteredClients.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  {t('loyalty.clients.noClients')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('loyalty.clients.noClientsDesc')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t('loyalty.clients.cardId')}
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t('loyalty.clients.points')}
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t('loyalty.clients.lastVisit')}
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t('loyalty.clients.status')}
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-teal-50/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded-md">
                            {client.card_id}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {client.name || t('dashboard.recentReviews.anonymous')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {client.email || client.phone || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-teal-500" />
                            <span className="text-sm font-semibold text-gray-900">{client.points}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-500">
                          {client.last_visit
                            ? new Date(client.last_visit).toLocaleDateString()
                            : '-'
                          }
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            client.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : client.status === 'suspended'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {t(`loyalty.clients.${client.status}`)}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/card/${client.qr_code_data}`} target="_blank">
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-teal-600 h-8 w-8 p-0">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-teal-600 h-8 w-8 p-0">
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        {loyaltyEnabled && activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/loyalty/rewards" className="block">
              <div className="group relative p-5 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-br from-teal-600 to-teal-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <Gift className="w-7 h-7 mb-2 opacity-90" />
                    <h3 className="font-semibold">{t('loyalty.rewards.title')}</h3>
                    <p className="text-teal-100 text-sm mt-0.5">{t('loyalty.rewards.subtitle')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-70" />
                </div>
              </div>
            </Link>
            <Link href="/dashboard/scan" className="block">
              <div className="group relative p-5 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CreditCard className="w-7 h-7 mb-2 opacity-90" />
                    <h3 className="font-semibold">{t('dashboard.nav.scanner')}</h3>
                    <p className="text-emerald-100 text-sm mt-0.5">{t('loyalty.scan.loyaltyCardDetected')}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-70" />
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

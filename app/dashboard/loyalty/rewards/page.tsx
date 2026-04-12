'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  Award,
  Gift,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  Check,
  AlertCircle,
  Star,
  Percent,
  Package,
  Wrench,
  DollarSign,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import type { Merchant, LoyaltyReward } from '@/lib/types/database';

type RewardType = 'discount' | 'product' | 'service' | 'cashback';

interface RewardForm {
  name: string;
  description: string;
  type: RewardType;
  value: string;
  points_cost: number;
  quantity_available: number | null;
  is_active: boolean;
}

const defaultForm: RewardForm = {
  name: '',
  description: '',
  type: 'discount',
  value: '',
  points_cost: 100,
  quantity_available: null,
  is_active: true
};

const typeIcons: Record<RewardType, typeof Percent> = {
  discount: Percent,
  product: Package,
  service: Wrench,
  cashback: DollarSign
};

const typeColors: Record<RewardType, { bg: string; text: string; accent: string }> = {
  discount: { bg: 'bg-pink-50', text: 'text-violet-700', accent: 'text-pink-600' },
  product: { bg: 'bg-violet-50', text: 'text-violet-700', accent: 'text-violet-600' },
  service: { bg: 'bg-pink-50', text: 'text-violet-700', accent: 'text-pink-600' },
  cashback: { bg: 'bg-violet-50', text: 'text-violet-700', accent: 'text-violet-600' }
};

export default function RewardsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [form, setForm] = useState<RewardForm>(defaultForm);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

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

      // Fetch rewards
      const res = await fetch(`/api/loyalty/rewards?merchantId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingReward(null);
    setForm(defaultForm);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (reward: LoyaltyReward) => {
    setEditingReward(reward);
    setForm({
      name: reward.name,
      description: reward.description || '',
      type: reward.type as RewardType,
      value: reward.value,
      points_cost: reward.points_cost,
      quantity_available: reward.quantity_available,
      is_active: reward.is_active
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    setSaving(true);
    setError(null);

    try {
      // Transform snake_case to camelCase for API
      const payload = {
        merchantId: merchant.id,
        name: form.name,
        description: form.description,
        type: form.type,
        value: form.value,
        pointsCost: form.points_cost,
        quantityAvailable: form.quantity_available,
        isActive: form.is_active
      };

      let res: Response;

      if (editingReward) {
        res = await fetch('/api/loyalty/rewards', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rewardId: editingReward.id,
            merchantId: merchant.id,
            updates: form
          })
        });
      } else {
        res = await fetch('/api/loyalty/rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save reward');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm(t('loyalty.rewards.confirmDelete'))) return;
    if (!merchant) return;

    try {
      const res = await fetch('/api/loyalty/rewards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId, merchantId: merchant.id })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting reward:', error);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200";

  if (loading) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              {t('loyalty.title')}
            </h1>
            <p className="text-gray-500 mt-1 ml-[52px]">{t('loyalty.subtitle')}</p>
          </div>
          <Button onClick={openAddModal} className="bg-pink-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            {t('loyalty.rewards.add')}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <Link
            href="/dashboard/loyalty"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
          >
            <Settings className="w-4 h-4" />
            {t('loyalty.settings.title')}
          </Link>
          <Link
            href="/dashboard/loyalty?tab=clients"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
          >
            <Users className="w-4 h-4" />
            {t('loyalty.clients.title')}
          </Link>
          <button
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px text-pink-600 border-pink-600"
          >
            <Gift className="w-4 h-4" />
            {t('loyalty.rewards.title')}
          </button>
        </div>

        {/* Rewards Grid */}
        {rewards.length === 0 ? (
          <div className="group relative p-12 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white text-center">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift className="w-7 h-7 text-pink-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">
              {t('loyalty.rewards.noRewards')}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {t('loyalty.rewards.noRewardsDesc')}
            </p>
            <Button onClick={openAddModal} className="bg-pink-600 hover:bg-violet-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t('loyalty.rewards.add')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const TypeIcon = typeIcons[reward.type as RewardType] || Gift;
              const colors = typeColors[reward.type as RewardType] || typeColors.discount;
              return (
                <div
                  key={reward.id}
                  className={`group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white ${!reward.is_active ? 'opacity-60' : ''}`}
                >
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.accent} flex items-center justify-center`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(reward)}
                          className="text-gray-400 hover:text-pink-600 h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(reward.id)}
                          className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {reward.name}
                    </h3>
                    {reward.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {reward.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-pink-500" />
                        <span className="text-sm font-semibold text-gray-900">{reward.points_cost}</span>
                        <span className="text-xs text-gray-500">{t('loyalty.clients.points')}</span>
                      </div>
                      <div className="text-xs">
                        {reward.quantity_available !== null ? (
                          <span className="text-gray-500">
                            {reward.quantity_available} {t('loyalty.rewards.quantity').toLowerCase()}
                          </span>
                        ) : (
                          <span className="text-violet-600">{t('loyalty.rewards.quantityUnlimited')}</span>
                        )}
                      </div>
                    </div>

                    {!reward.is_active && (
                      <div className="mt-3 px-2 py-1 bg-gray-100 rounded-md text-center">
                        <span className="text-xs text-gray-500">Inactive</span>
                      </div>
                    )}
                  </div>

                  <div className={`px-5 py-2.5 ${colors.bg}`}>
                    <p className={`text-xs font-medium ${colors.text}`}>
                      {t(`loyalty.rewards.type${reward.type.charAt(0).toUpperCase() + reward.type.slice(1)}`)}: {reward.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingReward ? t('loyalty.rewards.edit') : t('loyalty.rewards.add')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('loyalty.rewards.name')} *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('loyalty.rewards.namePlaceholder')}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('loyalty.rewards.description')}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('loyalty.rewards.descriptionPlaceholder')}
                  className={inputClass}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('loyalty.rewards.type')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['discount', 'product', 'service', 'cashback'] as RewardType[]).map((type) => {
                    const Icon = typeIcons[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, type })}
                        className={`p-2.5 rounded-lg border-2 transition-all flex items-center gap-2.5 ${
                          form.type === type
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${form.type === type ? 'text-pink-600' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${form.type === type ? 'text-violet-700' : 'text-gray-600'}`}>
                          {t(`loyalty.rewards.type${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('loyalty.rewards.value')} *
                </label>
                <input
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={t('loyalty.rewards.valuePlaceholder')}
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('loyalty.rewards.pointsCost')} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.points_cost}
                    onChange={(e) => setForm({ ...form, points_cost: parseInt(e.target.value) || 0 })}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('loyalty.rewards.quantity')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity_available ?? ''}
                    onChange={(e) => setForm({ ...form, quantity_available: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder={t('loyalty.rewards.quantityUnlimited')}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-pink-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.is_active ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {t('loyalty.rewards.isActive')}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  {t('dashboard.common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-pink-600 hover:bg-violet-700 text-white"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {t('dashboard.common.save')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

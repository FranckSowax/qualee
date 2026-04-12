'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Check, X, Loader2, Cake, Clock, Trophy, Ticket, Zap,
} from 'lucide-react';

export default function AutomationsSettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Automation toggles
  const [autoBirthday, setAutoBirthday] = useState(false);
  const [autoInactivity, setAutoInactivity] = useState(false);
  const [inactivityDays, setInactivityDays] = useState(30);
  const [autoMilestone, setAutoMilestone] = useState(false);
  const [milestonesInput, setMilestonesInput] = useState('50,100,200,500');
  const [autoCouponExpiry, setAutoCouponExpiry] = useState(false);

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

      if (merchantData) {
        setAutoBirthday(merchantData.auto_birthday_enabled ?? false);
        setAutoInactivity(merchantData.auto_inactivity_enabled ?? false);
        setInactivityDays(merchantData.inactivity_threshold_days ?? 30);
        setAutoMilestone(merchantData.auto_milestone_enabled ?? false);
        setAutoCouponExpiry(merchantData.auto_coupon_expiry_enabled ?? false);

        // Parse milestones from JSON array
        if (merchantData.points_milestones && Array.isArray(merchantData.points_milestones)) {
          setMilestonesInput(merchantData.points_milestones.join(','));
        }
      }
    };

    checkAuth();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Parse milestones
      const milestones = milestonesInput
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0)
        .sort((a, b) => a - b);

      if (autoMilestone && milestones.length === 0) {
        setMessage({ type: 'error', text: 'Veuillez entrer au moins un palier de points valide.' });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('merchants')
        .update({
          auto_birthday_enabled: autoBirthday,
          auto_inactivity_enabled: autoInactivity,
          inactivity_threshold_days: inactivityDays,
          auto_milestone_enabled: autoMilestone,
          points_milestones: milestones,
          auto_coupon_expiry_enabled: autoCouponExpiry,
        })
        .eq('id', user.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Automatisations enregistrees avec succes !',
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
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Automatisations</h1>
          </div>
          <p className="text-gray-500 text-sm ml-[52px]">
            Configurez les messages WhatsApp automatiques envoyes a vos clients.
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

        {/* Birthday */}
        <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Messages d&apos;anniversaire</h3>
                <p className="text-xs text-gray-500">
                  Envoyez automatiquement un message WhatsApp a vos clients le jour de leur anniversaire.
                </p>
              </div>
            </div>
            <label className="relative cursor-pointer">
              <input
                type="checkbox"
                checked={autoBirthday}
                onChange={(e) => setAutoBirthday(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
              <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </label>
          </div>
        </Card>

        {/* Inactivity */}
        <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Rappels d&apos;inactivite</h3>
                <p className="text-xs text-gray-500">
                  Rappelez a vos clients inactifs de revenir avec leurs points de fidelite.
                </p>
              </div>
            </div>
            <label className="relative cursor-pointer">
              <input
                type="checkbox"
                checked={autoInactivity}
                onChange={(e) => setAutoInactivity(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
              <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </label>
          </div>
          {autoInactivity && (
            <div className="mt-4 pl-[52px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil d&apos;inactivite (jours)
              </label>
              <input
                type="number"
                min={7}
                max={365}
                value={inactivityDays}
                onChange={(e) => setInactivityDays(parseInt(e.target.value, 10) || 30)}
                className="w-32 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
              />
              <p className="text-xs text-gray-400 mt-1">
                Un rappel sera envoye apres {inactivityDays} jours sans visite.
              </p>
            </div>
          )}
        </Card>

        {/* Points Milestone */}
        <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Paliers de points</h3>
                <p className="text-xs text-gray-500">
                  Felicitez vos clients quand ils atteignent un palier de points.
                </p>
              </div>
            </div>
            <label className="relative cursor-pointer">
              <input
                type="checkbox"
                checked={autoMilestone}
                onChange={(e) => setAutoMilestone(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
              <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </label>
          </div>
          {autoMilestone && (
            <div className="mt-4 pl-[52px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paliers (separes par des virgules)
              </label>
              <input
                type="text"
                value={milestonesInput}
                onChange={(e) => setMilestonesInput(e.target.value)}
                placeholder="50,100,200,500"
                className="w-full max-w-sm px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
              />
              <p className="text-xs text-gray-400 mt-1">
                Exemple : 50,100,200,500 - Un message sera envoye a chaque palier atteint.
              </p>
            </div>
          )}
        </Card>

        {/* Coupon Expiry */}
        <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Expiration des coupons</h3>
                <p className="text-xs text-gray-500">
                  Prevenez vos clients avant l&apos;expiration de leurs coupons de la roue.
                </p>
              </div>
            </div>
            <label className="relative cursor-pointer">
              <input
                type="checkbox"
                checked={autoCouponExpiry}
                onChange={(e) => setAutoCouponExpiry(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 transition-colors" />
              <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
            </label>
          </div>
        </Card>

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

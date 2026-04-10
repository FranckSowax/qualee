'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Star, CreditCard, Shield, Clock, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { PLANS } from '@/lib/payments/plans';

export default function BillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [generatingToken, setGeneratingToken] = useState(false);

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

      // Fetch payment history
      const { data: paymentData } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (paymentData) setPayments(paymentData);
    };

    checkAuth();
  }, [router]);

  const handleRenew = async () => {
    if (!merchant) return;
    setGeneratingToken(true);

    try {
      const res = await fetch('/api/payments/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose: 'renewal_payment' }),
      });
      const data = await res.json();

      if (data.token) {
        router.push(`/subscribe/${data.token}`);
      }
    } catch (err) {
      console.error('Error generating token:', err);
    } finally {
      setGeneratingToken(false);
    }
  };

  if (!user || !merchant) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Chargement...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentPlan = PLANS[merchant.subscription_tier] || PLANS['starter'];
  const hasSubscription = !!merchant.subscription_expires_at;
  const isExpired = hasSubscription && new Date(merchant.subscription_expires_at) < new Date();
  const isActive = hasSubscription && !isExpired;
  const daysLeft = hasSubscription
    ? Math.ceil((new Date(merchant.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            Facturation & Abonnement
          </h1>
          <p className="text-gray-500 mt-1 ml-[52px]">Gérez votre abonnement et vos informations de paiement</p>
        </div>

        {/* Current Plan */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 transition-all duration-300 hover:border-gray-300 hover:shadow-md">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500" />
          <div className="bg-gradient-to-br from-teal-50/80 to-emerald-50/80 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-teal-600 hover:bg-teal-700 text-white">Plan actuel</Badge>
                  {isActive && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Actif
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Expiré
                    </Badge>
                  )}
                  {!hasSubscription && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      <Clock className="w-3 h-3 mr-1" /> Essai gratuit
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 capitalize">
                  {currentPlan?.name || merchant.subscription_tier || 'Starter'}
                </h2>
                {currentPlan && (
                  <p className="text-gray-500 mt-1 text-sm">
                    {currentPlan.price_xaf.toLocaleString('fr-FR')} XAF/mois
                  </p>
                )}
              </div>

              {/* Expiry info */}
              {hasSubscription && (
                <div className="text-right">
                  {isActive && daysLeft !== null && (
                    <p className="text-sm text-gray-500">
                      Expire dans <span className="font-semibold text-gray-900">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</span>
                    </p>
                  )}
                  {isExpired && (
                    <p className="text-sm text-red-600 font-medium">
                      Expiré le {new Date(merchant.subscription_expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {merchant.subscription_started_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Depuis le {new Date(merchant.subscription_started_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: 'Avis mensuels', value: 'Illimité', icon: Star },
                { label: 'QR Codes', value: String(currentPlan?.max_locations === -1 ? 'Illimité' : currentPlan?.max_locations || 1), icon: CreditCard },
                { label: 'Support', value: merchant.subscription_tier === 'multi-shop' ? 'Dédié' : merchant.subscription_tier === 'pro' ? 'Prioritaire' : 'Email', icon: Shield },
              ].map((item, i) => (
                <div key={i} className="bg-white/70 rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="w-4 h-4 text-teal-600" />
                    <p className="text-xs text-gray-500">{item.label}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Renew / Subscribe CTA */}
        <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isExpired ? 'Renouveler votre abonnement' : !hasSubscription ? 'Passer à un abonnement payant' : 'Changer de plan'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              {isExpired
                ? 'Votre abonnement a expiré. Renouvelez pour continuer à utiliser toutes les fonctionnalités.'
                : !hasSubscription
                  ? 'Choisissez le plan adapté à votre activité. Paiement sécurisé par Mobile Money ou carte bancaire via E-Billing.'
                  : 'Upgradez votre plan pour débloquer plus de fonctionnalités et d\'établissements.'}
            </p>
            <button
              onClick={handleRenew}
              disabled={generatingToken}
              className="inline-flex items-center gap-2 bg-teal-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingToken ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  {isExpired ? 'Renouveler maintenant' : !hasSubscription ? 'Choisir un plan' : 'Changer de plan'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des paiements</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Plan</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Montant</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Type</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50">
                        <td className="py-3 text-gray-700">
                          {new Date(p.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 text-gray-700 capitalize">{p.tier}</td>
                        <td className="py-3 text-gray-900 font-medium">
                          {p.amount_xaf?.toLocaleString('fr-FR')} XAF
                        </td>
                        <td className="py-3">
                          <Badge className={p.payment_type === 'renewal' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {p.payment_type === 'renewal' ? 'Renouvellement' : 'Nouveau'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge className={
                            p.status === 'completed' ? 'bg-green-100 text-green-700' :
                            p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {p.status === 'completed' ? 'Payé' :
                             p.status === 'pending' ? 'En attente' :
                             p.status === 'processing' ? 'En cours' :
                             'Échoué'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

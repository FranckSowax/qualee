'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CreditCard, Loader2, Crown, Zap, Building2, Check } from 'lucide-react';
import { PLANS } from '@/lib/payments/plans';

interface SubscriptionOverlayProps {
  merchant: {
    id: string;
    business_name?: string | null;
    subscription_tier?: string;
    subscription_expires_at?: string | null;
  };
}

const PLAN_COLORS: Record<string, { accent: string; badge: string }> = {
  starter: { accent: 'text-teal-600', badge: 'bg-teal-600' },
  pro: { accent: 'text-indigo-600', badge: 'bg-indigo-600' },
  'multi-shop': { accent: 'text-amber-600', badge: 'bg-amber-600' },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
  'multi-shop': <Building2 className="w-5 h-5" />,
};

export function SubscriptionOverlay({ merchant }: SubscriptionOverlayProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(merchant.subscription_tier || 'starter');

  const expiryDate = merchant.subscription_expires_at
    ? new Date(merchant.subscription_expires_at).toLocaleDateString('fr-FR')
    : null;

  const handleRenew = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop — bloque toute interaction */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header rouge */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Abonnement expiré</h2>
              <p className="text-red-100 text-sm">
                {expiryDate
                  ? `Votre abonnement a expiré le ${expiryDate}`
                  : 'Votre période d\'essai gratuit est terminée'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-6">
            Pour continuer à utiliser Qualee et accéder à votre dashboard, veuillez renouveler votre abonnement.
            Choisissez le plan qui vous convient :
          </p>

          {/* Plan cards mini */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {Object.values(PLANS).map((plan) => {
              const colors = PLAN_COLORS[plan.key];
              const isSelected = selectedTier === plan.key;

              return (
                <button
                  key={plan.key}
                  onClick={() => setSelectedTier(plan.key)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? `border-current ${colors.accent} bg-gray-50 shadow-sm`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className={`absolute -top-2 -right-2 w-5 h-5 ${colors.badge} rounded-full flex items-center justify-center`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-lg ${isSelected ? colors.accent : 'text-gray-400'} bg-gray-100 flex items-center justify-center mb-2`}>
                    {PLAN_ICONS[plan.key]}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-bold text-gray-900">{plan.price_xaf.toLocaleString('fr-FR')}</span> XAF/mois
                  </p>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={handleRenew}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirection vers le paiement...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Renouveler maintenant
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Paiement sécurisé par E-Billing (Mobile Money & Carte bancaire)
          </p>
        </div>
      </div>
    </div>
  );
}

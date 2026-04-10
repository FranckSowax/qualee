'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PLANS } from '@/lib/payments/plans';
import type { SubscriptionPlan } from '@/lib/payments/plans';
import { Check, Loader2, AlertCircle, Crown, Zap, Building2 } from 'lucide-react';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  'multi-shop': <Building2 className="w-6 h-6" />,
};

const PLAN_COLORS: Record<string, { bg: string; border: string; accent: string; badge: string }> = {
  starter: { bg: 'from-teal-50 to-emerald-50', border: 'border-teal-200', accent: 'text-teal-600', badge: 'bg-teal-600' },
  pro: { bg: 'from-indigo-50 to-purple-50', border: 'border-indigo-200', accent: 'text-indigo-600', badge: 'bg-indigo-600' },
  'multi-shop': { bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', accent: 'text-amber-600', badge: 'bg-amber-600' },
};

type PageState = 'loading' | 'select' | 'processing' | 'error';

export default function SubscribePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [currentTier, setCurrentTier] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/payments/validate-token?token=${token}`);
        const data = await res.json();

        if (!data.valid) {
          setError(data.error || 'Ce lien de paiement est invalide ou a expiré.');
          setState('error');
          return;
        }

        setBusinessName(data.business_name || '');
        setCurrentTier(data.current_tier || 'starter');
        setPurpose(data.purpose || '');
        setState('select');
      } catch {
        setError('Erreur de connexion. Veuillez réessayer.');
        setState('error');
      }
    }

    validateToken();
  }, [token]);

  const handlePayment = async (tier: string) => {
    setSelectedTier(tier);
    setProcessing(true);

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, tier }),
      });

      const data = await res.json();

      if (!data.success || !data.portal_url) {
        setError(data.error || 'Erreur lors de l\'initiation du paiement');
        setProcessing(false);
        return;
      }

      // Save reference for confirmation page
      localStorage.setItem('cartelle_payment', JSON.stringify({
        external_reference: data.external_reference,
        token,
        tier,
        payment_id: data.payment_id,
      }));

      // Redirect to E-Billing portal
      window.location.href = data.portal_url;
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
      setProcessing(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const isRenewal = purpose === 'renewal_payment';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isRenewal ? 'Renouveler votre abonnement' : 'Choisir votre abonnement'}
          </h1>
          {businessName && (
            <p className="text-gray-500 mt-1">{businessName}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            {isRenewal
              ? 'Votre abonnement arrive à échéance. Renouvelez pour continuer.'
              : 'Votre essai gratuit est terminé. Choisissez le plan qui vous convient.'}
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(PLANS).map((plan: SubscriptionPlan) => {
            const colors = PLAN_COLORS[plan.key];
            const isCurrentPlan = plan.key === currentTier && isRenewal;
            const isSelected = selectedTier === plan.key;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                  isSelected ? `${colors.border} shadow-lg scale-[1.02]` : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {isCurrentPlan && (
                  <div className={`${colors.badge} text-white text-xs font-medium text-center py-1`}>
                    Plan actuel
                  </div>
                )}

                <div className={`bg-gradient-to-br ${colors.bg} p-6`}>
                  <div className={`w-10 h-10 rounded-lg ${colors.accent} bg-white/80 flex items-center justify-center mb-3`}>
                    {PLAN_ICONS[plan.key]}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price_xaf.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">XAF/mois</span>
                  </div>
                </div>

                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className={`w-4 h-4 ${colors.accent} mt-0.5 flex-shrink-0`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePayment(plan.key)}
                    disabled={processing}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                      processing && isSelected
                        ? 'bg-gray-400 cursor-wait'
                        : `${colors.badge} hover:opacity-90 active:scale-[0.98]`
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processing && isSelected ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Redirection...
                      </span>
                    ) : (
                      `Payer ${plan.price_xaf.toLocaleString('fr-FR')} XAF`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Paiement sécurisé par E-Billing (Mobile Money & Carte bancaire)</p>
          <p className="mt-1">En cas de problème, contactez-nous sur contact@cartelle.app</p>
        </div>
      </div>
    </div>
  );
}

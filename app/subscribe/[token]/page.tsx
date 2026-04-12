'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PLANS } from '@/lib/payments/plans';
import type { SubscriptionPlan } from '@/lib/payments/plans';
import { Check, Loader2, AlertCircle, Shield } from 'lucide-react';

type PageState = 'loading' | 'select' | 'error';

export default function SubscribePage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>('loading');
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [processingTier, setProcessingTier] = useState('');

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
    if (tier === 'sur-mesure') {
      window.location.href = '/contact';
      return;
    }

    setProcessingTier(tier);
    setError('');

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, tier }),
      });

      const data = await res.json();

      if (!data.success || !data.portal_url) {
        setError(data.error || 'Erreur lors de l\'initiation du paiement. Réessayez.');
        setProcessingTier('');
        return;
      }

      localStorage.setItem('qualee_payment', JSON.stringify({
        external_reference: data.external_reference,
        token,
        tier,
        payment_id: data.payment_id,
      }));

      window.location.href = data.portal_url;
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
      setProcessingTier('');
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (state === 'error' && !Object.keys(PLANS).length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const isRenewal = purpose === 'renewal_payment';

  // Payable plans only (exclude sur-mesure from main grid for now, show it separately)
  const payablePlans = Object.values(PLANS).filter(p => p.key !== 'sur-mesure');
  const surMesure = PLANS['sur-mesure'];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold mb-4">
            Tarifs
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
            {isRenewal ? 'Renouvelez votre abonnement' : 'Des tarifs simples et transparents'}
          </h1>
          {businessName && (
            <p className="text-gray-500 mt-2">{businessName}</p>
          )}
          <p className="text-gray-400 mt-2 text-sm">
            Commencez gratuitement. Pas de frais cachés. Sans engagement.
          </p>

          {/* All plans include */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6">
            {['Essai gratuit 14 jours', 'Sans engagement', 'Mise en place en 24h', 'Données hébergées en sécurité'].map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm text-gray-500">
                <Check className="w-4 h-4 text-teal-500" />{f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 mt-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payablePlans.map((plan: SubscriptionPlan) => {
            const isProcessing = processingTier === plan.key;

            return (
              <div
                key={plan.key}
                className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? 'bg-[#0A1A14] border-teal-500/30 shadow-2xl shadow-teal-900/20 text-white ring-2 ring-teal-500/20'
                    : 'bg-white border-gray-200 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-100/50'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold shadow-lg">
                    Le plus populaire
                  </span>
                )}

                <h3 className={`text-lg font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-sm ${plan.popular ? 'text-white/50' : 'text-gray-500'}`}>
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className={`text-3xl font-extrabold ${plan.popular ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                    {plan.price_xaf.toLocaleString('fr-FR')}
                  </span>
                  <span className={`ml-1 text-sm ${plan.popular ? 'text-white/40' : 'text-gray-400'}`}>
                    {plan.period}
                  </span>
                </div>

                <ul className="mt-7 space-y-3 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-emerald-400' : 'text-teal-500'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-white/70' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePayment(plan.key)}
                  disabled={!!processingTier}
                  className={`mt-8 block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.popular
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/30'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirection...
                    </span>
                  ) : (
                    `Payer ${plan.price_xaf.toLocaleString('fr-FR')} FCFA`
                  )}
                </button>
              </div>
            );
          })}

          {/* Sur mesure card */}
          {surMesure && (
            <div className="relative flex flex-col p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-teal-600 to-emerald-600 border-transparent text-white shadow-xl shadow-teal-500/20">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                {surMesure.name}
              </h3>
              <p className="mt-1 text-sm text-white/70">{surMesure.description}</p>

              <div className="mt-6">
                <span className="text-3xl font-extrabold text-white" style={{ fontFamily: 'Sora, system-ui, sans-serif' }}>
                  Devis
                </span>
              </div>

              <ul className="mt-7 space-y-3 flex-1">
                {surMesure.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-white/80" />
                    <span className="text-sm text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePayment('sur-mesure')}
                className="mt-8 block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all bg-white text-teal-700 hover:bg-white/90"
              >
                Nous contacter
              </button>
            </div>
          )}
        </div>

        {/* Guarantee */}
        <div className="mt-10 text-center">
          <p className="inline-flex items-center gap-2 text-sm text-gray-400">
            <Shield className="w-4 h-4 text-teal-500" />
            14 jours satisfait ou remboursé — Annulez en un clic
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Paiement sécurisé par E-Billing (Mobile Money & Carte bancaire)</p>
          <p className="mt-1">En cas de problème, contactez-nous sur contact@qualee.fr</p>
        </div>
      </div>
    </div>
  );
}

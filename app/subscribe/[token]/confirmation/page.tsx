'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

type Status = 'polling' | 'completed' | 'failed' | 'timeout' | 'error';

const MAX_ATTEMPTS = 60;
const POLL_INTERVAL = 3000;

export default function ConfirmationPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<Status>('polling');
  const [attempt, setAttempt] = useState(0);
  const [paymentInfo, setPaymentInfo] = useState<{ external_reference: string; tier: string } | null>(null);

  const checkStatus = useCallback(async (ref: string, currentAttempt: number) => {
    if (currentAttempt >= MAX_ATTEMPTS) {
      setStatus('timeout');
      return;
    }

    try {
      const res = await fetch(
        `/api/payments/status?external_reference=${encodeURIComponent(ref)}&token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (data.status === 'completed') {
        setStatus('completed');
        return;
      }

      if (['failed', 'cancelled', 'expired'].includes(data.status)) {
        setStatus('failed');
        return;
      }

      // Continue polling
      setAttempt(currentAttempt + 1);
      setTimeout(() => checkStatus(ref, currentAttempt + 1), POLL_INTERVAL);
    } catch {
      // Network error — retry
      setAttempt(currentAttempt + 1);
      setTimeout(() => checkStatus(ref, currentAttempt + 1), POLL_INTERVAL);
    }
  }, [token]);

  useEffect(() => {
    const stored = localStorage.getItem('cartelle_payment');
    if (!stored) {
      setStatus('error');
      return;
    }

    try {
      const data = JSON.parse(stored);
      if (!data.external_reference || !data.token) {
        setStatus('error');
        return;
      }
      setPaymentInfo(data);

      // Start polling after 1s delay
      setTimeout(() => checkStatus(data.external_reference, 0), 1000);
    } catch {
      setStatus('error');
    }
  }, [checkStatus]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        {status === 'polling' && (
          <>
            <Loader2 className="w-16 h-16 text-teal-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Vérification du paiement</h1>
            <p className="text-gray-500 text-sm mb-4">
              Nous vérifions votre paiement auprès de E-Billing...
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>Tentative {attempt + 1}/{MAX_ATTEMPTS}</span>
            </div>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((attempt / MAX_ATTEMPTS) * 100, 100)}%` }}
              />
            </div>
          </>
        )}

        {status === 'completed' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement confirmé !</h1>
            <p className="text-gray-500 text-sm mb-6">
              Votre abonnement Cartelle{paymentInfo?.tier ? ` (${paymentInfo.tier})` : ''} est maintenant actif.
            </p>
            <a
              href="/dashboard/billing"
              className="inline-block bg-teal-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Accéder à mon dashboard
            </a>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Paiement échoué</h1>
            <p className="text-gray-500 text-sm mb-6">
              Le paiement n'a pas abouti. Vous pouvez réessayer ou contacter le support.
            </p>
            <button
              onClick={() => window.history.back()}
              className="inline-block bg-teal-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Réessayer
            </button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Vérification en cours</h1>
            <p className="text-gray-500 text-sm mb-6">
              La confirmation prend plus de temps que prévu. Si vous avez payé, votre abonnement sera activé automatiquement.
            </p>
            <a
              href="/dashboard/billing"
              className="inline-block bg-teal-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Retour au dashboard
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Aucun paiement en cours</h1>
            <p className="text-gray-500 text-sm">
              Aucune information de paiement trouvée. Si vous avez déjà payé, vérifiez votre dashboard.
            </p>
          </>
        )}

        <p className="mt-6 text-xs text-gray-400">
          Besoin d'aide ? contact@cartelle.app
        </p>
      </div>
    </div>
  );
}

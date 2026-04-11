'use client';

import { Lock, Users, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';

interface CampaignLockProps {
  currentClients: number;
  required?: number;
  onOpenGuide?: () => void;
}

export function CampaignLock({ currentClients, required = 100, onOpenGuide }: CampaignLockProps) {
  const progress = Math.min(100, (currentClients / required) * 100);
  const remaining = Math.max(0, required - currentClients);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-sm">
        {/* Decorative gradient header */}
        <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Campagnes WhatsApp bientôt débloquées</h1>
            <p className="text-white/90 text-sm max-w-md">
              Les campagnes WhatsApp sont disponibles à partir de <strong>{required} clients fidèles</strong>.
              Continuez à fidéliser vos clients avec la roue et la carte fidélité !
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Votre progression
              </span>
              <span className="text-sm font-bold text-gray-900">
                {currentClients} / {required}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {remaining > 0
                ? `Encore ${remaining} client${remaining > 1 ? 's' : ''} pour débloquer les campagnes`
                : 'Félicitations ! Vos campagnes sont débloquées 🎉'}
            </p>
          </div>

          {/* Why */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 text-sm mb-1">Pourquoi ce seuil ?</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Les campagnes WhatsApp sont plus efficaces avec une base de clients engagés.
                  Nous vous aidons d&apos;abord à construire votre audience pour maximiser le ROI de vos campagnes.
                </p>
                <p className="text-xs text-amber-800 leading-relaxed mt-2">
                  <strong>À savoir :</strong> une fois débloquées, vous pourrez envoyer jusqu&apos;à 2 campagnes par semaine pour préserver l&apos;engagement de vos clients.
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <p className="font-semibold text-sm text-gray-900">Augmentez vos clients</p>
              </div>
              <p className="text-xs text-gray-600">
                Imprimez votre QR code et placez-le dans votre commerce pour collecter rapidement plus d&apos;avis.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <p className="font-semibold text-sm text-gray-900">Activez la fidélité</p>
              </div>
              <p className="text-xs text-gray-600">
                Chaque client qui laisse un avis est automatiquement inscrit à votre programme fidélité.
              </p>
            </div>
          </div>

          {/* Open guide */}
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors py-2"
            >
              <HelpCircle className="w-4 h-4" />
              En savoir plus sur les campagnes WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle, Target, Gift, Award, QrCode, ChevronRight, ChevronLeft, X, Sparkles, PartyPopper, Check } from 'lucide-react';

interface OnboardingGuideProps {
  merchant: {
    id: string;
    business_name?: string | null;
    created_at: string;
  };
  onClose: () => void;
}

const STEPS = [
  {
    icon: UserCircle,
    title: 'Complétez votre profil',
    subtitle: 'Infos & Apparence',
    description: 'Ajoutez le nom de votre commerce, votre logo et votre image de fond. C\'est ce que vos clients verront en premier !',
    tips: [
      'Ajoutez un beau logo (fond transparent recommandé)',
      'Choisissez une image de fond qui représente votre commerce',
      'Renseignez vos coordonnées de contact',
    ],
    cta: 'Aller au Profil',
    href: '/dashboard/profile',
    color: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    icon: Target,
    title: 'Configurez votre stratégie',
    subtitle: 'Workflow & Routage',
    description: 'Le mode WhatsApp est activé par défaut — vos clients recevront la roue et leur carte fidélité par WhatsApp. Il ne reste plus qu\'à configurer où vous voulez les rediriger !',
    tips: [
      'Collez votre lien Google Reviews pour booster vos avis',
      'Ajoutez vos liens Instagram, TikTok ou chaîne WhatsApp',
      'Planifiez quel réseau pour quel jour de la semaine',
    ],
    cta: 'Aller à la Stratégie',
    href: '/dashboard/strategy',
    color: 'from-[#EB1E99] to-[#7209B7]',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    icon: Gift,
    title: 'Ajoutez vos prix & lots',
    subtitle: 'Roue de la Fortune',
    description: 'Créez les cadeaux que vos clients pourront gagner en tournant la roue. Soyez créatifs !',
    tips: [
      'Livraison gratuite, -10%, dessert offert, gadget...',
      'Ajustez les probabilités selon votre budget',
      'Variez les lots pour surprendre vos clients',
    ],
    cta: 'Gérer les Prix',
    href: '/dashboard/prizes',
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    icon: Award,
    title: 'Activez la fidélité',
    subtitle: 'Carte Fidélité Digitale',
    description: 'Vos clients reçoivent automatiquement une carte fidélité digitale. Configurez les points, ajoutez des récompenses, et laissez la magie opérer !',
    tips: [
      'Activez le programme dans l\'onglet Paramètres',
      'Définissez le seuil d\'achat et les points par achat (ex: 1 point pour 10 EUR)',
      'Ajoutez des récompenses : café offert, -10%, dessert gratuit...',
      'Les clients reçoivent leur carte par WhatsApp automatiquement',
    ],
    cta: 'Configurer la Fidélité',
    href: '/dashboard/loyalty',
    color: 'from-purple-500 to-pink-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    icon: QrCode,
    title: 'Imprimez votre QR Code',
    subtitle: 'C\'est parti !',
    description: 'Dernière étape ! Imprimez votre QR code et placez-le dans votre commerce. Vos clients n\'ont plus qu\'à scanner pour vivre l\'expérience Qualee !',
    tips: [
      'Imprimez en grand format pour la caisse ou les tables',
      'Plastifiez-le pour qu\'il dure',
      'Placez-le là où vos clients attendent (comptoir, menu...)',
    ],
    cta: 'Voir mon QR Code',
    href: '/dashboard/qr',
    color: 'from-gray-700 to-gray-900',
    bgLight: 'bg-gray-50',
    textColor: 'text-gray-700',
  },
];

export function OnboardingGuide({ merchant, onClose }: OnboardingGuideProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleDismiss = () => {
    onClose();
  };

  const handleGoToStep = (href: string) => {
    onClose();
    router.push(href);
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${step.color} px-6 py-5 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                {isFirst ? <Sparkles className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <div>
                {isFirst && (
                  <p className="text-white/80 text-xs font-medium mb-0.5">
                    Bienvenue {merchant.business_name || ''} !
                  </p>
                )}
                <h2 className="text-lg font-bold">Premiers pas</h2>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="relative flex gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'bg-white flex-[2]' : i < currentStep ? 'bg-white/60 flex-1' : 'bg-white/25 flex-1'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step number + title */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full ${step.bgLight} ${step.textColor} flex items-center justify-center text-sm font-bold`}>
              {currentStep + 1}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{step.title}</h3>
              <p className="text-xs text-gray-500">{step.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Tips */}
          <div className={`${step.bgLight} rounded-xl p-4 mb-5`}>
            <ul className="space-y-2">
              {step.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className={`w-4 h-4 ${step.textColor} mt-0.5 flex-shrink-0`} />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Action button */}
          <button
            onClick={() => handleGoToStep(step.href)}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r ${step.color} hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
          >
            {isLast && <PartyPopper className="w-4 h-4" />}
            {step.cta}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={isFirst}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-0 disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>

            <button
              onClick={handleDismiss}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Passer le guide
            </button>

            {!isLast ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1 text-sm font-semibold text-pink-600 hover:text-violet-700 transition-colors"
              >
                Terminer
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

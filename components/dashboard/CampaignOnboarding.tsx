'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, FileText, Send, Users, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface CampaignOnboardingProps {
  variant?: 'campaign' | 'templates' | 'send';
  onClose: () => void;
}

const CAMPAIGN_STEPS = [
  {
    icon: MessageCircle,
    title: 'Qu\'est-ce qu\'une campagne WhatsApp ?',
    subtitle: 'Le principe',
    description: 'Les campagnes WhatsApp vous permettent d\'envoyer des messages marketing à tous vos clients fidèles en un seul clic. Parfait pour annoncer une promo, un nouveau produit ou remercier vos clients !',
    tips: [
      'Utilise l\'API Meta (Whatsapp Business) ou Whapi',
      'Vous ciblez vos clients qui ont déjà laissé un avis',
      'Messages riches avec images, boutons, liens',
    ],
    color: 'from-green-500 to-emerald-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
  },
  {
    icon: FileText,
    title: 'Créer des templates approuvés',
    subtitle: 'Templates Meta',
    description: 'Les templates sont des modèles de messages validés par Meta (WhatsApp). Ils sont obligatoires pour envoyer des campagnes via l\'API officielle. Allez dans l\'onglet Templates pour les créer.',
    tips: [
      'Créez vos templates dans l\'onglet Templates WhatsApp',
      'Meta valide votre template en quelques minutes',
      'Ajoutez variables ({{1}}, {{2}}) pour personnaliser',
      'Exemple : "Bonjour {{1}}, promo -20% aujourd\'hui !"',
    ],
    color: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    icon: Sparkles,
    title: 'Configurer votre campagne',
    subtitle: 'Design du message',
    description: 'Choisissez votre template ou créez un message carousel. Ajoutez des images, du texte, des boutons (lien, appel, réponse rapide). L\'aperçu en temps réel vous montre ce que le client va recevoir.',
    tips: [
      'Choisissez un template approuvé par Meta',
      'Ajoutez jusqu\'à 10 cartes carousel (images + textes)',
      'Boutons : lien web, appel téléphonique, réponse rapide',
      'Aperçu WhatsApp en direct à droite de l\'écran',
    ],
    color: 'from-purple-500 to-pink-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    icon: Users,
    title: 'Sélectionner les destinataires',
    subtitle: 'Votre audience',
    description: 'Parmi vos clients qui ont laissé un avis avec leur numéro WhatsApp, sélectionnez ceux qui recevront votre campagne. Vous pouvez tout sélectionner, filtrer les positifs, ou choisir manuellement.',
    tips: [
      'Ciblez tous les clients ou seulement les positifs',
      'Rechercher par numéro de téléphone',
      'Chaque message consomme 1 crédit WhatsApp',
      'Testez d\'abord en envoi test sur 1-2 numéros',
    ],
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    icon: Send,
    title: 'Envoyer & suivre',
    subtitle: 'C\'est parti !',
    description: 'Lancez votre campagne et suivez en temps réel les envois réussis, les échecs et les messages livrés. Vos statistiques apparaissent dans le dashboard.',
    tips: [
      'Maximum 2 campagnes par semaine pour préserver l\'engagement',
      'Vérifiez votre solde de crédits avant l\'envoi',
      'L\'envoi prend quelques secondes à quelques minutes',
      'Les échecs sont affichés avec les numéros concernés',
      'Meta fournit les statuts : envoyé, livré, lu',
    ],
    color: 'from-teal-500 to-emerald-500',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
];

const TEMPLATE_STEPS = [
  {
    icon: FileText,
    title: 'À quoi servent les templates ?',
    subtitle: 'Les bases',
    description: 'Meta impose l\'usage de templates pré-approuvés pour envoyer des messages marketing en masse via WhatsApp. Un template est un modèle validé une fois, réutilisable à l\'infini.',
    tips: [
      'Obligatoire pour l\'API Meta Cloud',
      'Validation par Meta en 1-10 minutes en moyenne',
      'Réutilisable pour toutes vos campagnes',
    ],
    color: 'from-blue-500 to-indigo-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    icon: Sparkles,
    title: 'Créer un template',
    subtitle: 'Structure',
    description: 'Un template est composé d\'un en-tête (texte/image), d\'un corps (message principal), d\'un pied de page et de boutons optionnels.',
    tips: [
      'Header : texte ou image (optionnel)',
      'Body : message principal, avec variables {{1}}, {{2}}',
      'Footer : texte court en bas (optionnel)',
      'Buttons : lien web, appel, réponse rapide',
    ],
    color: 'from-purple-500 to-pink-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    icon: CheckCircle2,
    title: 'Validation Meta',
    subtitle: 'Après soumission',
    description: 'Meta vérifie automatiquement votre template pour s\'assurer qu\'il respecte ses règles. 3 statuts possibles : En attente, Approuvé, Rejeté.',
    tips: [
      'PENDING : en cours de validation (1-10 min)',
      'APPROVED : prêt à être utilisé dans une campagne',
      'REJECTED : corrigez et soumettez à nouveau',
      'Évitez les contenus promotionnels agressifs',
    ],
    color: 'from-green-500 to-emerald-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
  },
];

const SEND_STEPS = [
  {
    icon: Users,
    title: 'Choisir votre audience',
    subtitle: 'Ciblage',
    description: 'Sélectionnez parmi vos clients qui ont laissé un avis WhatsApp qui recevra votre campagne. Filtrez par note, date de visite ou recherchez par numéro.',
    tips: [
      'Tout sélectionner : toute votre base WhatsApp',
      'Positifs uniquement : clients ayant donné 4-5 étoiles',
      'Recherche : filtrer par numéro de téléphone',
    ],
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    icon: Sparkles,
    title: 'Tester avant d\'envoyer',
    subtitle: 'Envoi test',
    description: 'Envoyez d\'abord votre campagne à 1 ou 2 numéros de test (le vôtre !) pour vérifier que tout s\'affiche correctement avant l\'envoi massif.',
    tips: [
      'Ajoutez votre propre numéro WhatsApp',
      'Vérifiez le rendu sur le téléphone',
      'Modifiez si besoin puis renvoyez',
    ],
    color: 'from-purple-500 to-pink-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    icon: Send,
    title: 'Envoi massif',
    subtitle: 'Lancement',
    description: 'Une fois le test validé, lancez l\'envoi à toute votre audience sélectionnée. Les messages sont envoyés progressivement pour respecter les limites de Meta.',
    tips: [
      'Vérifiez votre solde de crédits',
      '1 crédit = 1 message envoyé',
      'Suivi en temps réel : envoyés, livrés, échoués',
      'Les numéros en erreur sont listés pour correction',
    ],
    color: 'from-teal-500 to-emerald-500',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-600',
  },
];

const STORAGE_KEYS = {
  campaign: 'qualee_campaign_onboarding_dismissed',
  templates: 'qualee_templates_onboarding_dismissed',
  send: 'qualee_send_onboarding_dismissed',
};

const HEADERS = {
  campaign: 'Campagnes WhatsApp',
  templates: 'Templates WhatsApp',
  send: 'Envoi de campagne',
};

export function CampaignOnboarding({ variant = 'campaign', onClose }: CampaignOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = variant === 'templates' ? TEMPLATE_STEPS : variant === 'send' ? SEND_STEPS : CAMPAIGN_STEPS;
  const storageKey = STORAGE_KEYS[variant];
  const header = HEADERS[variant];

  const handleDismiss = () => {
    localStorage.setItem(storageKey, Date.now().toString());
    onClose();
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleDismiss} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${step.color} px-6 py-5 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-medium mb-0.5">Guide — {header}</p>
                <h2 className="text-lg font-bold">Comment ça marche ?</h2>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex gap-1.5 mt-4">
            {steps.map((_, i) => (
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

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full ${step.bgLight} ${step.textColor} flex items-center justify-center text-sm font-bold`}>
              {currentStep + 1}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{step.title}</h3>
              <p className="text-xs text-gray-500">{step.subtitle}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-4">{step.description}</p>

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

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={isFirst}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-0 disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>

            <button onClick={handleDismiss} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
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
                className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
              >
                J'ai compris
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

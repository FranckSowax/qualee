export interface SubscriptionPlan {
  key: string;
  name: string;
  price_eur: number;
  period: string;
  description: string;
  max_locations: number;
  monthly_credits: number; // WhatsApp credits renewed each month
  features: string[];
  popular?: boolean;
  accent?: boolean;
}

export const PLANS: Record<string, SubscriptionPlan> = {
  essentiel: {
    key: 'essentiel',
    name: 'Essentiel',
    price_eur: 15,
    period: 'EUR / mois',
    description: 'Le plus choisi par nos clients',
    max_locations: 1,
    monthly_credits: 100,
    popular: true,
    features: [
      '1 établissement',
      'Roue + Carte fidélité',
      'QR Code personnalisé',
      'Statistiques avancées',
      '100 crédits WhatsApp / mois',
      'Support prioritaire',
    ],
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    price_eur: 39,
    period: 'EUR / mois',
    description: 'Performance maximale',
    max_locations: 3,
    monthly_credits: 500,
    features: [
      '3 établissements',
      'Toutes les fonctionnalités',
      'Branding personnalisé',
      'Wallet Apple & Google',
      '500 crédits WhatsApp / mois',
      'Gestionnaire dédié',
    ],
  },
  'sur-mesure': {
    key: 'sur-mesure',
    name: 'Sur mesure',
    price_eur: 0,
    period: '',
    description: 'Réseaux multi-sites',
    max_locations: -1,
    monthly_credits: 0,
    accent: true,
    features: [
      'Établissements illimités',
      'API & intégrations',
      'White label',
      'SLA garanti',
      'Crédits WhatsApp sur mesure',
      'Formation équipes',
    ],
  },
};

export function getPlan(tier: string): SubscriptionPlan | undefined {
  return PLANS[tier];
}

export function getPlanPriceEUR(tier: string): number {
  return PLANS[tier]?.price_eur ?? 0;
}

export function getPlanMonthlyCredits(tier: string): number {
  return PLANS[tier]?.monthly_credits ?? 0;
}

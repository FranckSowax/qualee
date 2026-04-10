export interface SubscriptionPlan {
  key: string;
  name: string;
  price_xaf: number;
  price_usd: number;
  max_locations: number;
  features: string[];
}

export const PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    price_xaf: 9000,
    price_usd: 15,
    max_locations: 1,
    features: [
      'Roue de la fortune',
      'Programme de fidélité',
      'QR Codes illimités',
      'Avis clients',
      '1 établissement',
      'Support email',
    ],
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    price_xaf: 36000,
    price_usd: 59,
    max_locations: 3,
    features: [
      'Tout Starter +',
      'Campagnes WhatsApp',
      'Analytiques avancées',
      'Jusqu\'à 3 établissements',
      'Automatisations WhatsApp',
      'Support prioritaire',
    ],
  },
  'multi-shop': {
    key: 'multi-shop',
    name: 'Multi-Shop',
    price_xaf: 60000,
    price_usd: 99,
    max_locations: -1,
    features: [
      'Tout Pro +',
      'Établissements illimités',
      'Dashboard multi-sites',
      'Rapports consolidés',
      'API personnalisée',
      'Support dédié',
    ],
  },
};

export function getPlan(tier: string): SubscriptionPlan | undefined {
  return PLANS[tier];
}

export function getPlanPriceXAF(tier: string): number {
  return PLANS[tier]?.price_xaf ?? 0;
}

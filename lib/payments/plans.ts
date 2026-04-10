export interface SubscriptionPlan {
  key: string;
  name: string;
  price_xaf: number;
  period: string;
  description: string;
  max_locations: number;
  features: string[];
  popular?: boolean;
  accent?: boolean;
}

export const PLANS: Record<string, SubscriptionPlan> = {
  essentiel: {
    key: 'essentiel',
    name: 'Essentiel',
    price_xaf: 10000,
    period: 'FCFA / mois',
    description: 'Le plus choisi par nos clients',
    max_locations: 1,
    popular: true,
    features: [
      '1 établissement',
      'Roue + Carte fidélité',
      'QR Code personnalisé',
      'Statistiques avancées',
      'Campagnes WhatsApp',
      'Support prioritaire',
    ],
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    price_xaf: 25000,
    period: 'FCFA / mois',
    description: 'Performance maximale',
    max_locations: 3,
    features: [
      '3 établissements',
      'Toutes les fonctionnalités',
      'Branding personnalisé',
      'Wallet Apple & Google',
      'Analytics avancés',
      'Gestionnaire dédié',
    ],
  },
  'sur-mesure': {
    key: 'sur-mesure',
    name: 'Sur mesure',
    price_xaf: 0,
    period: '',
    description: 'Réseaux multi-sites',
    max_locations: -1,
    accent: true,
    features: [
      'Établissements illimités',
      'API & intégrations',
      'White label',
      'SLA garanti',
      'Accompagnement stratégique',
      'Formation équipes',
    ],
  },
};

export function getPlan(tier: string): SubscriptionPlan | undefined {
  return PLANS[tier];
}

export function getPlanPriceXAF(tier: string): number {
  return PLANS[tier]?.price_xaf ?? 0;
}

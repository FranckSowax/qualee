export interface Merchant {
  id: string;
  email: string;
  name: string | null;
  business_name: string | null;
  logo_url: string | null;
  logo_background_color?: string | null;
  background_url: string | null;
  qr_code_url: string | null;
  branding: Record<string, any>;
  google_review_link: string | null;
  google_maps_url: string | null;
  tripadvisor_url: string | null;
  instagram_handle: string | null;
  instagram_url: string | null;
  whatsapp_channel_url: string | null;
  tiktok_handle: string | null;
  tiktok_url: string | null;
  weekly_schedule: string | null;
  subscription_tier: string;
  unlucky_probability?: number;
  retry_probability?: number;
  unlucky_quantity?: number;
  retry_quantity?: number;
  prize_quantities?: Record<string, number>;
  // WhatsApp workflow fields
  workflow_mode?: 'web' | 'whatsapp';
  whatsapp_message_template?: string | null;
  // Loyalty program fields
  loyalty_enabled?: boolean;
  loyalty_card_image_url?: string | null;
  points_per_purchase?: number;
  purchase_amount_threshold?: number;
  loyalty_currency?: 'EUR';
  welcome_points?: number;
  loyalty_message_template?: string | null;
  // Subscription fields
  phone?: string | null;
  subscription_started_at?: string | null;
  subscription_expires_at?: string | null;
  last_renewal_reminder_at?: string | null;
  last_trial_reminder_at?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Prize {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  probability: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  merchant_id: string;
  rating: number;
  comment: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  is_positive: boolean;
  user_token: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface Spin {
  id: string;
  merchant_id: string;
  prize_id: string | null;
  ip_hash: string | null;
  user_token: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  spin_id: string;
  merchant_id: string;
  code: string;
  prize_name: string;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface QRCode {
  id: string;
  merchant_id: string;
  asset_url: string;
  asset_type: string;
  created_at: string;
}

export interface SubscriptionTier {
  tier_name: string;
  max_locations: number;
  price: number;
  features: Record<string, any>;
}

export type SubscriptionPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
export type SubscriptionPaymentType = 'new' | 'renewal';

export interface SubscriptionPayment {
  id: string;
  merchant_id: string;
  tier: string;
  amount_eur: number;
  payment_type: SubscriptionPaymentType;
  external_reference: string;
  ebilling_bill_id: string | null;
  mysql_init_id: number | null;
  status: SubscriptionPaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface SubscriptionToken {
  id: string;
  merchant_id: string;
  token: string;
  purpose: 'trial_payment' | 'renewal_payment';
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export type NotificationType = 'feedback' | 'spin' | 'coupon_used' | 'new_customer' | 'subscription_expiry';

export interface Notification {
  id: string;
  merchant_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

// ============================================================================
// LOYALTY SYSTEM TYPES
// ============================================================================

export type LoyaltyClientStatus = 'active' | 'suspended' | 'expired';

export interface LoyaltyClient {
  id: string;
  merchant_id: string;
  card_id: string; // Format: CART-YYYY-XXXX
  name: string | null;
  phone: string | null;
  email: string | null;
  birthday: string | null; // Date de naissance pour cadeaux anniversaire
  points: number;
  total_purchases: number;
  total_spent: number;
  qr_code_data: string; // UUID unique pour le QR
  user_token: string | null;
  apple_pass_serial: string | null;
  google_pass_id: string | null;
  preferred_language: string | null; // Language preference (fr)
  status: LoyaltyClientStatus;
  last_visit: string | null;
  created_at: string;
  updated_at: string;
}

export type PointsTransactionType = 'earn' | 'redeem' | 'bonus' | 'welcome' | 'adjustment';

export interface PointsTransaction {
  id: string;
  client_id: string;
  merchant_id: string;
  type: PointsTransactionType;
  points: number; // Positif = gain, Négatif = dépense
  balance_after: number;
  purchase_amount: number | null;
  description: string | null;
  reference_id: string | null;
  staff_id: string | null;
  created_at: string;
}

export type LoyaltyRewardType = 'discount' | 'product' | 'service' | 'cashback';

export interface LoyaltyReward {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  type: LoyaltyRewardType;
  value: string; // "10" pour 10%, "Dessert gratuit", etc.
  points_cost: number;
  quantity_available: number | null; // null = illimité
  image_url: string | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type RedeemedRewardStatus = 'pending' | 'used' | 'expired' | 'cancelled';

export interface RedeemedReward {
  id: string;
  client_id: string;
  reward_id: string | null;
  merchant_id: string;
  reward_name: string;
  reward_value: string;
  points_spent: number;
  redemption_code: string; // Format: RWD-XXXXXX
  status: RedeemedRewardStatus;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

// Extended types with relations
export interface LoyaltyClientWithTransactions extends LoyaltyClient {
  transactions?: PointsTransaction[];
  redeemed_rewards?: RedeemedReward[];
}

export interface LoyaltyRewardWithStats extends LoyaltyReward {
  times_redeemed?: number;
}

// Stats interfaces
export interface LoyaltyStats {
  total_clients: number;
  active_clients: number;
  total_points_issued: number;
  total_points_redeemed: number;
  total_rewards_redeemed: number;
  average_points_per_client: number;
}

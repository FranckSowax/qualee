/**
 * E-Billing Payment Client
 *
 * Strict flow: init.php → e_bills → portal → check_status.php
 * See /public/GUIDE_PAIEMENT_EBILLING.md for full documentation.
 */

const BACKEND_URL = 'https://futursowax.com/paiement';
const EBILLING_API_URL = 'https://stg.billing-easy.com/api/v1/merchant/e_bills';
const EBILLING_PORTAL_URL = 'https://staging.billing-easy.net';
const EBILLING_AUTH = Buffer.from('Sowax:ca492d78-cbeb-4513-9525-c23b8f0ce0c1').toString('base64');

// ─── Helpers ────────────────────────────────────────────────────────────────

export function generateExternalReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `QUALEE_${timestamp}_${random}`;
}

export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '24174000000';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('241')) return cleaned;
  if (cleaned.startsWith('0')) return '241' + cleaned.substring(1);
  return '241' + cleaned;
}

/**
 * Safely fetch + parse JSON. Handles non-JSON responses gracefully.
 */
async function safeFetchJson(url: string, options: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[EBILLING] Non-JSON response from ${url}:`, text.substring(0, 500));
    data = { error: `Réponse invalide du serveur (HTTP ${response.status})` };
  }

  return { ok: response.ok, status: response.status, data };
}

// ─── Step 1: init.php (OBLIGATOIRE — TOUJOURS EN PREMIER) ──────────────────

interface InitParams {
  userId: string;
  amount: number;
  phone: string;
  description: string;
  externalReference: string;
}

interface InitResult {
  success: boolean;
  mysql_id?: number;
  message?: string;
}

export async function initTransaction(params: InitParams): Promise<InitResult> {
  const { ok, data } = await safeFetchJson(`${BACKEND_URL}/init.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: params.userId,
      amount: Math.round(params.amount),
      phone_number: formatPhoneNumber(params.phone),
      payment_system: 'ebilling',
      transaction_type: 'deposit',
      currency: 'XAF',
      description: params.description.substring(0, 100),
      external_reference: params.externalReference,
    }),
  });

  console.log('[EBILLING] init.php response:', { ok, data });

  if (!ok || !data.success || !data.data?.mysql_id) {
    return { success: false, message: data.message || data.error || 'Erreur initialisation transaction' };
  }

  return { success: true, mysql_id: data.data.mysql_id };
}

// ─── Step 2: e_bills (SEULEMENT après init réussi) ─────────────────────────

interface EBillParams {
  email: string;
  phone: string;
  amount: number;
  description: string;
  externalReference: string;
  payerName: string;
}

interface EBillResult {
  success: boolean;
  bill_id?: string;
  message?: string;
}

export async function createEBill(params: EBillParams): Promise<EBillResult> {
  const { ok, data } = await safeFetchJson(EBILLING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${EBILLING_AUTH}`,
    },
    body: JSON.stringify({
      payer_email: params.email,
      payer_msisdn: formatPhoneNumber(params.phone),
      amount: Math.round(params.amount),
      short_description: params.description.substring(0, 100),
      external_reference: params.externalReference,
      payer_name: params.payerName,
      expiry_period: 60,
      currency: 'XAF',
    }),
  });

  console.log('[EBILLING] e_bills response:', { ok, billId: data.e_bill?.bill_id });

  const billId = data.e_bill?.bill_id;

  if (!billId) {
    return { success: false, message: data.message || data.error || 'Erreur création facture E-Billing' };
  }

  return { success: true, bill_id: String(billId) };
}

// ─── Step 3: Portal URL ────────────────────────────────────────────────────

export function getPortalUrl(billId: string): string {
  return `${EBILLING_PORTAL_URL}/?invoice=${billId}`;
}

// ─── Step 4: check_status.php ──────────────────────────────────────────────

interface StatusResult {
  success: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
  amount?: number;
  wallet_credited?: boolean;
  message?: string;
}

export async function checkPaymentStatus(externalReference: string): Promise<StatusResult> {
  const { data } = await safeFetchJson(
    `${BACKEND_URL}/check_status.php?external_reference=${encodeURIComponent(externalReference)}`,
    { method: 'GET' }
  );

  if (!data.success) {
    return { success: false, status: 'pending', message: data.message };
  }

  return {
    success: true,
    status: data.data?.status || 'pending',
    amount: data.data?.amount,
    wallet_credited: data.data?.wallet_credited,
  };
}

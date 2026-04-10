# Guide Complet : Flux de Paiement E-Billing

> Ce guide explique en detail le parcours complet du paiement, depuis le clic sur le bouton "Payer" jusqu'a la verification finale. Focalise uniquement sur la mecanique de paiement, independamment de la logique metier.

---

## REGLE OBLIGATOIRE — LIRE AVANT TOUTE IMPLEMENTATION

> **L'appel a `init.php` est la PREMIERE etape OBLIGATOIRE de tout paiement. AUCUNE facture E-Billing ne doit etre creee sans avoir d'abord initialise la transaction via `init.php`.**

### Pourquoi c'est CRITIQUE :

L'appel `POST ${BACKEND_URL}/init.php` **DOIT** etre execute AVANT l'appel a l'API E-Billing (`e_bills`). Ce n'est PAS optionnel. Sans cet appel :
- La transaction n'existe PAS dans notre base MySQL
- Le `check_status.php` ne pourra JAMAIS retrouver la transaction (il cherche par `external_reference` dans MySQL)
- Le polling de verification echouera systematiquement
- Le paiement sera perdu sans aucune trace cote backend

### Ordre STRICT des appels (ne JAMAIS changer) :

```
1. OBLIGATOIRE — POST init.php          → Enregistre la transaction dans MySQL, retourne mysql_id
2. OBLIGATOIRE — Verifier init.success   → Si false, ARRETER ICI, ne PAS continuer
3. OBLIGATOIRE — POST e_bills            → Cree la facture E-Billing (SEULEMENT si init a reussi)
4. OBLIGATOIRE — Ouvrir le portail       → WebView avec l'URL du portail
5. OBLIGATOIRE — GET check_status.php    → Polling pour verifier le statut (fonctionne GRACE a init.php)
```

---

## URLs de production

| Service | URL |
|---------|-----|
| **Backend PHP (init, status, transfer)** | `https://futursowax.com/paiement` |
| **init.php** | `https://futursowax.com/paiement/init.php` |
| **check_status.php** | `https://futursowax.com/paiement/check_status.php` |
| **transfer.php** | `https://futursowax.com/paiement/transfer.php` |
| **ebilling_notification.php** | `https://futursowax.com/paiement/ebilling_notification.php` |
| **callback.php** | `https://futursowax.com/paiement/callback.php` |
| **Callback (remerciement)** | `https://futursowax.com/paiement/remerciement` |
| **API E-Billing** | `https://stg.billing-easy.com/api/v1/merchant/e_bills` |
| **Portail E-Billing** | `https://staging.billing-easy.net` |
| **Email (verification/reset)** | `https://lamap.online/mail/` |
| **Site web / APK** | `https://www.lamap.online/` |

### Credentials E-Billing

| Champ | Valeur |
|-------|--------|
| Username | `Sowax` |
| Shared Key | `ca492d78-cbeb-4513-9525-c23b8f0ce0c1` |

---

## 1. Vue d'ensemble : Ce qui se passe quand l'utilisateur clique "Payer"

```
 UTILISATEUR                        APP                          SERVEURS
 ───────────                        ───                          ────────
     │                               │                              │
     │  1. Clique "Payer"            │                              │
     │──────────────────────────────>│                              │
     │                               │  2. POST init.php            │
     │                               │─────────────────────────────>│ Backend PHP
     │                               │  <─ { mysql_id: 12345 }     │ (futursowax.com)
     │                               │                              │
     │                               │  3. POST e_bills             │
     │                               │─────────────────────────────>│ API E-Billing
     │                               │  <─ { bill_id: "EBILL-..." }│ (billing-easy.com)
     │                               │                              │
     │  4. Portail s'ouvre (WebView) │                              │
     │<──────────────────────────────│                              │
     │                               │                              │
     │  5. Choisit Mobile Money      │                              │
     │     ou Carte bancaire         │                              │
     │  6. Valide le paiement        │                              │
     │                               │                              │
     │  7. Portail redirige          │                              │
     │──────────────────────────────>│                              │
     │                               │  8. GET check_status.php     │
     │                               │─────────────────────────────>│ Backend PHP
     │                               │  <─ { status: "completed" } │
     │                               │                              │
     │  9. "Paiement confirme !"     │                              │
     │<──────────────────────────────│                              │
```

---

## 2. Appel 1 : Initialisation Backend (init.php)

### Requete HTTP

```http
POST https://futursowax.com/paiement/init.php
Content-Type: application/json
```

```json
{
  "user_id": "uuid-de-lutilisateur",
  "amount": 605000,
  "phone_number": "24174123456",
  "payment_system": "ebilling",
  "transaction_type": "deposit",
  "currency": "XAF",
  "description": "Description du paiement (max 100 caracteres)",
  "external_reference": "PREFIX_1738934521234_0042"
}
```

### Detail de chaque champ

| Champ | Type | Description |
|-------|------|-------------|
| `user_id` | string | UUID de l'utilisateur authentifie |
| `amount` | number | Montant en XAF, arrondi a l'entier (`Math.round()`) |
| `phone_number` | string | Telephone au format international sans `+` (ex: `"24174123456"`) |
| `payment_system` | string | Toujours `"ebilling"` |
| `transaction_type` | string | Type de paiement (ex: `"deposit"`, `"payment"`) |
| `currency` | string | Devise — `"XAF"` pour le Franc CFA |
| `description` | string | Texte libre, tronque a 100 caracteres |
| `external_reference` | string | Reference unique generee cote client |

### Reference externe

```typescript
function generateExternalReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PREFIX_${timestamp}_${random}`;
}
```

### Formatage du telephone

```typescript
function formatPhoneNumber(phone?: string): string {
  if (!phone) return '24174000000';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('00'))  cleaned = cleaned.substring(2);
  if (cleaned.startsWith('241')) return cleaned;
  if (cleaned.startsWith('0'))   return '241' + cleaned.substring(1);
  return '241' + cleaned;
}
```

### Reponses

**Succes :**
```json
{
  "success": true,
  "data": { "mysql_id": 12345 }
}
```

**Echec :**
```json
{
  "success": false,
  "message": "Erreur lors de l'initialisation de la transaction"
}
```

---

## 3. Appel 2 : Creation de la facture E-Billing

### Authentification (Basic Auth)

```typescript
const auth = `Basic ${base64Encode('Sowax:ca492d78-cbeb-4513-9525-c23b8f0ce0c1')}`;
```

### Requete HTTP

```http
POST https://stg.billing-easy.com/api/v1/merchant/e_bills
Content-Type: application/json
Accept: application/json
Authorization: Basic U293YXg6Y2E0OTJkNzgtY2JlYi00NTEzLTk1MjUtYzIzYjhmMGNlMGMx
```

```json
{
  "payer_email": "client@email.com",
  "payer_msisdn": "24174123456",
  "amount": 605000,
  "short_description": "Description du paiement",
  "external_reference": "PREFIX_1738934521234_0042",
  "payer_name": "Nom du client",
  "expiry_period": 60,
  "currency": "XAF"
}
```

### Reponse succes

```json
{
  "e_bill": { "bill_id": "EBILL-123456789" }
}
```

### URL du portail

```
https://staging.billing-easy.net/?invoice=EBILL-123456789
```

---

## 4. Portail de paiement (WebView)

Le portail s'ouvre dans un WebView. L'utilisateur choisit Mobile Money (Airtel/Moov) ou Carte bancaire.

### Detection du resultat par URL

```typescript
const handleNavigationStateChange = (navState) => {
  const url = navState.url.toLowerCase();

  // SUCCES
  if (url.includes('remerciement') || url.includes('callback') ||
      url.includes('success') || url.includes('complete')) {
    onClose(); // Ferme WebView, lance le polling
    return;
  }

  // ECHEC
  if (url.includes('cancel') || url.includes('error') || url.includes('failed')) {
    onCancel();
    return;
  }
};
```

---

## 5. Verification du paiement (Polling)

### Requete HTTP

```http
GET https://futursowax.com/paiement/check_status.php?external_reference=PREFIX_1738934521234_0042
```

### Parametres de timing

| Parametre | Valeur |
|-----------|--------|
| Max tentatives | 60 |
| Intervalle | 3 secondes |
| Duree max | 3 minutes |

### Statuts possibles

| Statut | Action |
|--------|--------|
| `pending` | Continue le polling |
| `processing` | Continue le polling |
| `completed` | ARRETE — affiche succes |
| `failed` | ARRETE — affiche erreur |
| `cancelled` | ARRETE — affiche annulation |
| `expired` | ARRETE — affiche expiration |

### Reponse type

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "amount": 605000,
    "wallet_credited": true
  }
}
```

### Logique de polling

```typescript
const startPolling = (externalReference: string) => {
  let attempt = 0;
  const MAX = 60;
  const INTERVAL = 3000;

  const check = async () => {
    attempt++;
    const result = await checkPaymentStatus(externalReference);

    if (result.status === 'completed') { stopPolling(); onSuccess(result); return; }
    if (['failed', 'cancelled', 'expired'].includes(result.status)) { stopPolling(); onError(result.status); return; }
    if (attempt >= MAX) { stopPolling(); onTimeout(); return; }

    setTimeout(check, INTERVAL);
  };

  setTimeout(check, 1000); // Premier check apres 1s
};
```

---

## 6. Implementation MINIMALE

```typescript
const BACKEND_URL = 'https://futursowax.com/paiement';

async function handlePayment(userId, amount, description, email, phone) {
  const externalReference = generateExternalReference();

  // ETAPE 1 — init.php (OBLIGATOIRE)
  const initResp = await fetch(`${BACKEND_URL}/init.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount: Math.round(amount),
      phone_number: formatPhoneNumber(phone),
      payment_system: 'ebilling',
      transaction_type: 'deposit',
      currency: 'XAF',
      description: description.substring(0, 100),
      external_reference: externalReference,
    }),
  });
  const initData = await initResp.json();

  // VERIFICATION — Si echec, ARRETER
  if (!initData.success || !initData.data?.mysql_id) {
    throw new Error(initData.message || "Erreur initialisation");
  }

  // ETAPE 2 — e_bills (seulement apres init reussi)
  const auth = `Basic ${base64Encode('Sowax:ca492d78-cbeb-4513-9525-c23b8f0ce0c1')}`;
  const ebResp = await fetch('https://stg.billing-easy.com/api/v1/merchant/e_bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': auth },
    body: JSON.stringify({
      payer_email: email,
      payer_msisdn: formatPhoneNumber(phone),
      amount: Math.round(amount),
      short_description: description.substring(0, 100),
      external_reference: externalReference,
      payer_name: 'Client',
      expiry_period: 60,
      currency: 'XAF',
    }),
  });
  const ebData = await ebResp.json();
  const billId = ebData.e_bill?.bill_id;
  if (!billId) throw new Error('Pas de bill_id');

  // ETAPE 3 — Ouvrir le portail
  const portalUrl = `https://staging.billing-easy.net/?invoice=${billId}`;
  // → Ouvrir dans WebView

  // ETAPE 4 — Polling (apres fermeture WebView)
  // → GET https://futursowax.com/paiement/check_status.php?external_reference=...
}
```

---

## 7. Erreurs frequentes

| ERREUR | CORRECTION |
|--------|------------|
| Appeler E-Billing SANS appeler `init.php` d'abord | TOUJOURS appeler `init.php` EN PREMIER |
| Ignorer la reponse de `init.php` et continuer si `success: false` | Verifier `initData.success` et ARRETER si `false` |
| Utiliser l'ancien domaine `emoneygabon.alwaysdata.net` | Utiliser `https://futursowax.com/paiement` |
| Mettre l'appel `init.php` en commentaire | L'appel est OBLIGATOIRE, sans exception |

---

## 8. Fichiers PHP sur le serveur

Tous heberges sur `futursowax.com/paiement/` :

| Fichier | Role |
|---------|------|
| `init.php` | Initialise la transaction dans MySQL |
| `check_status.php` | Retourne le statut d'une transaction |
| `transfer.php` | Effectue un retrait (payout) |
| `callback.php` | Callback E-Billing apres paiement |
| `ebilling_notification.php` | Webhook E-Billing (notification serveur) |
| `config.php` | Configuration BDD + credentials |
| `BillingEasyClient.php` | Client PHP pour l'API E-Billing |

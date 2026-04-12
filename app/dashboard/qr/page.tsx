'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download, Copy, Share2, QrCode, Printer, CheckCircle2,
  ShoppingBag, Package, Loader2, MapPin, Phone, Check, Gift, Minus, Plus,
} from 'lucide-react';
import QRCode from 'qrcode';

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'https://qualee.app';
}

const SUPPORTS = [
  {
    key: 'paper',
    name: 'Chevalet Papier',
    description: 'Chevalet cartonné élégant à poser sur comptoir ou table',
    price: 0,
    priceLabel: 'Offert',
    minQty: 1,
    image: '/qr-paper.jpeg',
    badge: 'Gratuit',
    badgeColor: 'bg-green-100 text-green-700',
  },
  {
    key: 'plexiglas',
    name: 'Chevalet Plexiglas',
    description: 'Support premium transparent, résistant et professionnel',
    price: 5000,
    priceLabel: '5 000 FCFA',
    minQty: 1,
    image: '/qr-plexi.jpeg',
    badge: 'Premium',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'dtf',
    name: 'QR Code DTF',
    description: 'Sticker à coller sur table, vitrine ou menu. Lot de 4 minimum',
    price: 10000,
    priceLabel: '10 000 FCFA / lot de 4',
    minQty: 4,
    image: '/qr-dtf.jpeg',
    badge: 'Autocollant',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
  production: { label: 'En production', color: 'bg-purple-100 text-purple-700' },
  shipped: { label: 'Expédiée', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
};

export default function QRCodePage() {
  const router = useRouter();
  const { i18n } = useTranslation(undefined, { useSuspense: false });
  const isFr = i18n.language === 'fr';
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Order state
  const [selectedSupport, setSelectedSupport] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [myOrders, setMyOrders] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }
      setUser(user);

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();
      setMerchant(merchantData);

      if (merchantData?.qr_code_url) {
        setQrCodeUrl(merchantData.qr_code_url);
      } else {
        const url = `${getBaseUrl()}/rate/${user.id}`;
        const qr = await QRCode.toDataURL(url, {
          width: 400, margin: 2,
          color: { dark: '#2D6A4F', light: '#FFFFFF' },
        });
        setQrCodeUrl(qr);
      }

      // Load orders
      const res = await fetch('/api/qr-orders');
      if (res.ok) {
        const data = await res.json();
        setMyOrders(data.orders || []);
      }
    };
    checkAuth();
  }, [router]);

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `qualee-qr-${merchant?.business_name || 'code'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const copyLink = () => {
    if (!user) return;
    navigator.clipboard.writeText(`${getBaseUrl()}/rate/${user.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOrder = async () => {
    if (!selectedSupport) return;
    const support = SUPPORTS.find(s => s.key === selectedSupport);
    if (!support) return;

    if (support.key === 'dtf' && quantity < 4) {
      setOrderError('Minimum 4 unités pour le DTF');
      return;
    }

    if (support.key !== 'paper' && !address.trim()) {
      setOrderError('Adresse de livraison requise');
      return;
    }

    setOrdering(true);
    setOrderError('');

    try {
      const res = await fetch('/api/qr-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          support_type: selectedSupport,
          quantity,
          shipping_address: address,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error || 'Erreur lors de la commande');
        setOrdering(false);
        return;
      }

      setOrderSuccess(true);
      setSelectedSupport(null);
      setMyOrders(prev => [data.order, ...prev]);
      setTimeout(() => setOrderSuccess(false), 5000);
    } catch {
      setOrderError('Erreur de connexion');
    }
    setOrdering(false);
  };

  const reviewUrl = user ? `${getBaseUrl()}/rate/${user.id}` : '';

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  const currentSupport = SUPPORTS.find(s => s.key === selectedSupport);

  return (
    <DashboardLayout merchant={merchant}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            QR Code & Supports
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-[52px]">Téléchargez votre QR code et commandez vos supports imprimés</p>
        </div>

        {/* Top row: QR Code + Link */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code Card */}
          <Card className="group relative overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="p-6 flex flex-col items-center">
              {merchant?.qr_code_url && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  QR Code actif
                </span>
              )}
              <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-sm">
                {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-44 h-44" />}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button onClick={downloadQR} size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-xs">
                  <Download className="w-3.5 h-3.5" /> Télécharger
                </Button>
                <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Printer className="w-3.5 h-3.5" /> Imprimer
                </Button>
              </div>
            </div>
          </Card>

          {/* Link Card */}
          <Card className="group relative overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="p-6 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Lien de review</p>
                    <p className="text-xs text-gray-500">Copiez et partagez directement</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 truncate">
                    {reviewUrl}
                  </div>
                  <Button onClick={copyLink} size="sm" variant={copied ? 'default' : 'outline'} className={`shrink-0 gap-1.5 text-xs ${copied ? 'bg-teal-600 text-white' : ''}`}>
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copié !</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
                  </Button>
                </div>
              </div>
              <Button onClick={copyLink} variant="outline" size="sm" className="gap-1.5 text-xs w-full">
                <Share2 className="w-3.5 h-3.5" /> Partager le lien
              </Button>
            </div>
          </Card>
        </div>

        {/* ═══════════ COMMANDER UN SUPPORT ═══════════ */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Commander un support imprimé</h2>
              <p className="text-xs text-gray-500">Recevez votre QR code sur un support professionnel</p>
            </div>
          </div>

          {orderSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              Commande envoyée avec succès ! Nous vous contacterons pour la livraison.
            </div>
          )}

          {/* Support cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUPPORTS.map((support) => {
              const isSelected = selectedSupport === support.key;
              return (
                <button
                  key={support.key}
                  onClick={() => {
                    setSelectedSupport(isSelected ? null : support.key);
                    setQuantity(support.minQty);
                    setOrderError('');
                  }}
                  className={`relative text-left rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                    isSelected
                      ? 'border-teal-500 shadow-lg ring-2 ring-teal-500/20'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-40 overflow-hidden">
                    <img src={support.image} alt={support.name} className="w-full h-full object-cover" />
                    <Badge className={`absolute top-2 right-2 ${support.badgeColor} text-xs`}>
                      {support.badge}
                    </Badge>
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm">{support.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{support.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-sm font-bold ${support.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {support.priceLabel}
                      </span>
                      {support.price === 0 && <Gift className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Order form (shown when support selected) */}
          {selectedSupport && currentSupport && (
            <Card className="mt-4 p-5 border border-teal-200 bg-teal-50/30">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" />
                Commander : {currentSupport.name}
              </h3>

              {orderError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {orderError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(currentSupport.minQty, quantity - (currentSupport.key === 'dtf' ? 4 : 1)))}
                      className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold text-gray-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + (currentSupport.key === 'dtf' ? 4 : 1))}
                      className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {currentSupport.key === 'dtf' && (
                    <p className="text-xs text-gray-500 mt-1">Par lot de 4 (min. 4)</p>
                  )}
                </div>

                {/* Total */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentSupport.price === 0 ? (
                      <span className="text-green-600">Gratuit</span>
                    ) : (
                      <>
                        {currentSupport.key === 'dtf'
                          ? (Math.ceil(quantity / 4) * 10000).toLocaleString('fr-FR')
                          : (currentSupport.price * quantity).toLocaleString('fr-FR')
                        }
                        <span className="text-sm font-normal text-gray-500 ml-1">FCFA</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Address (not required for paper) */}
                {currentSupport.price > 0 && (
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-3.5 h-3.5" /> Adresse de livraison
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Quartier Bonanjo, Rue de la Joie, Douala"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                    />
                  </div>
                )}

                {/* Phone */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-3.5 h-3.5" /> Téléphone de contact
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <Button
                onClick={handleOrder}
                disabled={ordering}
                className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white py-3"
              >
                {ordering ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Envoi en cours...</>
                ) : currentSupport.price === 0 ? (
                  <><Gift className="w-4 h-4 mr-2" /> Commander gratuitement</>
                ) : (
                  <><ShoppingBag className="w-4 h-4 mr-2" /> Commander maintenant</>
                )}
              </Button>
            </Card>
          )}
        </div>

        {/* ═══════════ MES COMMANDES ═══════════ */}
        {myOrders.length > 0 && (
          <Card className="overflow-hidden border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                Mes commandes
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Date</th>
                    <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Support</th>
                    <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Qté</th>
                    <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Montant</th>
                    <th className="text-left py-2.5 px-4 text-gray-500 font-medium text-xs">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.map((order) => {
                    const status = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                    const supportName = SUPPORTS.find(s => s.key === order.support_type)?.name || order.support_type;
                    return (
                      <tr key={order.id} className="border-b border-gray-50">
                        <td className="py-2.5 px-4 text-gray-600 text-xs">
                          {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-2.5 px-4 text-gray-900 font-medium text-xs">{supportName}</td>
                        <td className="py-2.5 px-4 text-gray-600 text-xs">{order.quantity}</td>
                        <td className="py-2.5 px-4 text-gray-900 font-medium text-xs">
                          {order.amount_xaf === 0 ? 'Gratuit' : `${order.amount_xaf.toLocaleString('fr-FR')} FCFA`}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

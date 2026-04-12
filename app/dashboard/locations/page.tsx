'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Plus, Trash2, Building2, AlertCircle, X, Loader2, Lock, ExternalLink } from 'lucide-react';

interface Location {
  id: string;
  business_name: string;
  location_name: string | null;
  location_address: string | null;
  email: string;
  is_headquarters: boolean;
  created_at: string;
}

export default function LocationsPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [maxLocations, setMaxLocations] = useState(1);
  const [tier, setTier] = useState('starter');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }

    // Get merchant profile
    const res = await fetch(`/api/merchant?id=${session.user.id}`);
    const { merchant: m } = await res.json();
    setMerchant(m);

    // Get locations
    const locRes = await fetch(`/api/merchant/locations?merchantId=${session.user.id}`);
    const locData = await locRes.json();
    setLocations(locData.locations || []);
    setMaxLocations(locData.maxLocations || 1);
    setTier(locData.tier || 'starter');
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/merchant/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentMerchantId: merchant.id,
          locationName: formName,
          locationAddress: formAddress,
          email: formEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création');
        setSubmitting(false);
        return;
      }

      setShowModal(false);
      setFormName('');
      setFormAddress('');
      setFormEmail('');
      await loadData();
    } catch {
      setError('Erreur inattendue');
    }
    setSubmitting(false);
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Supprimer cet établissement ? Cette action est irréversible.')) return;
    setDeleting(locationId);

    try {
      const res = await fetch(
        `/api/merchant/locations?locationId=${locationId}&merchantId=${merchant.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
      await loadData();
    } catch {
      alert('Erreur inattendue');
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </DashboardLayout>
    );
  }

  const childLocations = locations.filter(l => !l.is_headquarters);
  const isFree = !tier || tier === 'starter' || tier === 'free';
  const isUnlimited = maxLocations === -1;

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Mes Établissements</h2>
            <p className="text-slate-500 mt-1">
              Gérez vos différents points de vente et succursales
            </p>
          </div>
          <Button
            onClick={() => setShowModal(true)}
            disabled={isFree}
            className="bg-pink-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            title={isFree ? 'Passez à un plan payant pour ajouter des établissements' : ''}
          >
            {isFree ? (
              <><Lock className="w-4 h-4 mr-2" /> Ajouter un établissement</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Ajouter un établissement</>
            )}
          </Button>
        </div>

        {/* Tier info */}
        {isFree ? (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  Votre plan <strong>Gratuit</strong> ne permet pas d&apos;ajouter d&apos;établissements supplémentaires.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Passez au plan <strong>Essentiel</strong> (1 établissement) ou <strong>Premium</strong> (3 établissements) pour gérer plusieurs points de vente.
                </p>
              </div>
              <a
                href="/dashboard/billing"
                className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap"
              >
                Voir les plans <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-pink-50 border-pink-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-pink-600 flex-shrink-0" />
              <p className="text-sm text-violet-800">
                Votre plan <strong className="capitalize">{tier === 'sur-mesure' ? 'Sur mesure' : tier}</strong> vous autorise{' '}
                <strong>{isUnlimited ? 'un nombre illimité d\'' : `${maxLocations} `}</strong>établissement(s) supplémentaire(s).
                Vous en utilisez <strong>{childLocations.length}</strong>.
              </p>
            </div>
          </Card>
        )}

        {/* Locations grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    loc.is_headquarters
                      ? 'bg-pink-100 text-violet-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {loc.is_headquarters ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {loc.location_name || loc.business_name}
                    </h3>
                    {loc.is_headquarters && (
                      <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                        Siège principal
                      </span>
                    )}
                  </div>
                </div>
                {!loc.is_headquarters && (
                  <button
                    onClick={() => handleDelete(loc.id)}
                    disabled={deleting === loc.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    {deleting === loc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {loc.location_address && (
                <p className="text-sm text-slate-500 mt-3 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {loc.location_address}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-2">{loc.email}</p>
            </Card>
          ))}
        </div>

        {locations.length === 0 && (
          <Card className="p-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucun établissement</h3>
            <p className="text-slate-500">Ajoutez votre premier établissement pour commencer.</p>
          </Card>
        )}
      </div>

      {/* Add Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Nouvel établissement</h3>
              <button
                onClick={() => { setShowModal(false); setError(''); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom de l&apos;établissement
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Succursale Centre-Ville"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Ex: 12 Rue de la Paix, Paris"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email de contact
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="contact@succursale.com"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowModal(false); setError(''); }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-pink-600 hover:bg-violet-700 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...</>
                  ) : (
                    'Créer'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

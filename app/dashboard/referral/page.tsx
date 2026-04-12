'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Copy, Check, MessageCircle, Users, CreditCard, Loader2 } from 'lucide-react';

interface Referral {
  id: string;
  referred_id: string;
  referred_business_name: string;
  status: string;
  credit_amount: number;
  created_at: string;
}

export default function ReferralPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/login');
      return;
    }

    const res = await fetch(`/api/merchant?id=${session.user.id}`);
    const { merchant: m } = await res.json();
    setMerchant(m);

    const refRes = await fetch(`/api/referral?merchantId=${session.user.id}`);
    const refData = await refRes.json();
    setReferralCode(refData.referralCode || '');
    setReferrals(refData.referrals || []);
    setTotalCredits(refData.totalCredits || 0);
    setLoading(false);
  };

  const copyCode = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const signupUrl = `${window.location.origin}/auth/signup?ref=${referralCode}`;
    const message = `Rejoins Qualee avec mon code de parrainage ${referralCode} et reçois 50 crédits offerts ! Inscris-toi ici : ${signupUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Parrainage</h2>
          <p className="text-slate-500 mt-1">
            Invitez d&apos;autres commerces et gagnez des crédits de campagne
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{referrals.length}</p>
                <p className="text-sm text-slate-500">Filleul(s)</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalCredits}</p>
                <p className="text-sm text-slate-500">Crédits gagnés</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">50</p>
                <p className="text-sm text-slate-500">Crédits par parrainage</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Referral Code */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Votre code de parrainage</h3>
          {referralCode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-50 border-2 border-dashed border-teal-300 rounded-xl px-6 py-4 text-center">
                  <span className="text-3xl font-bold tracking-widest text-teal-700">
                    {referralCode}
                  </span>
                </div>
                <Button
                  onClick={copyCode}
                  variant="outline"
                  className="h-14 px-4 border-teal-300 hover:bg-teal-50"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-teal-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-teal-600" />
                  )}
                </Button>
              </div>
              <Button
                onClick={shareWhatsApp}
                className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20bd5a] text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Partager par WhatsApp
              </Button>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              Votre code de parrainage sera disponible prochainement.
            </p>
          )}
        </Card>

        {/* How it works */}
        <Card className="p-6 bg-teal-50 border-teal-200">
          <h3 className="text-lg font-semibold text-teal-900 mb-3">Comment ça marche ?</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <p className="text-sm text-teal-800">Partagez votre code de parrainage avec un autre commerce</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <p className="text-sm text-teal-800">Votre filleul s&apos;inscrit avec votre code</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-teal-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <p className="text-sm text-teal-800">Vous recevez tous les deux <strong>50 crédits de campagne</strong> !</p>
            </div>
          </div>
        </Card>

        {/* Referrals List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Vos filleuls</h3>
          {referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-medium text-slate-500">Commerce</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500">Statut</th>
                    <th className="text-right py-3 px-2 font-medium text-slate-500">Crédits</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 px-2 font-medium text-slate-900">
                        {ref.referred_business_name}
                      </td>
                      <td className="py-3 px-2 text-slate-500">
                        {formatDate(ref.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ref.status === 'activated'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {ref.status === 'activated' ? 'Activé' : 'En attente'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-teal-600">
                        +{ref.credit_amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucun filleul pour le moment.</p>
              <p className="text-sm text-slate-400 mt-1">Partagez votre code pour commencer !</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

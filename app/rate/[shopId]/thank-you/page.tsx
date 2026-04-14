'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Heart, CheckCircle2, MessageSquare } from 'lucide-react';

interface Merchant {
  id: string;
  business_name: string;
  logo_url?: string;
}

function ThankYouContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const shopId = params.shopId as string;
  const lang = searchParams.get('lang') || 'fr';
  const isFr = lang === 'fr';

  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('merchants')
        .select('id, business_name, logo_url')
        .eq('id', shopId)
        .single();
      setMerchant(data);
    };
    load();
  }, [shopId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EB1E99] via-[#7209B7] to-[#3A0CA3] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="absolute top-10 -left-20 w-80 h-80 rounded-full bg-pink-400/20 blur-[100px]" />
      <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-violet-400/20 blur-[120px]" />

      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
        {/* Animated check icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#EB1E99] to-[#7209B7] rounded-full blur-xl opacity-40 animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#EB1E99] to-[#7209B7] flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-11 h-11 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Logo / Business name */}
        {merchant?.logo_url && (
          <img
            src={merchant.logo_url}
            alt={merchant.business_name}
            className="h-12 mx-auto mb-4 object-contain"
          />
        )}

        {/* Thank you heading */}
        <h1
          className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          {isFr ? 'Merci pour votre' : 'Thank you for your'}
          <br />
          <span className="bg-gradient-to-r from-[#EB1E99] to-[#7209B7] bg-clip-text text-transparent">
            {isFr ? 'retour précieux' : 'valuable feedback'}
          </span>
        </h1>

        {/* Message */}
        <div className="flex items-start gap-3 bg-gradient-to-br from-pink-50 to-violet-50 border border-pink-100 rounded-2xl p-5 mb-6 text-left">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <MessageSquare className="w-5 h-5 text-[#EB1E99]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {isFr ? 'Votre avis a été pris en compte' : 'Your feedback has been received'}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isFr
                ? `${merchant?.business_name || 'L\'équipe'} prend votre retour très au sérieux et mettra tout en œuvre pour améliorer votre prochaine expérience.`
                : `${merchant?.business_name || 'The team'} takes your feedback seriously and will work to improve your next experience.`}
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Heart className="w-4 h-4 text-[#EB1E99] fill-[#EB1E99]" />
          {isFr ? 'Votre satisfaction est notre priorité' : 'Your satisfaction is our priority'}
        </p>

        {/* Qualee footer */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {isFr ? 'Propulsé par' : 'Powered by'}{' '}
            <span className="font-bold bg-gradient-to-r from-[#EB1E99] to-[#7209B7] bg-clip-text text-transparent">
              Qualee
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return <ThankYouContent />;
}

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SelectLanguagePage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.shopId as string;

  useEffect(() => {
    router.replace(`/rate/${shopId}`);
  }, [shopId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-600 to-violet-700">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}

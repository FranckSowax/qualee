'use client';

import Image from 'next/image';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <Image
        src="/Logo Qualee pink violet.png"
        alt="Qualee"
        width={180}
        height={60}
        className="mb-8"
      />
      <h1 className="text-2xl font-bold text-violet-700 mb-3">
        Vous êtes hors ligne
      </h1>
      <p className="text-gray-500 text-center mb-8 max-w-sm">
        Vérifiez votre connexion internet et réessayez.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-lg bg-pink-600 hover:bg-violet-700 text-white font-medium transition-colors"
      >
        Réessayer
      </button>
    </div>
  );
}

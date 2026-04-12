'use client';

import React, { useState, useEffect } from 'react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const saveConsent = (preferences: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setVisible(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handleRefuse = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSaveCustom = () => {
    saveConsent({
      essential: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md rounded-t-2xl shadow-2xl border border-gray-200 p-5">
        {!showCustomize ? (
          <>
            <p className="text-gray-700 text-sm mb-4">
              Ce site utilise des cookies pour am&eacute;liorer votre exp&eacute;rience.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2 bg-pink-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Accepter tout
              </button>
              <button
                onClick={handleRefuse}
                className="px-5 py-2 border border-pink-600 text-violet-700 hover:bg-pink-50 text-sm font-semibold rounded-lg transition-colors"
              >
                Refuser
              </button>
              <button
                onClick={() => setShowCustomize(true)}
                className="px-3 py-2 text-pink-600 hover:text-violet-800 text-sm font-medium underline transition-colors"
              >
                Personnaliser
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-700 text-sm mb-4 font-semibold">
              G&eacute;rer vos pr&eacute;f&eacute;rences de cookies
            </p>
            <div className="space-y-3 mb-4">
              {/* Essential - always on */}
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Essentiels</span>
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="w-5 h-5 accent-pink-600 rounded cursor-not-allowed"
                />
              </label>
              {/* Analytics */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Analytiques</span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="w-5 h-5 accent-pink-600 rounded cursor-pointer"
                />
              </label>
              {/* Marketing */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-700">Marketing</span>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="w-5 h-5 accent-pink-600 rounded cursor-pointer"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveCustom}
                className="px-5 py-2 bg-pink-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Retour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

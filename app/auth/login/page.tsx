'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

function AuthBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/bg-pattern-1.jpg)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#EB1E99]/85 to-[#7209B7]/80 backdrop-blur-[2px]" />
    </>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('/dashboard');

  useEffect(() => {
    // Récupérer l'URL de redirection depuis les paramètres
    const redirect = searchParams.get('redirect');
    if (redirect) {
      // Sécurité : s'assurer que la redirection est locale
      if (redirect.startsWith('/')) {
        setRedirectUrl(redirect);
      }
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('[LOGIN] Tentative de connexion pour:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[LOGIN] Réponse Supabase:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id,
        error: error?.message
      });

      if (error) {
        console.error('[LOGIN] Erreur Supabase:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Log les cookies Supabase présents
        const allCookies = document.cookie.split(';').map(c => c.trim());
        const supabaseCookies = allCookies.filter(c => c.startsWith('sb-'));
        console.log('[LOGIN] Tous les cookies:', allCookies);
        console.log('[LOGIN] Cookies Supabase:', supabaseCookies);

        // Attendre que les cookies soient bien écrits par @supabase/ssr
        await new Promise(resolve => setTimeout(resolve, 500));

        // Re-vérifier les cookies après le délai
        const cookiesAfterWait = document.cookie.split(';').map(c => c.trim());
        const supabaseCookiesAfterWait = cookiesAfterWait.filter(c => c.startsWith('sb-'));
        console.log('[LOGIN] Cookies Supabase après attente:', supabaseCookiesAfterWait);

        // Vérifier que la session est bien active
        const { data: sessionCheck } = await supabase.auth.getSession();
        console.log('[LOGIN] Vérification session:', {
          hasSession: !!sessionCheck.session,
          userId: sessionCheck.session?.user?.id,
          expiresAt: sessionCheck.session?.expires_at
        });

        if (!sessionCheck.session) {
          console.error('[LOGIN] Session perdue après login!');
          setError('Session perdue. Veuillez réessayer.');
          setLoading(false);
          return;
        }

        console.log('[LOGIN] Redirection vers:', redirectUrl);

        // Utiliser window.location.replace pour une navigation propre
        window.location.replace(redirectUrl);
      } else {
        console.error('[LOGIN] Pas de session retournée');
        setError('Connexion échouée. Veuillez réessayer.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[LOGIN] Exception:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectUrl}`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4">
        <AuthBackground />
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Vérifiez votre email</h1>
          <p className="text-gray-600 mb-6">
            Un lien magique a été envoyé à <strong>{email}</strong>. Cliquez dessus pour vous connecter.
          </p>
          <Button onClick={() => setMagicLinkSent(false)} variant="outline">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Qualee</h1>
        <p className="text-center text-gray-600 mb-8">Connexion commerçant</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <Input
            type="email"
            label="Adresse email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@moncommerce.com"
            required
          />

          <Input
            type="password"
            label="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou</span>
          </div>
        </div>

        <Button
          onClick={handleMagicLink}
          disabled={loading || !email}
          variant="outline"
          className="w-full"
        >
          Envoyer un lien magique
        </Button>

        <p className="text-center text-sm text-gray-600 mt-6">
          Pas encore de compte ?{' '}
          <a href="/auth/signup" className="text-[#FF6F61] font-semibold hover:underline">
            S'inscrire
          </a>
        </p>
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}

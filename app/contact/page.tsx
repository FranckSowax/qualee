'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Mail,
  MessageCircle,
  Phone,
  MapPin,
  Send,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    establishments: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'contact_page' }),
      });

      if (!response.ok) throw new Error('Échec de l\'envoi');
      setSubmitted(true);
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const NAV = [
    { label: 'Accueil', href: '/' },
    { label: 'Tarifs', href: '/landing#tarifs' },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ═══════════ NAV ═══════════ */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-[0_1px_30px_rgba(0,0,0,0.04)]' : 'bg-white/60 backdrop-blur-md'}`}>
        <nav className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-[72px]">
          <Link href="/">
            <img src="/Logo Qualee pink violet.png" alt="Qualee" className="h-9 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {NAV.map(l => (
              <Link key={l.href} href={l.href} className="nav-link-underline text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors">{l.label}</Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium px-4 py-2 rounded-xl text-gray-700 hover:text-violet-700 transition-colors">Connexion</Link>
            <Link href="/auth/signup" className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white hover:shadow-lg hover:shadow-pink-500/25 transition-all">
              Essai gratuit <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2">
            {mobileMenu ? <X className="text-gray-900" /> : <Menu className="text-gray-900" />}
          </button>
        </nav>
        {mobileMenu && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 px-5 pb-6 pt-2">
            {NAV.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileMenu(false)} className="block py-3 text-gray-700 font-medium border-b border-gray-100">{l.label}</Link>
            ))}
            <div className="flex gap-3 mt-4">
              <Link href="/auth/login" className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium">Connexion</Link>
              <Link href="/auth/signup" className="flex-1 text-center py-2.5 rounded-xl bg-pink-600 text-white font-semibold">Essai gratuit</Link>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-32 pb-16 px-5 sm:px-8 overflow-hidden">
        <div className="absolute top-20 -left-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-pink-100/40 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full bg-violet-100/30 blur-[100px]" />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-violet-700 text-sm font-medium">
            <MessageCircle className="w-4 h-4" />
            Contactez-nous
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
            Parlons de votre
            {' '}<span className="bg-gradient-to-r from-[#EB1E99] to-[#7209B7] bg-clip-text text-transparent">projet</span>
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Une question, un besoin spécifique ou envie de découvrir Qualee ? Notre équipe vous répond sous 24h.
          </p>
        </div>
      </section>

      {/* ═══════════ FORM + INFO ═══════════ */}
      <section className="pb-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-10">

            {/* Left — Form (3 cols) */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div className="p-12 rounded-2xl bg-white border border-gray-200 shadow-lg text-center">
                  <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-5">
                    <Check className="w-8 h-8 text-pink-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Message envoyé !</h2>
                  <p className="text-gray-500 mb-8">Nous vous répondrons dans les plus brefs délais.</p>
                  <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white font-semibold hover:shadow-lg transition-all">
                    Retour à l'accueil <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 sm:p-8 md:p-10 rounded-2xl bg-white border border-gray-200 shadow-lg space-y-5 sm:space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Envoyez-nous un message</h2>
                    <p className="text-sm text-gray-400 mt-1">Tous les champs marqués * sont obligatoires.</p>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Jean Dupont"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="jean@exemple.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'entreprise *</label>
                      <input
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Mon Commerce"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+241 XX XX XX XX"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre d'établissements</label>
                    <select
                      value={formData.establishments}
                      onChange={(e) => setFormData({ ...formData, establishments: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all"
                    >
                      <option value="">Sélectionnez</option>
                      <option value="1">1 établissement</option>
                      <option value="2-5">2 à 5</option>
                      <option value="6-10">6 à 10</option>
                      <option value="11-25">11 à 25</option>
                      <option value="25+">Plus de 25</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Votre message</label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Décrivez votre besoin, posez vos questions..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white font-semibold text-base hover:shadow-xl hover:shadow-pink-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer le message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right — Info (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Features card */}
              <div className="p-8 rounded-2xl bg-[#1B1B1F] text-white">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-300" />
                  </div>
                  <h3 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>Pourquoi Qualee ?</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    'Roue de la fortune gamifiée',
                    'Carte de fidélité digitale',
                    'Campagnes WhatsApp ciblées',
                    'Dashboard analytics complet',
                    'Mise en place en 3 minutes',
                    'Support dédié inclus',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-white/70 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact info */}
              <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-5" style={{ fontFamily: 'Sora, sans-serif' }}>Contact direct</h3>
                <div className="space-y-4">
                  <a href="mailto:contact@qualee.fr" className="flex items-center gap-3 text-gray-500 hover:text-pink-600 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                      <Mail className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-700">contact@qualee.fr</p>
                    </div>
                  </a>
                  <a href="https://wa.me/24177000000" className="flex items-center gap-3 text-gray-500 hover:text-green-600 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">WhatsApp</p>
                      <p className="text-sm font-medium text-gray-700">+241 77 00 00 00</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 text-gray-500">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Adresse</p>
                      <p className="text-sm font-medium text-gray-700">Libreville, Gabon</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response time */}
              <div className="p-5 rounded-2xl bg-pink-50 border border-pink-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Réponse sous 24h</p>
                  <p className="text-xs text-gray-500">Notre équipe vous accompagne du lundi au vendredi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#1B1B1F] border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src="/Logo Qualee wht.png" alt="Qualee" className="h-8 w-auto" />
            <p className="text-white/30 text-xs">&copy; {new Date().getFullYear()} Qualee. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

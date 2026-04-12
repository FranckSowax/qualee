'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SoftwareApplicationJsonLd } from '@/components/seo/JsonLd';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  QrCode,
  Gift,
  BarChart3,
  Star,
  Users,
  MessageCircle,
  Shield,
  Zap,
  Check,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Award,
  Menu,
  X,
  Play,
  Clock,
  ChevronRight,
  Flame,
  Quote,
} from 'lucide-react';

// ─── ANIMATION VARIANTS ──────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: EASE },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: EASE },
  }),
};

function Reveal({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section ref={ref} id={id} className={className}>
      <motion.div initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}>
        {children}
      </motion.div>
    </section>
  );
}

function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(value / 90));
    const id = setInterval(() => { n += step; if (n >= value) { setCount(value); clearInterval(id); } else setCount(n); }, 16);
    return () => clearInterval(id);
  }, [inView, value]);
  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── MAIN PAGE ──────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const NAV = [
    { label: 'Bénéfices', href: '#benefices' },
    { label: 'Comment ça marche', href: '#comment' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'Témoignages', href: '#temoignages' },
  ];

  // ─── DATA ─────────────────────────────────────
  const STATS = [
    { value: 67, suffix: '%', label: "d'avis Google en plus", icon: Star },
    { value: 45, suffix: '%', label: 'de clients qui reviennent', icon: Users },
    { value: 3, suffix: 'min', label: 'de mise en place', icon: Clock },
  ];

  const BENEFITS = [
    {
      icon: TrendingUp,
      title: 'Boostez votre chiffre d\'affaires',
      desc: 'Augmentez la fréquence des visites et le panier moyen grâce à la fidélisation gamifiée.',
      stat: '+34%',
      statLabel: 'de CA moyen',
    },
    {
      icon: Award,
      title: 'Récompensez la fidélité',
      desc: 'Carte digitale avec points, paliers et récompenses personnalisées. Vos clients cumulent à chaque visite.',
      stat: '×2.5',
      statLabel: 'de rétention',
    },
    {
      icon: MessageCircle,
      title: 'Marketing WhatsApp',
      desc: 'Campagnes ciblées envoyées directement sur le téléphone de vos clients. Taux d\'ouverture record.',
      stat: '92%',
      statLabel: 'taux d\'ouverture',
    },
  ];

  const BEFORE_AFTER = {
    before: ['Des clients qui partent sans laisser de trace', 'Avis Google stagnants', 'Aucun fichier client exploitable', 'Campagnes marketing au hasard'],
    after: ['Clients fidèles qui reviennent et recommandent', '+67% d\'avis Google en 1 mois', 'Base client qualifiée et enrichie', 'Campagnes WhatsApp ciblées et efficaces'],
  };

  const STEPS = [
    { step: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous en 2 minutes. Personnalisez votre roue, vos lots et votre carte de fidélité aux couleurs de votre établissement.', icon: Sparkles },
    { step: '02', title: 'Déployez le QR Code', desc: 'Imprimez votre QR code unique et placez-le sur vos tables, comptoir ou vitrine. Vos clients le scannent pour jouer.', icon: QrCode },
    { step: '03', title: 'Engagez & fidélisez', desc: 'Vos clients tournent la roue, cumulent des points, laissent des avis. Les données remontent dans votre dashboard.', icon: Gift },
    { step: '04', title: 'Analysez & optimisez', desc: 'Suivez vos métriques en temps réel : avis, visites, fidélité, campagnes. Ajustez votre stratégie en un clic.', icon: BarChart3 },
  ];

  const CASE_STUDIES = [
    {
      name: 'Restaurant Le Baobab',
      sector: 'Restauration — Douala',
      avatar: '🍽️',
      quote: 'Nos avis Google ont doublé en 3 semaines. Les clients adorent la roue et reviennent plus souvent !',
      metrics: [
        { label: 'Avis Google', before: '12', after: '47', period: '1 mois' },
        { label: 'Clients fidélisés', before: '—', after: '124', period: '2 mois' },
      ],
    },
    {
      name: 'Hôtel Akwa Palace',
      sector: 'Hôtellerie — Yaoundé',
      avatar: '🏨',
      quote: 'La carte de fidélité digitale a transformé notre relation client. Le scan QR à la réception est devenu un rituel.',
      metrics: [
        { label: 'Taux de retour', before: '18%', after: '41%', period: '3 mois' },
        { label: 'Satisfaction', before: '3.8★', after: '4.7★', period: '2 mois' },
      ],
    },
    {
      name: 'Boutique Afro Chic',
      sector: 'Mode — Abidjan',
      avatar: '👗',
      quote: 'Simple, efficace, et nos clients en parlent autour d\'eux. Le bouche-à-oreille a explosé.',
      metrics: [
        { label: 'Panier moyen', before: '35 €', after: '52 €', period: '1 mois' },
        { label: 'Nouveaux clients', before: '—', after: '+85', period: '6 sem.' },
      ],
    },
  ];

  const PLANS = [
    {
      name: 'Découverte', price: 'Gratuit', period: '14 jours', desc: 'Testez toutes les fonctionnalités',
      features: ['1 établissement', 'Roue de la fortune', 'QR Code personnalisé', 'Statistiques de base', 'Support email'],
      cta: 'Créer mon compte gratuit', popular: false, accent: false,
    },
    {
      name: 'Essentiel', price: '15', period: 'EUR / mois', desc: 'Le plus choisi par nos clients',
      features: ['1 établissement', 'Roue + Carte fidélité', 'QR Code personnalisé', 'Statistiques avancées', 'Campagnes WhatsApp', 'Support prioritaire'],
      cta: 'Activer mon essai', popular: true, accent: false,
    },
    {
      name: 'Premium', price: '39', period: 'EUR / mois', desc: 'Performance maximale',
      features: ['3 établissements', 'Toutes les fonctionnalités', 'Branding personnalisé', 'Wallet Apple & Google', 'Analytics avancés', 'Gestionnaire dédié'],
      cta: 'Activer mon essai', popular: false, accent: false,
    },
    {
      name: 'Sur mesure', price: 'Devis', period: '', desc: 'Réseaux multi-sites',
      features: ['Établissements illimités', 'API & intégrations', 'White label', 'SLA garanti', 'Accompagnement stratégique', 'Formation équipes'],
      cta: 'Nous contacter', popular: false, accent: true,
    },
  ];

  const ALL_PLANS_INCLUDE = [
    'Essai gratuit 14 jours', 'Sans engagement', 'Mise en place en 24h', 'Données hébergées en sécurité',
  ];

  const FAQS = [
    { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez upgrader ou downgrader à tout moment. Le changement prend effet immédiatement et la facturation est ajustée au prorata.' },
    { q: 'L\'essai gratuit inclut-il toutes les fonctionnalités ?', a: 'Absolument ! Pendant 14 jours, vous avez accès à toutes les fonctionnalités du plan Essentiel sans aucune restriction ni carte bancaire requise.' },
    { q: 'Y a-t-il des frais cachés ?', a: 'Aucun. Le prix affiché est le prix final. Pas de frais de mise en service, pas de commission sur vos ventes, pas de surcoût.' },
    { q: 'Combien de temps pour configurer Qualee ?', a: '3 minutes. Créez votre compte, personnalisez votre roue et vos lots, imprimez votre QR code. Notre équipe vous accompagne gratuitement si besoin.' },
    { q: 'Mes clients ont besoin d\'une app ?', a: 'Non, zéro installation. Vos clients scannent un QR code avec l\'appareil photo de leur téléphone. Ça marche sur tous les smartphones.' },
    { q: 'Proposez-vous un accompagnement ?', a: 'Oui ! Notre équipe vous accompagne gratuitement pour la mise en place : configuration, personnalisation, déploiement des QR codes, formation de vos équipes.' },
  ];

  const TESTIMONIALS = [
    { name: 'Amadou K.', role: 'Gérant, Le Baobab', city: 'Douala', quote: 'En 3 semaines, nos avis Google sont passés de 12 à 47. Les clients adorent tourner la roue !', stars: 5 },
    { name: 'Fatou D.', role: 'Directrice, Hôtel Akwa', city: 'Yaoundé', quote: 'La carte fidélité digitale est devenue un argument de vente pour nos équipes à la réception.', stars: 5 },
    { name: 'Jean-Pierre M.', role: 'Propriétaire, Afro Chic', city: 'Abidjan', quote: 'Le retour sur investissement est visible dès le premier mois. Simple et redoutablement efficace.', stars: 5 },
    { name: 'Marie-Claire A.', role: 'Gérante, Beauté Divine', city: 'Dakar', quote: 'Mes clientes reviennent plus souvent et recommandent le salon à leurs amies. C\'est magique.', stars: 5 },
  ];

  return (
    <div className="relative overflow-hidden bg-white">
      <SoftwareApplicationJsonLd />

      {/* ═══════════ NAVIGATION ═══════════ */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-[0_1px_30px_rgba(0,0,0,0.04)]' : 'bg-white/60 backdrop-blur-md'}`}>
        <nav className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center group">
            <img src="/Logo Qualee pink violet.png" alt="Qualee" className="h-9 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="nav-link-underline text-sm font-medium text-gray-600 transition-colors hover:text-pink-600">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium px-4 py-2 rounded-xl text-gray-700 hover:text-violet-700 transition-colors">Connexion</Link>
            <Link href="/auth/signup" className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white hover:shadow-lg hover:shadow-pink-500/25 hover:-translate-y-0.5 transition-all">
              Essai gratuit <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2">
            {mobileMenu ? <X className="text-gray-900" /> : <Menu className="text-gray-900" />}
          </button>
        </nav>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 px-5 pb-6 pt-2">
              {NAV.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMobileMenu(false)} className="block py-3 text-gray-700 font-medium border-b border-gray-100">{l.label}</a>
              ))}
              <div className="flex gap-3 mt-4">
                <Link href="/auth/login" className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium">Connexion</Link>
                <Link href="/auth/signup" className="flex-1 text-center py-2.5 rounded-xl bg-pink-600 text-white font-semibold">Essai gratuit</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-center bg-white overflow-hidden">
        <div className="absolute top-20 -left-40 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-pink-100/40 blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full bg-violet-100/30 blur-[100px]" />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div>
              {/* Social proof badge */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-violet-700 text-sm font-medium">
                  <Check className="w-3.5 h-3.5" />
                  500+ commerces nous font confiance
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.12 }}
                className="mt-7 text-3xl sm:text-4xl md:text-5xl lg:text-[4rem] font-extrabold leading-[1.08] tracking-tight text-gray-900"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Vos clients reviennent.
                <br />
                <span className="bg-gradient-to-r from-[#EB1E99] via-[#7209B7] to-[#3A0CA3] bg-clip-text text-transparent">
                  Automatiquement.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="mt-6 text-lg text-gray-500 max-w-xl leading-relaxed"
              >
                Roue de la fortune, carte fidélité digitale, avis Google, campagnes WhatsApp — tout ce qu'il faut pour transformer chaque visiteur en client fidèle.{' '}
                <span className="text-gray-800 font-semibold">Zéro app, zéro friction.</span>
              </motion.p>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.38 }}
                className="mt-8 flex flex-wrap gap-4 sm:gap-6"
              >
                {STATS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                        +<Counter value={s.value} suffix={s.suffix} />
                      </span>
                      <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="mt-8 flex flex-wrap gap-4"
              >
                <Link href="/auth/signup" className="animate-cta-glow group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white font-semibold text-base hover:shadow-2xl hover:shadow-pink-500/25 hover:-translate-y-0.5 hover:scale-[1.03] transition-all">
                  Créer mon compte gratuit
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/contact" className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:border-pink-300 hover:text-violet-700 hover:bg-pink-50/50 transition-all">
                  <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Découvrir en 2 min
                </Link>
              </motion.div>

              {/* Urgency */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-6 flex items-center gap-2 text-sm text-gray-400"
              >
                <Flame className="w-4 h-4 text-orange-400" />
                <span>12 commerces ont rejoint Qualee cette semaine</span>
              </motion.div>
            </div>

            {/* Hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 40 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: EASE }}
              className="relative flex items-center justify-center"
            >
              <img src="/hero-cartelle.png" alt="Qualee — Roue, carte fidélité, QR code, WhatsApp" className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl drop-shadow-2xl animate-hero-float-product" />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ LOGOS / SOCIAL PROOF BAR ═══════════ */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/50 overflow-hidden">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-6 text-center">Ils nous font confiance</p>
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 to-transparent z-10" />
          {/* Scrolling logos */}
          <div className="animate-scroll-logos flex items-center gap-16 whitespace-nowrap w-max">
            {[...Array(2)].map((_, rep) => (
              <div key={rep} className="flex items-center gap-16">
                {['Restaurant Le Baobab', 'Hôtel Akwa Palace', 'Boutique Afro Chic', 'Salon Beauté Divine', 'Café de la Paix', 'Market Express', 'Boulangerie Étoile', 'Spa Zenith'].map((name, i) => (
                  <span key={i} className="text-gray-300 hover:text-gray-400 font-bold text-lg tracking-tight transition-colors cursor-default" style={{ fontFamily: 'Sora, sans-serif' }}>{name}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BÉNÉFICES (3 cards + stats) ═══════════ */}
      <Reveal id="benefices" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 text-violet-700 text-sm font-semibold">
                <Zap className="w-4 h-4" /> Bénéfices
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              La fidélité, <span className="bg-gradient-to-r from-[#EB1E99] to-[#7209B7] bg-clip-text text-transparent">sans friction</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-gray-500">
              Des résultats concrets dès le premier mois pour votre établissement.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="group relative p-8 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:shadow-pink-100/50 hover:border-pink-200 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EB1E99] to-[#7209B7] flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-105 transition-transform">
                    <b.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-pink-600" style={{ fontFamily: 'Sora, sans-serif' }}>{b.stat}</span>
                    <p className="text-xs text-gray-400">{b.statLabel}</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{b.title}</h3>
                <p className="mt-2 text-gray-500 leading-relaxed text-[15px]">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ═══════════ AVANT / APRÈS ═══════════ */}
      <Reveal className="py-24 px-5 sm:px-8 bg-gray-50/80">
        <div className="max-w-5xl mx-auto">
          <motion.h2 variants={fadeUp} className="text-center text-3xl sm:text-4xl font-extrabold text-gray-900 mb-14" style={{ fontFamily: 'Sora, sans-serif' }}>
            Comment ça transforme votre business
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before */}
            <motion.div variants={fadeUp} custom={0} className="p-8 rounded-2xl bg-white border border-red-100">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-bold text-red-500 uppercase tracking-wide">Avant Qualee</span>
              </div>
              <ul className="space-y-4">
                {BEFORE_AFTER.before.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
                    <span className="text-gray-500">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* After */}
            <motion.div variants={fadeUp} custom={1} className="p-8 rounded-2xl bg-white border border-pink-100 shadow-lg shadow-pink-50">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span className="text-sm font-bold text-pink-600 uppercase tracking-wide">Avec Qualee</span>
              </div>
              <ul className="space-y-4">
                {BEFORE_AFTER.after.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </Reveal>

      {/* ═══════════ AUTOMATISATIONS INTELLIGENTES ═══════════ */}
      <Reveal className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-semibold">
                <Zap className="w-4 h-4" />
                Automatisations
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              Qualee travaille pour vous,
              {' '}<span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">même quand vous dormez</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-5 text-lg text-gray-500 leading-relaxed">
              Des messages automatiques envoyés au bon moment, au bon client. Vous configurez une fois, Qualee s'occupe du reste.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Birthday */}
            <motion.div variants={fadeUp} custom={0} className="group p-7 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center shrink-0 text-2xl">🎂</div>
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Message d'anniversaire</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">Chaque client reçoit automatiquement un message WhatsApp le jour de son anniversaire avec un cadeau ou une offre spéciale.</p>
                  <div className="mt-3 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-400 italic">
                    "Joyeux anniversaire Amadou ! 🎉 Le Baobab vous offre un dessert gratuit pour fêter ça !"
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Inactivity */}
            <motion.div variants={fadeUp} custom={1} className="group p-7 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 text-2xl">👋</div>
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Rappel de visite</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">Un client n'est pas revenu depuis 30 jours ? Qualee lui envoie un message personnalisé pour le faire revenir avec ses points de fidélité.</p>
                  <div className="mt-3 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-400 italic">
                    "Vous nous manquez chez Afro Chic ! 💚 Vos 120 points vous attendent. Revenez en profiter !"
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Points milestone */}
            <motion.div variants={fadeUp} custom={2} className="group p-7 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center shrink-0 text-2xl">🏆</div>
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Palier de points atteint</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">Quand un client franchit un palier (50, 100, 200, 500 points), il reçoit une félicitation + invitation à découvrir ses récompenses.</p>
                  <div className="mt-3 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-400 italic">
                    "Félicitations Marie ! 🎉 Vous avez atteint 200 points chez Beauté Divine. Découvrez vos récompenses !"
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Coupon expiry */}
            <motion.div variants={fadeUp} custom={3} className="group p-7 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0 text-2xl">⏰</div>
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>Coupon qui expire</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">Un client a gagné un coupon mais ne l'a pas utilisé ? 6 heures avant l'expiration, Qualee lui envoie un rappel pour ne pas le perdre.</p>
                  <div className="mt-3 px-3 py-2 rounded-lg bg-gray-50 text-xs text-gray-400 italic">
                    "⏰ Votre coupon -20% chez Le Baobab expire bientôt ! Utilisez-le avant qu'il ne soit trop tard."
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom note */}
          <motion.div variants={fadeUp} custom={4} className="mt-10 text-center">
            <p className="text-sm text-gray-400">
              Toutes les automatisations sont <span className="text-gray-600 font-medium">configurables et désactivables</span> depuis votre dashboard.
              Vos clients reçoivent uniquement les messages pertinents.
            </p>
          </motion.div>
        </div>
      </Reveal>

      {/* ═══════════ WHATSAPP CAMPAIGNS SECTION ═══════════ */}
      <Reveal className="py-24 px-5 sm:px-8 bg-gradient-to-b from-white via-green-50/30 to-white">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold">
                <MessageCircle className="w-4 h-4" />
                Campagnes WhatsApp
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              Parlez à des clients qui vous
              {' '}<span className="bg-gradient-to-r from-green-600 to-pink-500 bg-clip-text text-transparent">connaissent déjà</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-5 text-lg text-gray-500 leading-relaxed">
              Vos clients ont scanné votre QR code, joué à la roue, cumulé des points. WhatsApp devient le canal le plus puissant pour les faire revenir.
            </motion.p>
          </div>

          {/* Image + Stats row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left — Mockup image */}
            <motion.div variants={fadeUp} custom={1} className="relative flex justify-center">
              <img
                src="/whatsapp-mockup.png"
                alt="Exemples de campagnes WhatsApp — Restaurant, Hôtel, Salon de beauté"
                className="w-full max-w-lg drop-shadow-2xl"
              />
            </motion.div>

            {/* Right — Stats + key arguments */}
            <div>
              <motion.p variants={fadeUp} custom={2} className="text-gray-600 leading-relaxed mb-8">
                Contrairement aux pubs Facebook ou aux emails que personne ne lit, vos campagnes WhatsApp touchent des clients qui ont <span className="text-gray-900 font-semibold">déjà franchi votre porte</span>. Audience 100% opt-in, taux d'ouverture record, boutons cliquables vers vos liens.
              </motion.p>

              {/* Stats */}
              <motion.div variants={fadeUp} custom={3} className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-white border border-green-100 shadow-sm">
                  <p className="text-3xl font-extrabold text-green-600" style={{ fontFamily: 'Sora, sans-serif' }}>98%</p>
                  <p className="text-sm text-gray-500 mt-1">Taux d'ouverture</p>
                  <p className="text-xs text-gray-400">vs 20% pour l'email</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-green-100 shadow-sm">
                  <p className="text-3xl font-extrabold text-green-600" style={{ fontFamily: 'Sora, sans-serif' }}>45%</p>
                  <p className="text-sm text-gray-500 mt-1">Taux de clic</p>
                  <p className="text-xs text-gray-400">vs 2-5% pour l'email</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-green-100 shadow-sm">
                  <p className="text-3xl font-extrabold text-green-600" style={{ fontFamily: 'Sora, sans-serif' }}>×3</p>
                  <p className="text-sm text-gray-500 mt-1">Plus de conversions</p>
                  <p className="text-xs text-gray-400">que les canaux traditionnels</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-green-100 shadow-sm">
                  <p className="text-3xl font-extrabold text-green-600" style={{ fontFamily: 'Sora, sans-serif' }}>5×</p>
                  <p className="text-sm text-gray-500 mt-1">Moins cher</p>
                  <p className="text-xs text-gray-400">qu'une pub Facebook/Google</p>
                </div>
              </motion.div>

              {/* Button examples */}
              <motion.div variants={fadeUp} custom={4}>
                <p className="text-sm font-semibold text-gray-700 mb-3">Chaque message peut contenir des boutons vers vos liens :</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-green-100 text-xs shadow-sm">
                    <span className="text-green-600 font-bold">🍽️</span>
                    <span className="text-gray-600">"Voir le menu"</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-green-100 text-xs shadow-sm">
                    <span className="text-green-600 font-bold">🏨</span>
                    <span className="text-gray-600">"Réserver maintenant"</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-green-100 text-xs shadow-sm">
                    <span className="text-green-600 font-bold">👗</span>
                    <span className="text-gray-600">"Voir la promo"</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-green-100 text-xs shadow-sm">
                    <span className="text-green-600 font-bold">💇</span>
                    <span className="text-gray-600">"Prendre RDV"</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Features row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={fadeUp} custom={1} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900">Audience 100% opt-in</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">Vos destinataires ont volontairement scanné votre QR code. Pas de spam — chaque message touche un client qui vous connaît.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900">Texte, image, vidéo & boutons</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">Photo de votre plat du jour, vidéo de votre collection, promo flash — avec jusqu'à 3 boutons d'action cliquables par message.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={3} className="p-6 rounded-2xl bg-white border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900">Rapports en temps réel</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">Suivez la délivrance, l'ouverture et les clics de chaque campagne. Optimisez vos messages pour un ROI maximal.</p>
            </motion.div>
          </div>

          {/* Bottom CTA */}
          <motion.div variants={fadeUp} custom={5} className="mt-14 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-green-50 to-pink-50 border border-green-100">
              <p className="text-gray-600 text-sm">
                <span className="text-gray-900 font-semibold">Forfaits à partir de 12 EUR</span> pour 100 messages. Sans abonnement.
              </p>
              <Link href="/auth/signup" className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors whitespace-nowrap">
                Essayer gratuitement
              </Link>
            </div>
          </motion.div>
        </div>
      </Reveal>

      {/* ═══════════ COMMENT ÇA MARCHE (4 étapes timeline) ═══════════ */}
      <Reveal id="comment" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 text-violet-700 text-sm font-semibold">
                <Sparkles className="w-4 h-4" /> Comment ça marche
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Opérationnel en <span className="bg-gradient-to-r from-[#EB1E99] to-[#7209B7] bg-clip-text text-transparent">4 étapes</span>
            </motion.h2>
          </div>

          {/* Timeline */}
          <div className="relative max-w-3xl mx-auto">
            {/* Vertical line */}
            <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-pink-200 via-violet-200 to-pink-100" />

            <div className="space-y-8">
              {STEPS.map((s, i) => (
                <motion.div key={i} variants={fadeUp} custom={i} className="group relative flex items-start gap-6 md:pl-0">
                  {/* Step number circle */}
                  <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EB1E99] to-[#7209B7] flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0 group-hover:scale-110 transition-transform">
                    <s.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-pink-600 uppercase tracking-widest">Étape {s.step}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{s.title}</h3>
                    <p className="mt-2 text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Help block */}
          <motion.div variants={fadeUp} custom={5} className="mt-14 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-pink-50 border border-pink-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-pink-600" />
                </div>
                <p className="text-gray-600 text-sm"><span className="text-gray-900 font-semibold">Besoin d'aide ?</span> Notre équipe vous accompagne à chaque étape.</p>
              </div>
              <Link href="/contact" className="px-5 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors whitespace-nowrap">
                Parler à un expert
              </Link>
            </div>
          </motion.div>
        </div>
      </Reveal>

      {/* ═══════════ CAS D'ÉTUDE / RÉSULTATS ═══════════ */}
      <Reveal className="py-24 px-5 sm:px-8 bg-gray-50/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 text-violet-700 text-sm font-semibold">
                <TrendingUp className="w-4 h-4" /> Résultats concrets
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-3xl sm:text-4xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Ce que nos clients obtiennent
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CASE_STUDIES.map((c, i) => (
              <motion.div key={i} variants={scaleIn} custom={i} className="p-7 rounded-2xl bg-white border border-gray-100 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl">{c.avatar}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.sector}</p>
                  </div>
                </div>

                {/* Metrics before/after */}
                <div className="space-y-3 mb-5">
                  {c.metrics.map((m, mi) => (
                    <div key={mi} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                      <span className="text-xs font-medium text-gray-500">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{m.before}</span>
                        <ArrowRight className="w-3 h-3 text-pink-500" />
                        <span className="text-sm font-bold text-pink-600">{m.after}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-gray-500 text-sm leading-relaxed italic">"{c.quote}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ═══════════ TARIFS ═══════════ */}
      <Reveal id="tarifs" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-6">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 text-violet-700 text-sm font-semibold">Tarifs</span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Des tarifs simples et transparents
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-gray-500">
              Commencez gratuitement. Pas de frais cachés. Sans engagement.
            </motion.p>
          </div>

          {/* All plans include */}
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-12">
            {ALL_PLANS_INCLUDE.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm text-gray-500">
                <Check className="w-4 h-4 text-pink-500" />{f}
              </span>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                custom={i}
                className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? 'bg-[#1B1B1F] border-pink-500/30 shadow-2xl shadow-violet-900/20 text-white ring-2 ring-pink-500/20'
                    : plan.accent
                    ? 'bg-gradient-to-br from-pink-600 to-violet-600 border-transparent text-white shadow-xl shadow-pink-500/20'
                    : 'bg-white border-gray-200 hover:border-pink-200 hover:shadow-xl hover:shadow-pink-100/50'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white text-xs font-bold shadow-lg">
                    Le plus populaire
                  </span>
                )}

                <h3 className={`text-lg font-bold ${plan.popular || plan.accent ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Sora, sans-serif' }}>{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.popular ? 'text-white/50' : plan.accent ? 'text-white/70' : 'text-gray-500'}`}>{plan.desc}</p>

                <div className="mt-6">
                  <span className={`text-3xl font-extrabold ${plan.popular || plan.accent ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Sora, sans-serif' }}>{plan.price}</span>
                  {plan.period && <span className={`ml-1 text-sm ${plan.popular ? 'text-white/40' : plan.accent ? 'text-white/60' : 'text-gray-400'}`}>{plan.period}</span>}
                </div>

                <ul className="mt-7 space-y-3 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.popular ? 'text-violet-400' : plan.accent ? 'text-white/80' : 'text-pink-500'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-white/70' : plan.accent ? 'text-white/80' : 'text-gray-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.accent ? '/contact' : '/auth/signup'}
                  className={`mt-8 block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular ? 'bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white hover:shadow-lg hover:shadow-pink-500/30'
                    : plan.accent ? 'bg-white text-violet-700 hover:bg-white/90'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Guarantee */}
          <motion.div variants={fadeUp} custom={5} className="mt-10 text-center">
            <p className="inline-flex items-center gap-2 text-sm text-gray-400">
              <Shield className="w-4 h-4 text-pink-500" />
              14 jours satisfait ou remboursé — Annulez en un clic
            </p>
          </motion.div>
        </div>
      </Reveal>

      {/* ═══════════ FAQ ═══════════ */}
      <Reveal className="py-24 px-5 sm:px-8 bg-gray-50/80">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Questions fréquentes
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-gray-500">
              Tout ce que vous devez savoir pour démarrer.
            </motion.p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${openFaq === i ? 'bg-white shadow-lg shadow-gray-200/50 border border-gray-200' : 'bg-white/60 border border-transparent hover:bg-white hover:shadow-md'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-gray-900">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 text-gray-500 leading-relaxed text-[15px]">
                        {faq.a}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} custom={7} className="mt-8 text-center">
            <p className="text-sm text-gray-400 mb-3">Vous avez d'autres questions ?</p>
            <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-pink-600 hover:text-violet-700 transition-colors">
              Contactez notre équipe <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </Reveal>

      {/* ═══════════ TÉMOIGNAGES ═══════════ */}
      <Reveal id="temoignages" className="py-24 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-50 text-violet-700 text-sm font-semibold">
                <Star className="w-4 h-4" /> Témoignages
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-5 text-3xl sm:text-4xl font-extrabold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Ils fidélisent avec Qualee — à votre tour !
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="relative p-7 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300">
                <Quote className="w-8 h-8 text-pink-100 mb-3" />
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.stars)].map((_, si) => <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-600 text-[15px] leading-relaxed mb-5">"{t.quote}"</p>
                <div className="pt-4 border-t border-gray-100">
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role} — {t.city}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <Reveal className="py-24 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={scaleIn} className="relative p-12 sm:p-16 rounded-3xl bg-[#1B1B1F] overflow-hidden">
            <div className="absolute top-0 right-0 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full bg-pink-600/20 blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-violet-500/15 blur-[100px]" />

            <div className="relative text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                Prêt à fidéliser<br />
                <span className="bg-gradient-to-r from-pink-300 to-violet-200 bg-clip-text text-transparent">vos clients ?</span>
              </h2>
              <p className="mt-6 text-white/50 text-lg max-w-xl mx-auto">
                Essayez Qualee gratuitement pendant 14 jours. Sans carte bancaire.
              </p>

              {/* Benefits list */}
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
                {['14 jours gratuits', 'Sans engagement', 'Mise en place en 24h'].map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-sm text-white/40">
                    <Check className="w-4 h-4 text-violet-400" />{b}
                  </span>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link href="/auth/signup" className="animate-cta-glow group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#EB1E99] to-[#7209B7] text-white font-semibold hover:shadow-2xl hover:shadow-pink-500/30 hover:-translate-y-0.5 hover:scale-[1.03] transition-all">
                  Créer mon compte gratuit
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 text-white/80 font-medium hover:bg-white/[0.06] hover:scale-[1.02] transition-all">
                  Parler à un expert
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </Reveal>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#1B1B1F] border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div>
              <img src="/Logo Qualee wht.png" alt="Qualee" className="h-9 w-auto" />
              <p className="mt-4 text-white/40 text-sm max-w-xs leading-relaxed">
                La plateforme de fidélisation et gamification pour les professionnels de la beauté.
              </p>
              {/* Newsletter */}
              <div className="mt-6">
                <p className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-2">Newsletter</p>
                <p className="text-white/40 text-xs mb-3">Conseils fidélisation pour professionnels de la beauté</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-16 gap-y-8">
              <div>
                <h4 className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">Produit</h4>
                <ul className="space-y-2.5">
                  <li><a href="#benefices" className="text-white/60 text-sm hover:text-white transition-colors">Bénéfices</a></li>
                  <li><a href="#comment" className="text-white/60 text-sm hover:text-white transition-colors">Comment ça marche</a></li>
                  <li><a href="#tarifs" className="text-white/60 text-sm hover:text-white transition-colors">Tarifs</a></li>
                  <li><a href="#temoignages" className="text-white/60 text-sm hover:text-white transition-colors">Témoignages</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">Support</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/contact" className="text-white/60 text-sm hover:text-white transition-colors">Contact</Link></li>
                  <li><a href="mailto:contact@qualee.fr" className="text-white/60 text-sm hover:text-white transition-colors">contact@qualee.fr</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">Compte</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/auth/login" className="text-white/60 text-sm hover:text-white transition-colors">Connexion</Link></li>
                  <li><Link href="/auth/signup" className="text-white/60 text-sm hover:text-white transition-colors">Inscription</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">&copy; {new Date().getFullYear()} Qualee. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-white/20 text-xs">
                <Shield className="w-3.5 h-3.5" /> SSL sécurisé
              </span>
              <span className="text-white/20 text-xs">Mentions légales</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

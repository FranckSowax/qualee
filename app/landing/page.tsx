'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  QrCode,
  Gift,
  BarChart3,
  Star,
  Users,
  Smartphone,
  MessageCircle,
  Shield,
  Zap,
  Check,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Award,
  Globe,
  Menu,
  X,
} from 'lucide-react';

// ─── ANIMATION VARIANTS ──────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: EASE as unknown as [number, number, number, number] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: i * 0.08, ease: EASE as unknown as [number, number, number, number] },
  }),
};

function RevealSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <section ref={ref} id={id} className={className}>
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
      >
        {children}
      </motion.div>
    </section>
  );
}

// ─── COUNTER COMPONENT ──────────────────────────
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = value;
    const duration = 1800;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

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
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const NAV_LINKS = [
    { label: 'Bénéfices', href: '#benefices' },
    { label: 'Comment ça marche', href: '#comment' },
    { label: 'Tarifs', href: '#tarifs' },
    { label: 'Témoignages', href: '#temoignages' },
  ];

  const METRICS = [
    { value: 67, suffix: '%', label: "d'avis Google en plus" },
    { value: 45, suffix: '%', label: 'de clients fidélisés' },
    { value: 3, suffix: 'min', label: 'pour tout configurer' },
  ];

  const FEATURES_QUICK = [
    { icon: QrCode, title: 'QR Code intelligent', desc: 'Un scan suffit pour engager vos clients' },
    { icon: Gift, title: 'Roue de la fortune', desc: 'Gamifiez chaque visite avec des récompenses' },
    { icon: BarChart3, title: 'Tableau de bord', desc: 'Suivez vos performances en temps réel' },
  ];

  const BENEFITS = [
    { icon: TrendingUp, title: 'Boostez votre chiffre d\'affaires', desc: 'Augmentez la fréquence des visites et le panier moyen grâce à la fidélisation gamifiée.' },
    { icon: MessageCircle, title: 'Marketing WhatsApp', desc: 'Envoyez des campagnes ciblées directement sur le téléphone de vos clients.' },
    { icon: Award, title: 'Récompensez la fidélité', desc: 'Carte digitale avec points, paliers et récompenses personnalisées.' },
    { icon: Smartphone, title: 'Zéro installation', desc: 'Vos clients scannent un QR code. Pas d\'app à télécharger, pas de friction.' },
    { icon: Users, title: 'Fichier client automatique', desc: 'Chaque interaction crée un profil client exploitable pour vos campagnes.' },
    { icon: Shield, title: 'Accompagnement dédié', desc: 'Notre équipe vous guide de A à Z. Mise en place en moins de 24h.' },
  ];

  const STEPS = [
    { step: '01', title: 'Créez votre compte', desc: 'Inscrivez-vous en 2 minutes. Personnalisez votre roue, vos lots et votre carte de fidélité aux couleurs de votre établissement.', color: 'from-teal-500 to-emerald-500' },
    { step: '02', title: 'Déployez le QR Code', desc: 'Imprimez votre QR code unique et placez-le sur vos tables, comptoir ou vitrine. Vos clients le scannent pour jouer.', color: 'from-emerald-500 to-green-500' },
    { step: '03', title: 'Engagez & fidélisez', desc: 'Vos clients tournent la roue, cumulent des points, laissent des avis. Vous analysez tout depuis votre dashboard.', color: 'from-green-500 to-teal-600' },
  ];

  const PLANS = [
    {
      name: 'Découverte',
      price: 'Gratuit',
      period: '14 jours d\'essai',
      desc: 'Idéal pour tester Cartelle',
      features: ['1 établissement', 'Roue de la fortune', 'QR Code personnalisé', 'Statistiques de base', 'Support email'],
      cta: 'Essayer gratuitement',
      popular: false,
      accent: false,
    },
    {
      name: 'Essentiel',
      price: '15 000',
      period: 'FCFA / mois',
      desc: 'Pour les commerces ambitieux',
      features: ['1 établissement', 'Roue + Carte fidélité', 'QR Code personnalisé', 'Statistiques avancées', 'Campagnes WhatsApp', 'Support prioritaire'],
      cta: 'Commencer',
      popular: true,
      accent: false,
    },
    {
      name: 'Premium',
      price: '35 000',
      period: 'FCFA / mois',
      desc: 'Performance maximale',
      features: ['3 établissements', 'Toutes les fonctionnalités', 'Branding personnalisé', 'Wallet Apple & Google', 'Analytics avancés', 'Gestionnaire dédié'],
      cta: 'Commencer',
      popular: false,
      accent: false,
    },
    {
      name: 'Sur mesure',
      price: 'Contactez-nous',
      period: '',
      desc: 'Pour les réseaux multi-sites',
      features: ['Établissements illimités', 'API & intégrations', 'White label', 'SLA garanti', 'Accompagnement stratégique', 'Formation équipes'],
      cta: 'Nous contacter',
      popular: false,
      accent: true,
    },
  ];

  const FAQS = [
    { q: 'Puis-je changer de plan à tout moment ?', a: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Le changement prend effet immédiatement et la facturation est ajustée au prorata.' },
    { q: 'L\'essai gratuit inclut-il toutes les fonctionnalités ?', a: 'Absolument ! Pendant 14 jours, vous avez accès à toutes les fonctionnalités du plan Essentiel sans aucune restriction.' },
    { q: 'Y a-t-il des frais cachés ?', a: 'Aucun. Le prix affiché est le prix final. Pas de frais de mise en service, pas de commission sur vos ventes, pas de surcoût.' },
    { q: 'Proposez-vous un accompagnement à la mise en place ?', a: 'Oui ! Notre équipe vous accompagne gratuitement pour configurer votre compte, personnaliser votre roue et déployer vos QR codes.' },
  ];

  const TESTIMONIALS = [
    { name: 'Restaurant Le Baobab', sector: 'Restauration — Douala', quote: 'Nos avis Google ont doublé en 3 semaines. Les clients adorent la roue !' },
    { name: 'Hôtel Akwa Palace', sector: 'Hôtellerie — Yaoundé', quote: 'La carte de fidélité digitale a transformé notre relation client.' },
    { name: 'Boutique Afro Chic', sector: 'Mode — Abidjan', quote: 'Simple, efficace, et nos clients en parlent autour d\'eux.' },
    { name: 'Salon Beauté Divine', sector: 'Beauté — Dakar', quote: 'Le meilleur investissement marketing qu\'on ait fait cette année.' },
  ];

  return (
    <div className="relative overflow-hidden bg-white">

      {/* ═══════════ NAVIGATION ═══════════ */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-[0_1px_30px_rgba(0,0,0,0.04)]'
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
              Cartelle
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-teal-600 ${
                  scrolled ? 'text-gray-600' : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                scrolled ? 'text-gray-700 hover:text-teal-700' : 'text-white/90 hover:text-white'
              }`}
            >
              Connexion
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all"
            >
              Commencer <ArrowRight className="w-4 h-4 inline ml-1" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2">
            {mobileMenu
              ? <X className={scrolled ? 'text-gray-900' : 'text-white'} />
              : <Menu className={scrolled ? 'text-gray-900' : 'text-white'} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200 px-5 pb-6 pt-2"
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileMenu(false)} className="block py-3 text-gray-700 font-medium border-b border-gray-100">
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 mt-4">
              <Link href="/auth/login" className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium">Connexion</Link>
              <Link href="/auth/signup" className="flex-1 text-center py-2.5 rounded-xl bg-teal-600 text-white font-semibold">Commencer</Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-center overflow-hidden">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-[#0A1A14]" />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/80 via-[#0A1A14] to-emerald-950/60" />
        {/* Mesh gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-teal-600/15 blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-32 pb-24 w-full">
          <div className="max-w-4xl">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.1] text-emerald-300 text-sm font-medium backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                La plateforme #1 de fidélisation en Afrique
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 text-5xl sm:text-6xl lg:text-[5.2rem] font-extrabold leading-[1.05] tracking-tight text-white"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Transformez chaque
              <br />
              visite en{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                  fidélité
                </span>
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full opacity-60" />
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-7 text-lg sm:text-xl text-white/60 max-w-2xl leading-relaxed"
            >
              Vos clients jouent à la roue, cumulent des points, laissent des avis Google — et reviennent.{' '}
              <span className="text-white/90 font-semibold">Zéro app à télécharger, zéro friction, zéro complexité.</span>
            </motion.p>

            {/* Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="mt-10 flex flex-wrap gap-8"
            >
              {METRICS.map((m, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                    +<AnimatedCounter value={m.value} suffix={m.suffix} />
                  </span>
                  <span className="text-sm text-white/50 mt-1 font-medium">{m.label}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                href="/auth/signup"
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-base hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all"
              >
                Lancez-vous maintenant
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl border border-white/15 text-white/80 font-medium text-base hover:bg-white/[0.06] hover:text-white transition-all backdrop-blur-sm"
              >
                Nous contacter
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ═══════════ 3 QUICK FEATURES ═══════════ */}
      <RevealSection className="relative -mt-20 z-20 max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES_QUICK.map((f, i) => (
            <motion.div
              key={i}
              variants={scaleIn}
              custom={i}
              className="group relative p-7 rounded-2xl bg-white border border-gray-200/80 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-teal-100/50 hover:border-teal-200 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center mb-4 group-hover:from-teal-100 group-hover:to-emerald-100 transition-colors">
                <f.icon className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{f.title}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </RevealSection>

      {/* ═══════════ BÉNÉFICES ═══════════ */}
      <RevealSection id="benefices" className="py-28 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold">
                <Zap className="w-4 h-4" />
                Bénéfices pour vous
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Et si fidéliser vos clients
              <br />
              devenait <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">un jeu d'enfant</span> ?
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-5 text-lg text-gray-500 leading-relaxed">
              Les résultats concrets pour votre établissement dès le premier mois.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="group relative p-8 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/30 group-hover:scale-105 transition-all">
                  <b.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>{b.title}</h3>
                <p className="mt-2 text-gray-500 leading-relaxed text-[15px]">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ COMMENT ÇA MARCHE ═══════════ */}
      <RevealSection id="comment" className="py-28 px-5 sm:px-8 bg-[#0A1A14] relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-teal-800/20 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-800/15 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-emerald-300 text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                Comment ça marche
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Opérationnel en{' '}
              <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">3 étapes</span>
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="group relative"
              >
                <div className="relative p-8 rounded-3xl bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-500">
                  <span className={`inline-block text-6xl font-black bg-gradient-to-br ${s.color} bg-clip-text text-transparent opacity-40`} style={{ fontFamily: 'Sora, sans-serif' }}>
                    {s.step}
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {s.title}
                  </h3>
                  <p className="mt-3 text-white/50 leading-relaxed">{s.desc}</p>
                </div>
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Help block */}
          <motion.div variants={fadeUp} custom={4} className="mt-16 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-300" />
                </div>
                <p className="text-white/70 text-sm">
                  <span className="text-white font-semibold">Besoin d'aide ?</span> Notre équipe vous accompagne à chaque étape.
                </p>
              </div>
              <Link href="/contact" className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors whitespace-nowrap">
                Parler à un expert
              </Link>
            </div>
          </motion.div>
        </div>
      </RevealSection>

      {/* ═══════════ TARIFS ═══════════ */}
      <RevealSection id="tarifs" className="py-28 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold">
                Tarifs
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Des tarifs simples et transparents
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mt-5 text-lg text-gray-500">
              14 jours d'essai gratuit &bull; Pas de frais cachés &bull; Annulez à tout moment
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                custom={i}
                className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? 'bg-[#0A1A14] border-teal-500/30 shadow-2xl shadow-teal-900/20 text-white'
                    : plan.accent
                    ? 'bg-gradient-to-br from-teal-600 to-emerald-600 border-transparent text-white shadow-xl shadow-teal-500/20'
                    : 'bg-white border-gray-200 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-100/50'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold tracking-wide shadow-lg">
                    Le plus populaire
                  </span>
                )}

                <h3 className={`text-lg font-bold ${plan.popular || plan.accent ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-sm ${plan.popular ? 'text-white/50' : plan.accent ? 'text-white/70' : 'text-gray-500'}`}>{plan.desc}</p>

                <div className="mt-6">
                  <span className={`text-3xl font-extrabold ${plan.popular || plan.accent ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`ml-1 text-sm ${plan.popular ? 'text-white/40' : plan.accent ? 'text-white/60' : 'text-gray-400'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="mt-7 space-y-3 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${
                        plan.popular ? 'text-emerald-400' : plan.accent ? 'text-white/80' : 'text-teal-500'
                      }`} />
                      <span className={`text-sm ${
                        plan.popular ? 'text-white/70' : plan.accent ? 'text-white/80' : 'text-gray-600'
                      }`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.accent ? '/contact' : '/auth/signup'}
                  className={`mt-8 block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-teal-500/30'
                      : plan.accent
                      ? 'bg-white text-teal-700 hover:bg-white/90'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ FAQ ═══════════ */}
      <RevealSection className="py-28 px-5 sm:px-8 bg-gray-50/80">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Questions fréquentes
            </motion.h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} custom={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${
                    openFaq === i
                      ? 'bg-white shadow-lg shadow-gray-200/50 border border-gray-200'
                      : 'bg-white/60 border border-transparent hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-gray-900">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </div>
                  {openFaq === i && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 text-gray-500 leading-relaxed text-[15px]"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ CTA FINAL ═══════════ */}
      <RevealSection className="py-28 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={scaleIn}
            className="relative p-12 sm:p-16 rounded-3xl bg-[#0A1A14] overflow-hidden"
          >
            {/* Gradient orbs */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-teal-600/20 blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-emerald-500/15 blur-[100px]" />

            <div className="relative text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                Prêt à booster votre
                <br />
                <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">fidélisation client</span> ?
              </h2>
              <p className="mt-6 text-white/50 text-lg max-w-xl mx-auto">
                Essayez Cartelle gratuitement pendant 14 jours. Aucune carte bancaire requise.
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold text-base hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all"
                >
                  Démarrer l'essai gratuit
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/15 text-white/80 font-medium text-base hover:bg-white/[0.06] transition-all"
                >
                  Parler à un expert
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </RevealSection>

      {/* ═══════════ TÉMOIGNAGES ═══════════ */}
      <RevealSection id="temoignages" className="py-28 px-5 sm:px-8 bg-gray-50/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-semibold">
                <Star className="w-4 h-4" />
                Témoignages
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl sm:text-4xl font-extrabold text-gray-900"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              Ils fidélisent avec Cartelle
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i}
                className="p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-[15px] leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.sector}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#0A1A14] border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>Cartelle</span>
              </div>
              <p className="mt-4 text-white/40 text-sm max-w-xs leading-relaxed">
                La plateforme de fidélisation et gamification pour les commerces africains.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-16 gap-y-8">
              <div>
                <h4 className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">Produit</h4>
                <ul className="space-y-2.5">
                  <li><a href="#benefices" className="text-white/60 text-sm hover:text-white transition-colors">Bénéfices</a></li>
                  <li><a href="#comment" className="text-white/60 text-sm hover:text-white transition-colors">Comment ça marche</a></li>
                  <li><a href="#tarifs" className="text-white/60 text-sm hover:text-white transition-colors">Tarifs</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">Support</h4>
                <ul className="space-y-2.5">
                  <li><Link href="/contact" className="text-white/60 text-sm hover:text-white transition-colors">Contact</Link></li>
                  <li><a href="mailto:contact@cartelle.app" className="text-white/60 text-sm hover:text-white transition-colors">contact@cartelle.app</a></li>
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
            <p className="text-white/30 text-xs">&copy; 2026 Cartelle. Tous droits réservés.</p>
            <p className="text-white/20 text-xs">Conçu avec soin pour les commerces d'Afrique.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

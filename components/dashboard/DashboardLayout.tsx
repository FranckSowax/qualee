'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { NotificationDropdown } from '@/components/dashboard/NotificationDropdown';
import { SubscriptionOverlay } from '@/components/dashboard/SubscriptionOverlay';
import { EXEMPT_EMAILS } from '@/lib/config/admin';
import { OnboardingGuide } from '@/components/dashboard/OnboardingGuide';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  LayoutDashboard,
  Gift,
  QrCode,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Users,
  CreditCard,
  Target,
  ScanLine,
  ChevronRight,
  Store,
  Award,
  UserCircle,
  Shield,
  Send,
  MapPin,
  Zap,
  HelpCircle
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  merchant?: any;
}

export function DashboardLayout({ children, merchant }: DashboardLayoutProps) {
  const { t, i18n, ready } = useTranslation(undefined, { useSuspense: false });
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Auto-show onboarding for new merchants (< 7 days, not dismissed)
    if (merchant?.created_at) {
      const days = (Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const dismissed = localStorage.getItem('cartelle_onboarding_dismissed');
      if (days < 7 && !dismissed) {
        setTimeout(() => setShowOnboarding(true), 800);
      }
    }
  }, [merchant?.created_at]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navigationGroups = [
    {
      label: null,
      items: [
        { name: t('dashboard.nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Opérations',
      items: [
        { name: t('dashboard.nav.scanner'), href: '/dashboard/scan', icon: ScanLine },
        { name: t('dashboard.nav.qrCode'), href: '/dashboard/qr', icon: QrCode },
        { name: 'Établissements', href: '/dashboard/locations', icon: MapPin },
      ],
    },
    {
      label: 'Engagement',
      items: [
        { name: t('dashboard.nav.prizes'), href: '/dashboard/prizes', icon: Gift },
        { name: t('dashboard.nav.loyalty'), href: '/dashboard/loyalty', icon: Award },
        { name: t('dashboard.nav.feedback'), href: '/dashboard/feedback', icon: MessageSquare },
        { name: t('dashboard.nav.strategy'), href: '/dashboard/strategy', icon: Target },
        { name: 'Parrainage', href: '/dashboard/referral', icon: Gift },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { name: 'Campagnes WhatsApp', href: '/dashboard/marketing/whatsapp-campaign', icon: Send },
        { name: 'Templates WhatsApp', href: '/dashboard/marketing/whatsapp-campaign/templates', icon: MessageSquare },
      ],
    },
    {
      label: 'Analyse',
      items: [
        { name: t('dashboard.nav.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
        { name: t('dashboard.nav.customers'), href: '/dashboard/customers', icon: Users },
      ],
    },
    {
      label: 'Compte',
      items: [
        { name: t('dashboard.nav.account'), href: '/dashboard/account', icon: Shield },
        { name: t('dashboard.nav.profile'), href: '/dashboard/profile', icon: UserCircle },
        { name: t('dashboard.nav.billing'), href: '/dashboard/billing', icon: CreditCard },
        { name: t('dashboard.nav.settings'), href: '/dashboard/settings', icon: Settings },
        { name: 'Automatisations', href: '/dashboard/settings/automations', icon: Zap },
      ],
    },
  ];

  const navigation = navigationGroups.flatMap(g => g.items);


  // Check if this account is exempt from subscription
  const isExempt = merchant?.email
    ? EXEMPT_EMAILS.map(e => e.toLowerCase()).includes(merchant.email.toLowerCase())
    : false;

  // Check if subscription has expired (exempt accounts are never expired)
  const isSubscriptionExpired = isExempt
    ? false
    : merchant?.subscription_expires_at
      ? new Date(merchant.subscription_expires_at) < new Date()
      : false;

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 relative">
      {/* Subscription expiry overlay — blocks dashboard until renewed */}
      {isSubscriptionExpired && merchant && (
        <SubscriptionOverlay merchant={merchant} />
      )}

      {/* Onboarding guide for new merchants */}
      {merchant && !isSubscriptionExpired && showOnboarding && (
        <OnboardingGuide merchant={merchant} onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('cartelle_onboarding_dismissed', Date.now().toString());
        }} />
      )}
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      {/* Decorative gradient orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-[85vw] max-w-72 bg-[#0F172A] border-r border-slate-800/50 transform transition-transform duration-300 ease-in-out shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800/50 bg-[#0F172A]">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img 
                src="/logo-cartelle-white.png"
                alt="Cartelle Logo"
                className="h-8 w-auto transition-transform hover:scale-105"
              />
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Merchant Info */}
          {merchant && (
            <div className="px-6 py-6 border-b border-slate-800/50 bg-[#0F172A]/50">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-teal-900/20">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {merchant.business_name || merchant.name}
                  </p>
                  <p className="text-xs text-slate-400 capitalize flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {isExempt ? (
                      <span className="text-amber-400 font-semibold">Illimité</span>
                    ) : (
                      <>{merchant.subscription_tier || 'Free'} Plan</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {navigationGroups.map((group, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                {group.label && (
                  <p className="px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{group.label}</p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                          ${isActive
                            ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg shadow-teal-900/20 border border-teal-500/20'
                            : 'text-white hover:bg-slate-800/50'
                          }
                        `}
                      >
                        <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        {item.name}
                        {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white/50" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sign Out */}
          <div className="p-4 border-t border-slate-800/50 bg-[#0F172A]">
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              {t('dashboard.nav.signOut')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center justify-between h-20 px-4 sm:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-slate-900">
                  {navigation.find(item => item.href === pathname)?.name || t('dashboard.nav.dashboard')}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {merchant && (
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="p-2.5 rounded-full hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                  title="Guide de démarrage"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              )}
              {merchant && <NotificationDropdown merchantId={merchant.id} />}
              <button
                onClick={handleSignOut}
                className="p-2.5 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
                title={t('dashboard.nav.signOut')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

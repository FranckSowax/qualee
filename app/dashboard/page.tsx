'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartAreaInteractive } from '@/components/dashboard/ChartAreaInteractive';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  TrendingUp,
  Copy,
  ArrowUpRight,
  Star,
  Gift,
  RotateCw,
  MessageSquare,
  ScanLine,
  BarChart3,
  Award,
  Link2,
} from 'lucide-react';

interface DashboardUser {
  id: string;
  email?: string;
}

interface DashboardMerchant {
  id: string;
  business_name?: string;
  email: string;
}

interface ActivityItem {
  id: number;
  type: 'positive' | 'negative';
  rating: number;
  comment: string | null;
  date: string;
  customer_email: string | null;
  customer_phone: string | null;
}

interface ChartDataItem {
  date: string;
  positive: number;
  negative: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(undefined, { useSuspense: false });
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [merchant, setMerchant] = useState<DashboardMerchant | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [stats, setStats] = useState({
    totalReviews: 0,
    avgRating: 0,
    totalSpins: 0,
    rewardsRedeemed: 0,
    reviewsTrend: 0,
    positiveRatio: 0,
  });

  // Set current date on client-side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }));
  }, [i18n.language]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Try to fetch merchant
      let { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // If no merchant, call ensure-merchant endpoint to create/sync it
      if (!merchantData) {
        try {
          const ensureRes = await fetch('/api/account/ensure-merchant', { method: 'POST' });
          if (ensureRes.ok) {
            const result = await ensureRes.json();
            merchantData = result.merchant;
          }
        } catch (err) {
          console.error('[DASHBOARD] ensure-merchant failed:', err);
        }
      }

      setMerchant(merchantData);

      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('rating, is_positive, created_at, comment, customer_email, customer_phone')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      const { count: spinsCount } = await supabase
        .from('spins')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', user.id);

      const { data: couponsData } = await supabase
        .from('coupons')
        .select('used')
        .eq('merchant_id', user.id);

      const totalReviews = feedbackData?.length || 0;
      const avgRating = (feedbackData || []).reduce((sum, f) => sum + f.rating, 0) / (totalReviews || 1);
      const totalSpins = spinsCount || 0;
      const rewardsRedeemed = couponsData?.filter(c => c.used).length || 0;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentReviews = feedbackData?.filter(f => new Date(f.created_at) >= thirtyDaysAgo).length || 0;
      const previousReviews = feedbackData?.filter(f => {
        const date = new Date(f.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      }).length || 0;

      const reviewsTrend = previousReviews > 0
        ? Math.round(((recentReviews - previousReviews) / previousReviews) * 100)
        : (recentReviews > 0 ? 100 : 0);

      const positiveReviews = feedbackData?.filter(f => f.is_positive).length || 0;
      const positiveRatio = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0;

      setStats({
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        totalSpins,
        rewardsRedeemed,
        reviewsTrend,
        positiveRatio,
      });

      const activity: ActivityItem[] = feedbackData?.slice(0, 5).map((f: { is_positive: boolean; rating: number; comment: string | null; created_at: string; customer_email: string | null; customer_phone: string | null }, idx: number) => ({
        id: idx,
        type: f.is_positive ? 'positive' as const : 'negative' as const,
        rating: f.rating,
        comment: f.comment,
        date: f.created_at,
        customer_email: f.customer_email,
        customer_phone: f.customer_phone,
      })) || [];

      setRecentActivity(activity);

      const chartMap = new Map<string, { date: string; positive: number; negative: number }>();
      const today = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(today.getDate() - 90);

      for (let d = new Date(ninetyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        chartMap.set(dateStr, { date: dateStr, positive: 0, negative: 0 });
      }

      feedbackData?.forEach((f: any) => {
        const dateStr = new Date(f.created_at).toISOString().split('T')[0];
        if (chartMap.has(dateStr)) {
          const entry = chartMap.get(dateStr)!;
          if (f.is_positive) {
            entry.positive += 1;
          } else {
            entry.negative += 1;
          }
        }
      });

      setChartData(Array.from(chartMap.values()));
    };

    checkAuth();
  }, [router]);

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('dashboard.common.loading')}</p>
        </div>
      </div>
    );
  }

  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/rate/${user.id}`;

  const handleCopyLink = () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/rate/${user.id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const statCards = [
    {
      label: t('dashboard.totalReviews'),
      value: stats.totalReviews,
      icon: MessageSquare,
      trend: stats.reviewsTrend,
    },
    {
      label: t('dashboard.avgRating'),
      value: stats.avgRating,
      suffix: '/ 5',
      icon: Star,
    },
    {
      label: t('dashboard.totalSpins'),
      value: stats.totalSpins,
      icon: RotateCw,
    },
    {
      label: t('dashboard.rewards'),
      value: stats.rewardsRedeemed,
      icon: Gift,
      badge: stats.positiveRatio > 0 ? `${stats.positiveRatio}%` : undefined,
    },
  ];

  const quickActions = [
    { label: t('dashboard.quickActions.scan'), icon: ScanLine, href: '/dashboard/scan' },
    { label: t('dashboard.quickActions.prizes'), icon: Gift, href: '/dashboard/prizes' },
    { label: t('dashboard.quickActions.reviews'), icon: Star, href: '/dashboard/feedback' },
    { label: t('dashboard.quickActions.analytics'), icon: BarChart3, href: '/dashboard/analytics' },
    { label: t('dashboard.nav.loyalty'), icon: Award, href: '/dashboard/loyalty' },
    { label: t('dashboard.nav.settings'), icon: Link2, href: '/dashboard/settings' },
  ];

  const getInitials = (email: string | null, phone: string | null) => {
    if (email) return email.charAt(0).toUpperCase();
    if (phone) return '#';
    return '?';
  };

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-5">
        {/* Header + Review Link Banner */}
        <div className="flex flex-col gap-4">
          {/* Page Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('dashboard.welcome', { name: merchant.business_name || 'Commercant' })}
            </h2>
            {currentDate && (
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{currentDate}</p>
            )}
          </div>

          {/* Review Link Banner */}
          <Card className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md p-0">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{t('dashboard.reviewLink.publicLink')}</p>
                <code className="text-xs text-teal-600 truncate block">{reviewUrl}</code>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {linkCopied ? (i18n.language === 'fr' ? 'Copie !' : 'Copied!') : t('dashboard.reviewLink.copy')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/dashboard/qr')}
                  className="text-xs h-8 px-3"
                >
                  <ScanLine className="w-3.5 h-3.5 mr-1.5" />
                  QR
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Grid - 2x2 mobile, 4-col desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md p-0"
              >
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    {stat.trend !== undefined && stat.trend !== 0 && (
                      <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md ${
                        stat.trend > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        <TrendingUp className={`w-3 h-3 mr-0.5 ${stat.trend < 0 ? 'rotate-180' : ''}`} />
                        {stat.trend > 0 ? '+' : ''}{stat.trend}%
                      </span>
                    )}
                    {stat.badge && (
                      <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700">
                        {stat.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                    {stat.suffix && <span className="text-xs text-gray-400">{stat.suffix}</span>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Chart + Recent Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <div className="lg:col-span-2">
            <ChartAreaInteractive data={chartData} />
          </div>

          {/* Recent Reviews - Compact List */}
          <Card className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md p-0">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{t('dashboard.recentReviews.title')}</h3>
              </div>

              {recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      {/* Avatar/Initial */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        activity.rating >= 4 ? 'bg-green-100 text-green-700' : activity.rating >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {getInitials(activity.customer_email, activity.customer_phone)}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900 truncate">
                            {activity.customer_email || activity.customer_phone || t('dashboard.recentReviews.anonymous')}
                          </span>
                          <div className="flex items-center shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < activity.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {activity.comment || new Date(activity.date).toLocaleDateString(i18n.language)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  {t('dashboard.recentReviews.noReviews')}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 text-xs h-8"
                onClick={() => router.push('/dashboard/feedback')}
              >
                {t('dashboard.recentReviews.viewAll')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Quick Actions - 3x2 grid */}
        <Card className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md p-0">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('dashboard.quickActions.title')}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.href}
                    onClick={() => router.push(action.href)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-teal-50 transition-colors group/action"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover/action:bg-teal-600 group-hover/action:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

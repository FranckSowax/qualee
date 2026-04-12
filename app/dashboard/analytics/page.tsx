'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ChartAreaInteractive } from '@/components/dashboard/ChartAreaInteractive';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Gift,
  BarChart3,
  Calendar,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Activity,
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  is_positive: boolean;
  created_at: string;
}

interface RatingDistribution {
  [key: number]: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(undefined, { useSuspense: false });
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackItem[]>([]);
  const [loyaltyMap, setLoyaltyMap] = useState<Record<string, string>>({});
  const [ratingDistribution, setRatingDistribution] = useState<RatingDistribution>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [chartData, setChartData] = useState<Array<{ date: string; positive: number; negative: number }>>([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    positiveReviews: 0,
    negativeReviews: 0,
    avgRating: 0,
    conversionRate: 0,
    totalSpins: 0,
    thisMonthReviews: 0,
    lastMonthReviews: 0,
    thisMonthPositive: 0,
    lastMonthPositive: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();

      setMerchant(merchantData);

      const { data: allFeedback } = await supabase
        .from('feedback')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      // Load loyalty clients to reconcile names from phone/email
      const { data: loyaltyClients } = await supabase
        .from('loyalty_clients')
        .select('name, phone, email')
        .eq('merchant_id', user.id)
        .not('name', 'is', null);

      const map: Record<string, string> = {};
      (loyaltyClients || []).forEach((c) => {
        if (!c.name) return;
        if (c.phone) map[c.phone] = c.name;
        if (c.email) map[c.email.toLowerCase()] = c.name;
      });
      setLoyaltyMap(map);

      const { data: spinsData } = await supabase
        .from('spins')
        .select('*')
        .eq('merchant_id', user.id);

      if (allFeedback) {
        setFeedbackData(allFeedback);

        const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allFeedback.forEach((f) => {
          if (f.rating >= 1 && f.rating <= 5) {
            distribution[f.rating]++;
          }
        });
        setRatingDistribution(distribution);

        const chartMap = new Map<string, { date: string; positive: number; negative: number }>();
        const today = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);

        for (let d = new Date(ninetyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          chartMap.set(dateStr, { date: dateStr, positive: 0, negative: 0 });
        }

        allFeedback.forEach((f) => {
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

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const thisMonthFeedback = allFeedback.filter(f => new Date(f.created_at) >= thisMonthStart);
        const lastMonthFeedback = allFeedback.filter(f => {
          const date = new Date(f.created_at);
          return date >= lastMonthStart && date <= lastMonthEnd;
        });

        const totalReviews = allFeedback.length;
        const positiveReviews = allFeedback.filter(f => f.is_positive).length;
        const negativeReviews = totalReviews - positiveReviews;
        const avgRating = allFeedback.reduce((sum, f) => sum + f.rating, 0) / (totalReviews || 1);
        const conversionRate = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;

        setStats({
          totalReviews,
          positiveReviews,
          negativeReviews,
          avgRating: Math.round(avgRating * 10) / 10,
          conversionRate: Math.round(conversionRate),
          totalSpins: spinsData?.length || 0,
          thisMonthReviews: thisMonthFeedback.length,
          lastMonthReviews: lastMonthFeedback.length,
          thisMonthPositive: thisMonthFeedback.filter(f => f.is_positive).length,
          lastMonthPositive: lastMonthFeedback.filter(f => f.is_positive).length,
        });
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current >= 0 };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
  };

  const reviewsTrend = calculateTrend(stats.thisMonthReviews, stats.lastMonthReviews);
  const positiveTrend = calculateTrend(stats.thisMonthPositive, stats.lastMonthPositive);

  if (loading || !user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: t('dashboardAnalytics.totalReviews'),
      value: stats.totalReviews,
      icon: BarChart3,
      trend: reviewsTrend,
      trendLabel: t('dashboardAnalytics.thisMonth'),
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600',
      trendPositiveColor: 'text-pink-600',
    },
    {
      label: t('dashboardAnalytics.positiveReviews'),
      value: stats.positiveReviews,
      icon: ThumbsUp,
      trend: positiveTrend,
      trendLabel: t('dashboardAnalytics.thisMonth'),
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      trendPositiveColor: 'text-violet-600',
    },
    {
      label: t('dashboardAnalytics.negativeReviews'),
      value: stats.negativeReviews,
      icon: ThumbsDown,
      trend: null,
      trendLabel: stats.totalReviews > 0 ? `${Math.round((stats.negativeReviews / stats.totalReviews) * 100)}% ${t('dashboardAnalytics.ofTotal')}` : '',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      trendPositiveColor: 'text-gray-500',
    },
    {
      label: t('dashboardAnalytics.avgRatingLabel'),
      value: stats.avgRating,
      icon: Star,
      trend: null,
      trendLabel: t('dashboardAnalytics.outOf5'),
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      trendPositiveColor: 'text-amber-600',
    },
  ];

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboardAnalytics.title')}</h1>
            <p className="text-sm text-gray-500">{t('dashboardAnalytics.subtitle')}</p>
          </div>
        </div>

        {/* Stats cards - 4 col grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className="group relative p-5 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md"
            >
              <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>
                  <card.icon className="w-5 h-5" />
                </div>
                {card.trend ? (
                  card.trend.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-pink-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )
                ) : null}
              </div>
              <p className="text-xs text-gray-500 mb-0.5">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className={`text-xs mt-1 ${card.trend ? (card.trend.isPositive ? card.trendPositiveColor : 'text-red-500') : card.trendPositiveColor}`}>
                {card.trend ? `${card.trend.isPositive ? '+' : '-'}${card.trend.value}% ` : ''}
                {card.trendLabel}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <ChartAreaInteractive data={chartData} />

        {/* Rating distribution + Conversion metrics - side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Rating distribution */}
          <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{t('dashboardAnalytics.ratingDistribution')}</h3>
            </div>
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating] || 0;
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                const barColor = rating >= 4 ? 'bg-violet-500' : rating === 3 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 w-6 text-right">{rating}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-7 text-right">{count}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{Math.round(percentage)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{stats.totalReviews}</span> {t('dashboardAnalytics.totalReviewsLabel')}
              </p>
            </div>
          </div>

          {/* Conversion metrics */}
          <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{t('dashboardAnalytics.conversionMetrics')}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">{t('dashboardAnalytics.satisfactionRate')}</p>
                  <p className="text-xl font-bold text-gray-900">{stats.conversionRate}%</p>
                </div>
                <div className="w-9 h-9 bg-pink-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-pink-600" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">{t('dashboardAnalytics.totalSpins')}</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalSpins}</p>
                </div>
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Gift className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">{t('dashboardAnalytics.reviewsThisMonth')}</p>
                  <p className="text-xl font-bold text-gray-900">{stats.thisMonthReviews}</p>
                </div>
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent reviews - compact table */}
        <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{t('dashboardAnalytics.recentReviews')}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboardAnalytics.colDate')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboardAnalytics.colClient')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboardAnalytics.colRating')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboardAnalytics.colSentiment')}</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboardAnalytics.colComment')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feedbackData.length > 0 ? (
                  feedbackData.slice(0, 10).map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {new Date(feedback.created_at).toLocaleDateString(i18n.language, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-gray-600">
                          {(() => {
                            const phoneName = feedback.customer_phone ? loyaltyMap[feedback.customer_phone] : undefined;
                            const emailName = feedback.customer_email ? loyaltyMap[feedback.customer_email.toLowerCase()] : undefined;
                            return phoneName || emailName || feedback.customer_email || feedback.customer_phone || t('dashboardAnalytics.anonymous');
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= feedback.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {feedback.is_positive ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                            <ThumbsUp className="w-2.5 h-2.5" />
                            {t('dashboardAnalytics.positiveLabel')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                            <ThumbsDown className="w-2.5 h-2.5" />
                            {t('dashboardAnalytics.negativeLabel')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {feedback.comment || <span className="text-gray-300 italic">{t('dashboardAnalytics.noComment')}</span>}
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">{t('dashboardAnalytics.noReviewsTitle')}</p>
                      <p className="text-xs text-gray-500">{t('dashboardAnalytics.noReviewsDesc')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {feedbackData.length > 10 && (
            <div className="px-6 py-2.5 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                {t('dashboardAnalytics.showing10of', { total: feedbackData.length })}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

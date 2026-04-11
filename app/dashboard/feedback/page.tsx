'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { Feedback } from '@/lib/types/database';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  Star,
  BarChart3,
  Filter,
  Phone,
} from 'lucide-react';

const PAGE_SIZE = 10;

export default function FeedbackPage() {
  const router = useRouter();
  const { t } = useTranslation(undefined, { useSuspense: false });
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');

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
      fetchFeedback(user.id);
    };

    checkAuth();
  }, [router]);

  const fetchFeedback = async (merchantId: string) => {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    setFeedback(data || []);
  };

  const filteredFeedback = feedback.filter((f) => {
    if (filter === 'positive') return f.is_positive;
    if (filter === 'negative') return !f.is_positive;
    return true;
  });

  const {
    currentPage,
    totalPages,
    paginatedData,
    setPage,
    totalItems,
    pageSize,
  } = usePagination(filteredFeedback, { pageSize: PAGE_SIZE });

  useEffect(() => {
    setPage(1);
  }, [filter, setPage]);

  const positiveCount = feedback.filter(f => f.is_positive).length;
  const negativeCount = feedback.filter(f => !f.is_positive).length;
  const positivePercent = feedback.length > 0 ? Math.round((positiveCount / feedback.length) * 100) : 0;
  const avgRating = feedback.length > 0
    ? Math.round((feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 10) / 10
    : 0;

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('dashboardFeedback.title')}</h1>
              <p className="text-sm text-gray-500">{t('dashboardFeedback.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Stats badges row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm">
            <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-600">{t('dashboardFeedback.total')}:</span>
            <span className="font-semibold text-gray-900">{feedback.length}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-sm">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700">{t('dashboardFeedback.positivePercent')}:</span>
            <span className="font-semibold text-emerald-800">{positivePercent}%</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-700">{t('dashboardFeedback.avgRating')}:</span>
            <span className="font-semibold text-amber-800">{avgRating}/5</span>
          </div>
        </div>

        {/* Compact chip filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('dashboardFeedback.filterAll')} ({feedback.length})
          </button>
          <button
            onClick={() => setFilter('positive')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              filter === 'positive'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('dashboardFeedback.filterPositive')} ({positiveCount})
          </button>
          <button
            onClick={() => setFilter('negative')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              filter === 'negative'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('dashboardFeedback.filterNegative')} ({negativeCount})
          </button>
        </div>

        {/* Feedback list card */}
        {filteredFeedback.length > 0 ? (
          <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-[160px_minmax(0,1fr)_100px_100px_140px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>WhatsApp</span>
              <span>{t('dashboardFeedback.colComment')}</span>
              <span className="text-center">{t('dashboardFeedback.colRating')}</span>
              <span className="text-center">{t('dashboardFeedback.colSentiment')}</span>
              <span className="text-right">{t('dashboardFeedback.colDate')}</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
              {paginatedData.map((f) => {
                const createdDate = new Date(f.created_at);
                const dateStr = createdDate.toLocaleDateString('fr-FR');
                const timeStr = createdDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={f.id}
                    className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_100px_100px_140px] gap-2 md:gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors items-center"
                  >
                    {/* WhatsApp phone */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      {f.customer_phone ? (
                        <span className="text-xs font-mono text-gray-700 truncate">{f.customer_phone}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </div>

                    {/* Comment */}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {f.comment || <span className="text-gray-400 italic">{t('dashboardFeedback.noComment')}</span>}
                      </p>
                    </div>

                    {/* Star rating with colored dots */}
                    <div className="flex items-center justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div
                          key={star}
                          className={`w-2 h-2 rounded-full ${
                            star <= f.rating
                              ? f.rating >= 4
                                ? 'bg-emerald-500'
                                : f.rating === 3
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-medium text-gray-500">{f.rating}</span>
                    </div>

                    {/* Sentiment */}
                    <div className="flex justify-center">
                      {f.is_positive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                          <ThumbsUp className="w-3 h-3" />
                          {t('dashboardFeedback.positive')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                          <ThumbsDown className="w-3 h-3" />
                          {t('dashboardFeedback.negative')}
                        </span>
                      )}
                    </div>

                    {/* Date + time */}
                    <div className="flex flex-col items-end gap-0.5 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </div>
                      <span className="font-mono text-gray-400">{timeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact pagination footer */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
              <PaginationInfo
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
              />
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('dashboardFeedback.noFeedbackTitle')}</h3>
              <p className="text-sm text-gray-500 mb-5">
                {filter === 'all'
                  ? t('dashboardFeedback.noFeedbackDesc')
                  : t('dashboardFeedback.noFeedbackFiltered', { filter })}
              </p>
              <Button onClick={() => router.push('/dashboard/qr')} size="sm" className="gap-2">
                {t('dashboardFeedback.viewQR')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

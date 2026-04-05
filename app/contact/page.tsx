'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    establishments: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          establishments: formData.establishments,
          message: formData.message,
          source: 'contact_page'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Contact form error:', err);
      setError(t('contact.form.error') || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EDE8]">
      {/* Header */}
      <header className="fixed top-0 w-full bg-[#1B4332]/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-cartelle-white.png"
              alt="Cartelle Logo"
              className="h-12 sm:h-16 md:h-20 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                {t('contact.backToHome')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D6A4F]/10 rounded-full mb-6">
              <div className="w-2 h-2 bg-[#2D6A4F] rounded-full"></div>
              <span className="text-sm font-semibold text-[#2D6A4F] uppercase tracking-wide">Multi Store</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'ARCO, sans-serif' }}>
              {t('contact.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('contact.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <Card className="bg-white rounded-2xl p-8 shadow-xl">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t('contact.thankYou')}</h3>
                  <p className="text-gray-600 mb-6">{t('contact.willContact')}</p>
                  <Link href="/">
                    <Button className="bg-[#2D6A4F] hover:bg-[#1B4332] text-white">
                      {t('contact.backToHome')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.form.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent outline-none transition"
                      placeholder={t('contact.form.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.form.email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent outline-none transition"
                      placeholder={t('contact.form.emailPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.form.company')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent outline-none transition"
                      placeholder={t('contact.form.companyPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.form.establishments')}
                    </label>
                    <select
                      value={formData.establishments}
                      onChange={(e) => setFormData({ ...formData, establishments: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent outline-none transition"
                    >
                      <option value="">{t('contact.form.selectEstablishments')}</option>
                      <option value="2-5">2-5</option>
                      <option value="6-10">6-10</option>
                      <option value="11-25">11-25</option>
                      <option value="26-50">26-50</option>
                      <option value="50+">50+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('contact.form.message')}
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#2D6A4F] focus:border-transparent outline-none transition resize-none"
                      placeholder={t('contact.form.messagePlaceholder')}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#2D6A4F] hover:bg-[#1B4332] text-white py-6 text-lg font-semibold"
                  >
                    {isSubmitting ? t('contact.form.sending') : t('contact.form.submit')}
                  </Button>
                </form>
              )}
            </Card>

            {/* Info Card */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-[#2D6A4F] to-[#1B4332] rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">{t('contact.multiStore.title')}</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#52B788] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('contact.multiStore.feature1')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#52B788] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('contact.multiStore.feature2')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#52B788] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('contact.multiStore.feature3')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-[#52B788] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('contact.multiStore.feature4')}</span>
                  </li>
                </ul>
              </Card>

              <Card className="bg-white rounded-2xl p-6 shadow-lg">
                <h4 className="font-bold text-gray-900 mb-3">{t('contact.directContact')}</h4>
                <div className="space-y-3 text-gray-600">
                  <a href="mailto:contact@cartelle.app" className="flex items-center gap-3 hover:text-[#2D6A4F] transition">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    contact@cartelle.app
                  </a>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

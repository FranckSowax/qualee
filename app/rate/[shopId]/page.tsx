'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { StarRating } from '@/components/molecules/StarRating';
import { Button } from '@/components/atoms/Button';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n/config';
import { Star, Mail, Phone, Heart } from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { feedbackSchema, feedbackSchemaWhatsApp, sanitizeString, sanitizePhone, isValidUUID } from '@/lib/utils/validation';

export default function RatingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const shopId = params.shopId as string;

  // Get language from URL or localStorage
  const langFromUrl = searchParams.get('lang');
  const currentLang = 'fr';
  const isFr = currentLang === 'fr';

  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [merchant, setMerchant] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Determine workflow mode from merchant settings
  const workflowMode = merchant?.workflow_mode || 'web';
  const isWhatsAppMode = workflowMode === 'whatsapp';

  useEffect(() => {
    setIsClient(true);
    // Apply language from URL if provided
    if (langFromUrl && i18n.language !== langFromUrl) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [langFromUrl]);

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', shopId)
          .single();

        if (error) {
          return;
        }

        if (data) {
          setMerchant(data);
        }
      } catch {
        // Handle silently
      } finally {
        setFetching(false);
      }
    };

    if (shopId) {
      fetchMerchant();
    } else {
      setFetching(false);
    }
  }, [shopId]);

  const handleRating = (selectedRating: number) => {
    setRating(selectedRating);
  };


  const handleFeedbackSubmit = async () => {
    if (!rating) return;

    // Validate shopId is a valid UUID
    if (!isValidUUID(shopId)) {
      return;
    }

    // Get or create user token
    const userToken = localStorage.getItem('user_token') || crypto.randomUUID();
    localStorage.setItem('user_token', userToken);

    // Choose validation schema based on workflow mode
    if (isWhatsAppMode) {
      // WhatsApp workflow - validate phone
      const validationResult = feedbackSchemaWhatsApp.safeParse({
        merchant_id: shopId,
        rating,
        comment: feedback || undefined,
        customer_phone: phone,
        user_token: userToken,
      });

      if (!validationResult.success) {
        const formErrors = validationResult.error.flatten().fieldErrors;
        if (formErrors.customer_phone) {
          const phoneErr = formErrors.customer_phone[0];
          setPhoneError(phoneErr === 'Numéro de téléphone requis' ? t('form.phoneRequired') : t('form.phoneInvalid'));
        }
        return;
      }

      setPhoneError('');
      setLoading(true);

      const sanitizedData = validationResult.data;
      const sanitizedPhone = sanitizePhone(sanitizedData.customer_phone);

      const { error } = await supabase.from('feedback').insert({
        merchant_id: sanitizedData.merchant_id,
        rating: sanitizedData.rating,
        comment: sanitizedData.comment ? sanitizeString(sanitizedData.comment, 2000) : null,
        customer_phone: sanitizedPhone,
        is_positive: sanitizedData.rating >= 4,
        user_token: sanitizedData.user_token,
      });

      setLoading(false);

      if (!error) {
        // Send notification to merchant
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: sanitizedData.merchant_id,
            type: 'feedback',
            title: sanitizedData.rating >= 4 ? '⭐ Nouvel avis positif' : '📝 Nouvel avis',
            message: `${sanitizedPhone} a laissé un avis de ${sanitizedData.rating} étoile${sanitizedData.rating > 1 ? 's' : ''}.`,
            data: { rating: sanitizedData.rating, customerPhone: sanitizedPhone, isPositive: sanitizedData.rating >= 4 },
          }),
        }).catch(() => {}); // Fire and forget

        // Create loyalty card if merchant has loyalty enabled
        let loyaltyCardQrCode = '';
        let isNewLoyaltyClient = true;

        if (merchant?.loyalty_enabled) {
          try {
            const loyaltyRes = await fetch('/api/loyalty/client', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchantId: sanitizedData.merchant_id,
                phone: sanitizedPhone,
                userToken: sanitizedData.user_token,
                language: currentLang,
              }),
            });

            if (loyaltyRes.ok) {
              const loyaltyData = await loyaltyRes.json();
              loyaltyCardQrCode = loyaltyData.client?.qr_code_data || '';
              isNewLoyaltyClient = loyaltyData.isNew === true; // Only true if explicitly new
              console.log('[RATE] Loyalty API response:', {
                isNew: loyaltyData.isNew,
                isNewLoyaltyClient,
                phone: sanitizedPhone,
                qrCode: loyaltyCardQrCode
              });
            }
          } catch {
            // Continue without loyalty card
          }
        }

        if (rating >= 4) {
          // Redirect to intermediate page with phone number and optional loyalty card QR
          let redirectUrl = `/redirect/${shopId}?phone=${encodeURIComponent(sanitizedPhone)}&lang=${currentLang}`;
          if (loyaltyCardQrCode) {
            redirectUrl += `&cardQr=${encodeURIComponent(loyaltyCardQrCode)}`;
            redirectUrl += `&newClient=${isNewLoyaltyClient ? '1' : '0'}`;
          }
          router.push(redirectUrl);
        } else {
          // Redirect to thank-you page for negative ratings
          router.push(`/rate/${shopId}/thank-you?lang=${currentLang}`);
        }
      }
    } else {
      // Web workflow - validate email (original behavior)
      const validationResult = feedbackSchema.safeParse({
        merchant_id: shopId,
        rating,
        comment: feedback || undefined,
        customer_email: email,
        user_token: userToken,
      });

      if (!validationResult.success) {
        const formErrors = validationResult.error.flatten().fieldErrors;
        if (formErrors.customer_email) {
          const emailErr = formErrors.customer_email[0];
          setEmailError(emailErr === 'Email requis' ? t('form.emailRequired') : t('form.emailInvalid'));
        }
        return;
      }

      setEmailError('');
      setLoading(true);

      const sanitizedData = validationResult.data;

      const { error } = await supabase.from('feedback').insert({
        merchant_id: sanitizedData.merchant_id,
        rating: sanitizedData.rating,
        comment: sanitizedData.comment ? sanitizeString(sanitizedData.comment, 2000) : null,
        customer_email: sanitizedData.customer_email,
        is_positive: sanitizedData.rating >= 4,
        user_token: sanitizedData.user_token,
      });

      setLoading(false);

      if (!error) {
        // Send notification to merchant
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: sanitizedData.merchant_id,
            type: 'feedback',
            title: sanitizedData.rating >= 4 ? '⭐ Nouvel avis positif' : '📝 Nouvel avis',
            message: `${sanitizedData.customer_email} a laissé un avis de ${sanitizedData.rating} étoile${sanitizedData.rating > 1 ? 's' : ''}.`,
            data: { rating: sanitizedData.rating, customerEmail: sanitizedData.customer_email, isPositive: sanitizedData.rating >= 4 },
          }),
        }).catch(() => {}); // Fire and forget

        // Create loyalty card if merchant has loyalty enabled
        if (merchant?.loyalty_enabled) {
          fetch('/api/loyalty/client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchantId: sanitizedData.merchant_id,
              email: sanitizedData.customer_email,
              userToken: sanitizedData.user_token,
              language: currentLang, // Pass language for notifications
            }),
          }).catch(() => {}); // Fire and forget
        }

        if (rating >= 4) {
          // Redirect to intermediate page for positive ratings
          router.push(`/redirect/${shopId}?lang=${currentLang}`);
        } else {
          // Redirect to thank-you page for negative ratings
          router.push(`/rate/${shopId}/thank-you?lang=${currentLang}`);
        }
      }
    }
  };

  if (!isClient || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-600 to-violet-700">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-600 to-violet-700 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Commerce introuvable</h1>
          <p className="text-gray-600 mb-6">Désolé, nous n'avons pas pu trouver ce commerce. Veuillez vérifier le lien.</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const hasBackground = merchant.background_url;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image with Overlay */}
      {hasBackground ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${merchant.background_url})` }}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-600 to-violet-700"></div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        {merchant.logo_url && (
          <div className="flex justify-center mb-8">
            <img 
              src={merchant.logo_url} 
              alt={merchant.business_name} 
              className="h-40 object-contain drop-shadow-lg" 
            />
          </div>
        )}

        {/* Language Switcher */}
        <div className="mb-4" />

        {/* Rating Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Star className="w-6 h-6 text-pink-600 fill-pink-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              {merchant.business_name || merchant.name}
            </h1>
          </div>

          <p className="text-center text-gray-600 mb-8">{t('rating.subtitle')}</p>

          {!rating ? (
            <div>
              <h2 className="text-xl font-semibold text-center mb-6 text-gray-900">{t('rating.title')}</h2>
              <StarRating onRate={handleRating} submitLabel={isFr ? 'Valider ma note' : 'Submit my rating'} />
            </div>
          ) : rating < 4 ? (
            <div className="space-y-5">
              {/* Message bienveillant */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <Heart className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-amber-800">
                  {isFr
                    ? 'Merci pour votre honnêteté !'
                    : 'Thank you for your honesty!'}
                </p>
                <p className="text-xs text-amber-700">
                  {isFr
                    ? 'Votre avis compte beaucoup pour nous. Dites-nous comment nous pouvons nous améliorer, nous lisons chaque commentaire avec attention.'
                    : 'Your feedback means a lot to us. Tell us how we can improve — we read every comment carefully.'}
                </p>
              </div>

              {/* Champ commentaire */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {isFr ? 'Votre commentaire' : 'Your comment'}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={isFr ? 'Qu\'est-ce qui pourrait être amélioré ?' : 'What could be improved?'}
                  rows={3}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all resize-none text-sm"
                />
              </div>

              {/* Contact Field - Email or Phone based on workflow mode */}
              {isWhatsAppMode ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4 text-green-600" />
                    {t('form.yourPhone')} <span className="text-red-500">*</span>
                  </label>
                  <PhoneInputWithCountry
                    value={phone}
                    onChange={(value) => {
                      setPhone(value);
                      setPhoneError('');
                    }}
                    placeholder={t('form.phonePlaceholder')}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {phoneError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 text-pink-600" />
                    {t('form.yourEmail')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder={t('form.emailPlaceholder')}
                      className={`w-full p-4 pl-11 border-2 ${
                        emailError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-pink-500'
                      } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {emailError}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleFeedbackSubmit}
                disabled={loading}
                className="w-full bg-pink-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? t('common.loading') : (isFr ? 'Envoyer mon avis' : 'Send my feedback')}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-center text-gray-900">{t('social.title')}</h2>
              <p className="text-center text-gray-600">{t('social.subtitle')}</p>

              {/* Contact Field - Email or Phone based on workflow mode */}
              {isWhatsAppMode ? (
                // WhatsApp Mode - Phone Input with Country Code
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4 text-green-600" />
                    {t('form.yourPhone')} <span className="text-red-500">*</span>
                  </label>
                  <PhoneInputWithCountry
                    value={phone}
                    onChange={(value) => {
                      setPhone(value);
                      setPhoneError('');
                    }}
                    placeholder={t('form.phonePlaceholder')}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {phoneError}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{t('form.phoneHint')}</p>
                </div>
              ) : (
                // Web Mode - Email Input
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4 text-pink-600" />
                    {t('form.yourEmail')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder={t('form.emailPlaceholder')}
                      className={`w-full p-4 pl-11 border-2 ${
                        emailError ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-pink-500'
                      } rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                      required
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {emailError && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {emailError}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleFeedbackSubmit}
                disabled={loading}
                className="w-full bg-pink-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? t('common.loading') : t('common.submit')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

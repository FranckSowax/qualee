'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { supabase } from '@/lib/supabase/client';
import { Star, ExternalLink, MessageCircle, CheckCircle, AlertCircle, Loader2, Gift, Sparkles } from 'lucide-react';
import Image from 'next/image';
import '@/lib/i18n/config';

// Platform logos - using official brand colors and SVG paths
const PlatformLogos = {
  google: (
    <svg viewBox="0 0 24 24" className="w-16 h-16">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  tripadvisor: (
    <svg viewBox="0 0 24 24" className="w-16 h-16">
      <circle cx="12" cy="12" r="11" fill="#34E0A1"/>
      <circle cx="8" cy="12" r="4" fill="white"/>
      <circle cx="16" cy="12" r="4" fill="white"/>
      <circle cx="8" cy="12" r="2" fill="#1A1A1A"/>
      <circle cx="16" cy="12" r="2" fill="#1A1A1A"/>
      <path d="M12 6 L14 9 L10 9 Z" fill="#1A1A1A"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-16 h-16">
      <rect width="24" height="24" rx="4" fill="#000"/>
      <path d="M17.5 8.5c-1.4 0-2.6-.8-3.2-2v7.5c0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5 2-4.5 4.5-4.5c.2 0 .5 0 .7.1v2.4c-.2-.1-.5-.1-.7-.1-1.2 0-2.1 1-2.1 2.1s1 2.1 2.1 2.1c1.2 0 2.2-.9 2.2-2.1V4h2.4c.2 1.8 1.6 3.2 3.4 3.4v1.1z" fill="#FE2C55"/>
      <path d="M17.5 8.5c-1.4 0-2.6-.8-3.2-2v7.5c0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5 2-4.5 4.5-4.5c.2 0 .5 0 .7.1v2.4c-.2-.1-.5-.1-.7-.1-1.2 0-2.1 1-2.1 2.1s1 2.1 2.1 2.1c1.2 0 2.2-.9 2.2-2.1V4h2.4c.2 1.8 1.6 3.2 3.4 3.4v1.1z" fill="#25F4EE" transform="translate(-1, -1)"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-16 h-16">
      <defs>
        <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80"/>
          <stop offset="25%" stopColor="#FCAF45"/>
          <stop offset="50%" stopColor="#F77737"/>
          <stop offset="75%" stopColor="#F56040"/>
          <stop offset="100%" stopColor="#C13584"/>
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#instagram-gradient)"/>
      <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="2"/>
      <circle cx="18" cy="6" r="1.5" fill="white"/>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="white" strokeWidth="2"/>
    </svg>
  ),
};

export default function RedirectPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = params.shopId as string;

  // Get phone number, language, and loyalty card info from URL params
  const phoneNumber = searchParams.get('phone');
  const langFromUrl = searchParams.get('lang');
  const currentLang = langFromUrl || i18n.language || 'en';

  // Loyalty card QR code for 2nd WhatsApp button
  const cardQrCode = searchParams.get('cardQr');
  // Is this a new loyalty client? (affects WhatsApp message content)
  // newClient=1 means new, newClient=0 means returning, absence means new (fallback)
  const newClientParam = searchParams.get('newClient');
  const isNewClient = newClientParam === '1' || newClientParam === null; // Only true if explicitly '1' or not set

  // Debug log
  if (typeof window !== 'undefined') {
    console.log('[REDIRECT] Client status:', { newClientParam, isNewClient, cardQrCode });
  }

  const [merchant, setMerchant] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [canProceed, setCanProceed] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [strategy, setStrategy] = useState('google_maps');
  const [hasClickedSocial, setHasClickedSocial] = useState(false);

  // WhatsApp workflow states
  const [whatsappCountdown, setWhatsappCountdown] = useState(20);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');

  // Determine workflow mode
  const workflowMode = merchant?.workflow_mode || 'web';
  const isWhatsAppMode = workflowMode === 'whatsapp' && phoneNumber;

  useEffect(() => {
    setIsClient(true);
    // Apply language from URL if provided
    if (langFromUrl && i18n.language !== langFromUrl) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [langFromUrl, i18n]);

  useEffect(() => {
    const fetchMerchant = async () => {
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
        
        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const today = new Date().getDay();
        // Convert to Monday-based index (0 = Monday, 6 = Sunday)
        const dayIndex = today === 0 ? 6 : today - 1;
        
        // Get weekly schedule if available
        let currentStrategy = 'google_maps';
        if (data.weekly_schedule) {
          try {
            const schedule = JSON.parse(data.weekly_schedule);
            if (Array.isArray(schedule) && schedule.length === 7) {
              currentStrategy = schedule[dayIndex];
            }
          } catch (e) {
            currentStrategy = data.redirect_strategy || 'google_maps';
          }
        } else {
          currentStrategy = data.redirect_strategy || 'google_maps';
        }
        
        setStrategy(currentStrategy);

        // Set redirect URL based on strategy
        let url = '';
        switch (currentStrategy) {
          case 'google_maps':
            url = data.google_maps_url;
            break;
          case 'tripadvisor':
            url = data.tripadvisor_url;
            break;
          case 'tiktok':
            url = data.tiktok_url;
            break;
          case 'instagram':
            url = data.instagram_url;
            break;
        }
        setRedirectUrl(url);
      }
    };

    fetchMerchant();
  }, [shopId]);

  // Countdown timer - only starts after social link is clicked (Web mode)
  useEffect(() => {
    if (!isWhatsAppMode && hasClickedSocial && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isWhatsAppMode && hasClickedSocial && countdown === 0) {
      setCanProceed(true);
    }
  }, [countdown, hasClickedSocial, isWhatsAppMode]);

  // WhatsApp countdown timer - starts after social link is clicked
  useEffect(() => {
    if (isWhatsAppMode && hasClickedSocial && whatsappCountdown > 0 && !whatsappSending && !whatsappSent) {
      const timer = setTimeout(() => {
        setWhatsappCountdown(whatsappCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isWhatsAppMode && hasClickedSocial && whatsappCountdown === 0 && !whatsappSending && !whatsappSent) {
      // Auto-send WhatsApp message
      sendWhatsAppMessage();
    }
  }, [whatsappCountdown, hasClickedSocial, isWhatsAppMode, whatsappSending, whatsappSent]);

  // Function to send WhatsApp message via API
  // If cardQrCode is provided, the message will have 2 buttons (Spin + Card)
  const sendWhatsAppMessage = async () => {
    if (!phoneNumber || !shopId) return;

    setWhatsappSending(true);
    setWhatsappError('');

    // Build card URL if we have a QR code
    const cardUrl = cardQrCode
      ? `${window.location.origin}/card/${cardQrCode}`
      : undefined;

    console.log('[REDIRECT] Sending WhatsApp:', {
      cardUrl,
      isNewClient,
      language: currentLang,
      langFromUrl,
      i18nLanguage: i18n.language
    });

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: shopId,
          phoneNumber: phoneNumber,
          language: currentLang,
          cardUrl, // If provided, API will add 2nd button
          isNewClient, // Affects message content (welcome vs returning)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setWhatsappError(data.error || t('whatsapp.sendError'));
        setWhatsappSending(false);
        return;
      }

      setWhatsappSent(true);
      setWhatsappSending(false);
    } catch (error) {
      setWhatsappError(t('whatsapp.sendError'));
      setWhatsappSending(false);
    }
  };

  const getStrategyInfo = () => {
    // Get the appropriate message based on workflow mode
    const getWorkflowMessage = (isReview: boolean) => {
      if (isReview) {
        // Review platforms (Google, TripAdvisor)
        if (isWhatsAppMode) {
          return t('redirect.reviewMessageWhatsapp');
        }
        return t('redirect.reviewMessageWeb');
      } else {
        // Social platforms (TikTok, Instagram)
        if (isWhatsAppMode) {
          return t('redirect.socialMessageWhatsapp');
        }
        return t('redirect.socialMessageWeb');
      }
    };

    switch (strategy) {
      case 'google_maps':
        return {
          logo: PlatformLogos.google,
          showStars: true,
          name: 'Google',
          title: t('redirect.yourFeedbackPrecious'),
          message: getWorkflowMessage(true),
          buttonText: t('redirect.leaveReview'),
          bg: 'bg-white',
          border: 'border-gray-200',
          text_color: 'text-gray-800',
          button_bg: 'bg-[#4285F4]',
          button_hover: 'hover:bg-[#3367D6]'
        };
      case 'tripadvisor':
        return {
          logo: PlatformLogos.tripadvisor,
          showStars: true,
          name: 'TripAdvisor',
          title: t('redirect.yourFeedbackPrecious'),
          message: getWorkflowMessage(true),
          buttonText: t('redirect.leaveReview'),
          bg: 'bg-white',
          border: 'border-[#34E0A1]',
          text_color: 'text-gray-800',
          button_bg: 'bg-[#34E0A1]',
          button_hover: 'hover:bg-[#2BC98E]'
        };
      case 'tiktok':
        return {
          logo: PlatformLogos.tiktok,
          showStars: false,
          name: 'TikTok',
          title: t('redirect.followUs'),
          message: getWorkflowMessage(false),
          buttonText: t('redirect.followOnTikTok'),
          bg: 'bg-white',
          border: 'border-gray-300',
          text_color: 'text-gray-800',
          button_bg: 'bg-black',
          button_hover: 'hover:bg-gray-900'
        };
      case 'instagram':
        return {
          logo: PlatformLogos.instagram,
          showStars: false,
          name: 'Instagram',
          title: t('redirect.followUs'),
          message: getWorkflowMessage(false),
          buttonText: t('redirect.followOnInstagram'),
          bg: 'bg-white',
          border: 'border-pink-200',
          text_color: 'text-gray-800',
          button_bg: 'bg-gradient-to-r from-[#F56040] via-[#C13584] to-[#833AB4]',
          button_hover: 'hover:opacity-90'
        };
      default:
        return {
          logo: PlatformLogos.google,
          showStars: true,
          name: 'Google',
          title: t('redirect.yourFeedbackPrecious'),
          message: getWorkflowMessage(true),
          buttonText: t('redirect.leaveReview'),
          bg: 'bg-white',
          border: 'border-gray-200',
          text_color: 'text-gray-800',
          button_bg: 'bg-[#4285F4]',
          button_hover: 'hover:bg-[#3367D6]'
        };
    }
  };

  const handleOpenSocial = () => {
    if (redirectUrl) {
      window.open(redirectUrl, '_blank');
      setHasClickedSocial(true);
    }
  };

  const handleLaunchWheel = () => {
    // Redirect to wheel/spin page with phone number and language
    let spinUrl = `/spin/${shopId}?lang=${currentLang}`;
    if (phoneNumber) {
      spinUrl += `&phone=${encodeURIComponent(phoneNumber)}`;
    }
    router.push(spinUrl);
  };

  if (!isClient || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-700">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  const hasBackground = merchant.background_url;
  const strategyInfo = getStrategyInfo();

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
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600 to-teal-700"></div>
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

        {/* Redirect Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Platform Card - Inspired by the reference image */}
          <div className={`${strategyInfo.bg} ${strategyInfo.border} border-2 rounded-2xl p-6 mb-6 shadow-sm`}>
            {/* Platform Logo */}
            <div className="flex justify-center mb-4">
              {strategyInfo.logo}
            </div>

            {/* 5 Stars - Only for review platforms */}
            {strategyInfo.showStars && (
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-7 h-7 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
            )}

            {/* Title */}
            <h2 className={`text-xl font-bold ${strategyInfo.text_color} text-center mb-3`}>
              {strategyInfo.title}
            </h2>

            {/* Message with highlight - Only show if NOT WhatsApp mode (banner replaces it) */}
            {!isWhatsAppMode && (
              <p className={`text-sm ${strategyInfo.text_color} text-center leading-relaxed`}>
                {strategyInfo.message.split('**').map((part, index) =>
                  index % 2 === 1 ? (
                    <span key={index} className="font-bold text-teal-600 underline decoration-2 underline-offset-2">
                      {part}
                    </span>
                  ) : (
                    <span key={index}>{part}</span>
                  )
                )}
              </p>
            )}
          </div>

          {/* Button Flow */}
          {isWhatsAppMode ? (
            // WhatsApp Workflow
            <>
              {!hasClickedSocial ? (
                <div className="space-y-4">
                  {/* WhatsApp Hint Banner - Above button */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Gift className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-800 text-sm mb-1">
                          {t('redirect.whatsappHintTitle')}
                        </p>
                        <p className="text-xs text-green-700 leading-relaxed">
                          {t('redirect.whatsappHintMessage')}
                        </p>
                      </div>
                      <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 animate-pulse" />
                    </div>
                  </div>

                  <Button
                    onClick={handleOpenSocial}
                    className={`w-full ${strategyInfo.button_bg} ${strategyInfo.button_hover} text-white py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg`}
                  >
                    <ExternalLink className="w-5 h-5" />
                    {strategyInfo.buttonText}
                  </Button>
                </div>
              ) : whatsappSending ? (
                // Sending WhatsApp message
                <div className="text-center space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800">
                      {t('whatsapp.sending')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('whatsapp.pleaseWait')}
                    </p>
                  </div>
                </div>
              ) : whatsappSent ? (
                // WhatsApp message sent successfully
                <div className="text-center space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800">
                      {t('whatsapp.sent')}
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 justify-center mb-2">
                        <MessageCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">{t('whatsapp.checkYourPhone')}</span>
                      </div>
                      <p className="text-sm text-green-700">
                        {t('whatsapp.linkSentTo')} {phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>
              ) : whatsappError ? (
                // WhatsApp error
                <div className="text-center space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800">
                      {t('whatsapp.errorTitle')}
                    </p>
                    <p className="text-sm text-red-600">{whatsappError}</p>
                    <Button
                      onClick={sendWhatsAppMessage}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-xl font-semibold"
                    >
                      {t('whatsapp.retry')}
                    </Button>
                  </div>
                </div>
              ) : (
                // WhatsApp countdown before sending
                <div className="text-center space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800">
                      {t('whatsapp.preparingMessage')}
                    </p>
                    <div className="bg-white/90 rounded-full w-14 h-14 flex items-center justify-center shadow-lg border-2 border-green-200">
                      <span className="text-2xl font-bold text-green-600">{whatsappCountdown}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {t('whatsapp.sendingIn', { seconds: whatsappCountdown })}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Web Workflow (original behavior)
            <>
              {!hasClickedSocial ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleOpenSocial}
                    className={`w-full ${strategyInfo.button_bg} ${strategyInfo.button_hover} text-white py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg`}
                  >
                    <ExternalLink className="w-5 h-5" />
                    {strategyInfo.buttonText}
                  </Button>
                </div>
              ) : !canProceed ? (
                <div className="text-center space-y-4">
                  <div className="relative">
                    <Button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 cursor-not-allowed py-4 rounded-xl font-semibold text-lg"
                    >
                      {t('redirect.iDone')}
                    </Button>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-white/90 rounded-full w-14 h-14 flex items-center justify-center shadow-lg border-2 border-teal-200">
                        <span className="text-2xl font-bold text-teal-600">{countdown}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t('redirect.buttonActiveIn', { seconds: countdown })}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleLaunchWheel}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                  >
                    <Star className="w-5 h-5" />
                    {t('redirect.iDoneLaunchWheel')}
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    {t('redirect.clickToSpinAndWin')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

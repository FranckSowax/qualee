'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Prize } from '@/lib/types/database';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';

// Types
type SegmentType = 'prize' | 'unlucky' | 'retry';

interface WheelSegment {
  type: SegmentType;
  prize?: Prize;
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
}

interface SegmentColor {
  color: string;
  textColor: string;
  borderColor: string;
}

// Default 8-segment color palette (S1-S6 = prizes, S7 = UNLUCKY, S8 = RETRY)
const DEFAULT_SEGMENT_COLORS: SegmentColor[] = [
  { color: '#FF6B6B', textColor: '#FFFFFF', borderColor: '#FF5252' },
  { color: '#4ECDC4', textColor: '#FFFFFF', borderColor: '#26A69A' },
  { color: '#45B7D1', textColor: '#FFFFFF', borderColor: '#2196F3' },
  { color: '#96CEB4', textColor: '#FFFFFF', borderColor: '#4CAF50' },
  { color: '#FFEAA7', textColor: '#2D3436', borderColor: '#FDCB6E' },
  { color: '#DDA0DD', textColor: '#FFFFFF', borderColor: '#BA55D3' },
  { color: '#DC2626', textColor: '#FFFFFF', borderColor: '#B91C1C' },  // UNLUCKY
  { color: '#F59E0B', textColor: '#1F2937', borderColor: '#D97706' },  // RETRY
];

// Split text into max 2 lines for segment labels
const splitTextForSegment = (text: string): string[] => {
  if (text.length <= 8) return [text];
  const midPoint = Math.ceil(text.length / 2);
  let cutIndex = text.indexOf(' ', midPoint - 3);
  if (cutIndex === -1 || cutIndex > midPoint + 4) {
    cutIndex = text.lastIndexOf(' ', midPoint);
  }
  if (cutIndex === -1 || cutIndex < 3) {
    return [text.slice(0, midPoint), text.slice(midPoint)];
  }
  return [text.slice(0, cutIndex), text.slice(cutIndex + 1)];
};

// Confetti hook
const useConfetti = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    color: string; size: number; rotation: number; rotationSpeed: number;
  }>>([]);
  const animationRef = useRef<number | null>(null);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFD93D', '#6C5CE7'];

  const createParticles = useCallback((x: number, y: number, count: number = 60) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
    particlesRef.current = particles;
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.99; p.rotation += p.rotationSpeed;
      if (p.y > canvas.height + 50) return false;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      return true;
    });
    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, []);

  const trigger = useCallback((x: number, y: number) => {
    createParticles(x, y, 50);
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animate();
  }, [createParticles, animate]);

  useEffect(() => () => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
  }, []);

  return { canvasRef, trigger };
};

export default function SpinPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();
  const shopId = params.shopId as string;

  const phoneFromUrl = searchParams.get('phone');
  const langFromUrl = searchParams.get('lang');
  const currentLang = langFromUrl || i18n.language || 'en';

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinsRemaining, setSpinsRemaining] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string>('');
  const [resultType, setResultType] = useState<'win' | 'retry' | 'lost' | null>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [unluckyProbability, setUnluckyProbability] = useState(20);
  const [retryProbability, setRetryProbability] = useState(10);
  const [segmentColors, setSegmentColors] = useState<SegmentColor[]>(DEFAULT_SEGMENT_COLORS);

  const wheelRef = useRef<HTMLDivElement>(null);
  const { canvasRef, trigger } = useConfetti();

  useEffect(() => {
    setIsClient(true);
    if (langFromUrl && i18n.language !== langFromUrl) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [langFromUrl, i18n]);

  useEffect(() => {
    const checkSpinEligibility = async () => {
      const userToken = localStorage.getItem('user_token');

      if (userToken) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data } = await supabase
          .from('spins')
          .select('*')
          .eq('merchant_id', shopId)
          .eq('user_token', userToken)
          .gte('created_at', today.toISOString())
          .single();

        if (data) {
          setHasSpun(true);
        }
      }

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', shopId)
        .single();

      if (merchantData) {
        setMerchant(merchantData);
        if (merchantData.unlucky_probability !== undefined) {
          setUnluckyProbability(merchantData.unlucky_probability);
        }
        if (merchantData.retry_probability !== undefined) {
          setRetryProbability(merchantData.retry_probability);
        }
        // Load custom segment colors
        if (merchantData.segment_colors && Array.isArray(merchantData.segment_colors) && merchantData.segment_colors.length > 0) {
          setSegmentColors(merchantData.segment_colors);
        }
      }

      const { data: prizesData } = await supabase
        .from('prizes')
        .select('*')
        .eq('merchant_id', shopId)
        .order('id', { ascending: true });

      if (prizesData) {
        setPrizes(prizesData);
      }
      setLoading(false);
    };

    checkSpinEligibility();
  }, [shopId]);

  // Generate wheel segments (same logic as before)
  const generateWheelSegments = (): WheelSegment[] => {
    const segments: WheelSegment[] = [];
    const unluckyColor = segmentColors[6] || DEFAULT_SEGMENT_COLORS[6];
    const retryColor = segmentColors[7] || DEFAULT_SEGMENT_COLORS[7];

    segments.push({ type: 'unlucky', label: '#UNLUCKY#', ...unluckyColor });
    segments.push({ type: 'retry', label: '#REESSAYER#', ...retryColor });

    if (prizes.length === 0) {
      segments.push({ type: 'unlucky', label: '#UNLUCKY#', ...unluckyColor });
      segments.push({ type: 'retry', label: '#REESSAYER#', ...retryColor });
      segments.push({ type: 'unlucky', label: '#UNLUCKY#', ...unluckyColor });
      segments.push({ type: 'retry', label: '#REESSAYER#', ...retryColor });
      return segments;
    }

    let colorIdx = 0;
    let prizeSegments: WheelSegment[] = prizes.map(prize => {
      const c = segmentColors[colorIdx % 6] || DEFAULT_SEGMENT_COLORS[colorIdx % 6];
      colorIdx++;
      return {
        type: 'prize' as const,
        prize,
        label: prize.name,
        color: c.color,
        textColor: c.textColor,
        borderColor: c.borderColor,
      };
    });

    if (prizes.length < 3) {
      const duplicated = [...prizeSegments];
      while (duplicated.length < 4) {
        duplicated.push(...prizeSegments.slice(0, Math.min(prizeSegments.length, 4 - duplicated.length)));
      }
      prizeSegments = duplicated;
    }

    segments.push(...prizeSegments);

    if (segments.length > 8) {
      const specialSegments = segments.filter(s => s.type !== 'prize');
      const prizeSegs = segments.filter(s => s.type === 'prize').slice(0, 8 - specialSegments.length);
      return [...specialSegments, ...prizeSegs];
    }

    while (segments.length < 6) {
      segments.push({ type: 'unlucky', label: '#UNLUCKY#', ...unluckyColor });
    }

    // Interleave segments
    const prizeSegs = segments.filter(s => s.type === 'prize');
    const specialSegs = segments.filter(s => s.type !== 'prize');
    const interleaved: WheelSegment[] = [];

    const maxLen = Math.max(prizeSegs.length, specialSegs.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < prizeSegs.length) interleaved.push(prizeSegs[i]);
      if (i < specialSegs.length) interleaved.push(specialSegs[i]);
    }

    return interleaved;
  };

  const allSegments = generateWheelSegments();
  const totalSegments = allSegments.length;
  const segmentAngle = totalSegments > 0 ? 360 / totalSegments : 0;

  const selectWinningSegment = () => {
    const totalPrizeProbability = prizes.reduce((sum, prize) => sum + (prize.probability || 0), 0);
    const totalProbability = totalPrizeProbability + unluckyProbability + retryProbability;
    const random = Math.random() * totalProbability;

    let currentProb = 0;
    for (let i = 0; i < allSegments.length; i++) {
      const segment = allSegments[i];
      if (segment.type === 'prize' && segment.prize) {
        currentProb += (segment.prize.probability || 0);
        if (random <= currentProb) return i;
      } else if (segment.type === 'unlucky') {
        const unluckyCount = allSegments.filter(s => s.type === 'unlucky').length;
        currentProb += unluckyProbability / unluckyCount;
        if (random <= currentProb) return i;
      } else if (segment.type === 'retry') {
        const retryCount = allSegments.filter(s => s.type === 'retry').length;
        currentProb += retryProbability / retryCount;
        if (random <= currentProb) return i;
      }
    }
    return 0;
  };

  const spinWheel = async () => {
    if (isSpinning || spinsRemaining <= 0) return;

    setIsSpinning(true);
    setSpinsRemaining(prev => prev - 1);
    setResult('');
    setResultType(null);
    setCouponCode('');

    const winningSegmentIndex = selectWinningSegment();
    const winningSegment = allSegments[winningSegmentIndex];

    let type: 'win' | 'retry' | 'lost' = 'lost';
    let selectedPrize: Prize | undefined = undefined;

    if (winningSegment.type === 'prize' && winningSegment.prize) {
      type = 'win';
      selectedPrize = winningSegment.prize;
    } else if (winningSegment.type === 'retry') {
      type = 'retry';
    }

    // Calculate target rotation
    const segmentCenterAngle = winningSegmentIndex * segmentAngle + segmentAngle / 2 - 90;
    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.6;
    const targetAngle = -segmentCenterAngle - 90 + randomOffset;
    const currentNormalized = rotation % 360;
    const distToTarget = ((targetAngle - currentNormalized) % 360 + 360) % 360;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const totalRotation = rotation + extraSpins * 360 + distToTarget;

    setRotation(totalRotation);

    // Vibration on spin start
    try { navigator.vibrate(30); } catch {}

    setTimeout(async () => {
      await handleSpinComplete(selectedPrize, type);
      setIsSpinning(false);
    }, 5200);
  };

  const handleSpinComplete = async (prize: Prize | undefined, type: 'win' | 'retry' | 'lost') => {
    setResultType(type);

    // Vibration on landing
    try { navigator.vibrate(20); } catch {}

    if (type === 'win' && prize) {
      // Vibration pattern for win
      try { navigator.vibrate([50, 30, 50, 30, 100]); } catch {}

      setIsSaving(true);
      setSaveError(false);
      setResult(prize.name);

      // Confetti
      if (wheelRef.current) {
        const rect = wheelRef.current.getBoundingClientRect();
        trigger(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }

      // Second confetti burst from left and right
      setTimeout(() => {
        if (wheelRef.current) {
          const rect = wheelRef.current.getBoundingClientRect();
          trigger(rect.left + rect.width * 0.2, rect.top + rect.height * 0.3);
          trigger(rect.left + rect.width * 0.8, rect.top + rect.height * 0.3);
        }
      }, 300);

      try {
        const userToken = localStorage.getItem('user_token') || crypto.randomUUID();
        localStorage.setItem('user_token', userToken);

        const { data: spinData, error: spinError } = await supabase
          .from('spins')
          .insert({
            merchant_id: shopId,
            prize_id: prize.id,
            user_token: userToken,
          })
          .select()
          .single();

        if (spinError) throw spinError;

        if (spinData) {
          const generatedCode = `${merchant.business_name?.substring(0, 3).toUpperCase()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error: couponError } = await supabase.from('coupons').insert({
            spin_id: spinData.id,
            merchant_id: shopId,
            code: generatedCode,
            prize_name: prize.name,
            expires_at: expiresAt.toISOString(),
          });

          if (couponError) throw couponError;
          setCouponCode(generatedCode);

          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchantId: shopId,
              type: 'spin',
              title: '🎰 Nouveau gain !',
              message: `Un client a gagné "${prize.name}" !`,
              data: { prizeName: prize.name, couponCode: generatedCode },
            }),
          }).catch(() => {});

          // Send WhatsApp congratulation message if phone number is available
          if (phoneFromUrl) {
            try {
              const congratsResponse = await fetch('/api/whatsapp/congratulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  merchantId: shopId,
                  phoneNumber: phoneFromUrl,
                  prizeName: prize.name,
                  couponCode: generatedCode,
                  language: currentLang,
                }),
              });
              const congratsData = await congratsResponse.json();
              if (!congratsResponse.ok) {
                console.error('[SPIN] WhatsApp congratulate failed:', congratsResponse.status, congratsData);
              } else {
                console.log('[SPIN] WhatsApp congratulate sent:', congratsData);
              }
            } catch (err) {
              console.error('[SPIN] WhatsApp congratulate error:', err);
            }
          } else {
            console.warn('[SPIN] No phone in URL, skipping WhatsApp congratulate');
          }
        }
      } catch {
        setSaveError(true);
      } finally {
        setIsSaving(false);
      }
    } else if (type === 'retry') {
      setResult(t('wheel.retry'));
      setSpinsRemaining(prev => prev + 1);
    } else {
      setResult(t('wheel.unlucky'));
      setHasSpun(true);
    }
  };

  // SVG helpers
  const createSegmentPath = (index: number, outerRadius: number, innerRadius: number) => {
    const startAngle = (index * segmentAngle - 90) * Math.PI / 180;
    const endAngle = ((index + 1) * segmentAngle - 90) * Math.PI / 180;
    const cx = 200, cy = 200;
    const x1 = cx + outerRadius * Math.cos(startAngle);
    const y1 = cy + outerRadius * Math.sin(startAngle);
    const x2 = cx + outerRadius * Math.cos(endAngle);
    const y2 = cy + outerRadius * Math.sin(endAngle);
    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(startAngle);
    const y4 = cy + innerRadius * Math.sin(startAngle);
    const largeArc = segmentAngle > 180 ? 1 : 0;
    return `M ${x4} ${y4} L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const getTextPosition = (index: number) => {
    const midAngle = ((index * segmentAngle) + segmentAngle / 2 - 90) * Math.PI / 180;
    const radius = 115;
    return {
      x: 200 + radius * Math.cos(midAngle),
      y: 200 + radius * Math.sin(midAngle),
      rotation: index * segmentAngle + segmentAngle / 2 - 90,
    };
  };

  const ledLights = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * (360 / 16) - 90) * Math.PI / 180;
    return {
      x: 200 + 195 * Math.cos(angle),
      y: 200 + 195 * Math.sin(angle),
      isOn: i % 2 === 0,
    };
  });

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (hasSpun) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {merchant?.background_url ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${merchant.background_url})` }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
        )}
        <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('wheel.alreadySpun')}
          </h1>
          <p className="text-gray-600">{t('wheel.tryAgainTomorrow')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        width={typeof window !== 'undefined' ? window.innerWidth : 1920}
        height={typeof window !== 'undefined' ? window.innerHeight : 1080}
      />

      {/* Background */}
      {merchant?.background_url ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${merchant.background_url})` }}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      )}

      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[500px]">

        {/* Logo */}
        {merchant?.logo_url && (
          <div className="mb-4">
            <div
              className="w-20 h-20 rounded-full p-2 shadow-xl flex items-center justify-center border-4 border-[#fbbf24]"
              style={{ backgroundColor: merchant.logo_background_color || '#FFFFFF' }}
            >
              <img
                src={merchant.logo_url}
                alt={merchant.business_name || ''}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>
        )}

        {/* Instruction title */}
        <p className="text-white text-center text-lg sm:text-xl font-semibold mb-4 px-4 drop-shadow-lg">
          {t('wheel.instruction')}
        </p>

        {/* Wheel container */}
        <div ref={wheelRef} className="relative">
          {/* Pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 z-30 -top-3">
            <svg width="50" height="60" viewBox="0 0 50 60" className="drop-shadow-2xl">
              <defs>
                <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <path d="M25 60 L5 5 Q25 0 45 5 Z" fill="url(#pointerGrad)" stroke="#92400e" strokeWidth="2" />
              <circle cx="25" cy="12" r="6" fill="#fef3c7" stroke="#92400e" strokeWidth="2" />
            </svg>
          </div>

          {/* Wheel */}
          <div className="relative">
            {/* LED ring */}
            <svg className="absolute -inset-[10px] w-[calc(100%+20px)] h-[calc(100%+20px)]" viewBox="0 0 420 420">
              {ledLights.map((led, i) => (
                <circle
                  key={i}
                  cx={led.x + 10}
                  cy={led.y + 10}
                  r="5"
                  fill={led.isOn ? '#fbbf24' : '#451a03'}
                  className={led.isOn ? 'animate-pulse' : ''}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </svg>

            {/* Rotating wheel SVG */}
            <svg
              className="w-[80vw] h-[80vw] max-w-[340px] max-h-[340px] sm:max-w-[400px] sm:max-h-[400px]"
              viewBox="0 0 400 400"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 5.2s cubic-bezier(0.1, 0.6, 0.15, 1)' : 'none',
                filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.5))',
              }}
            >
              <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
                </radialGradient>
                <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <filter id="textShadow">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.8)" />
                </filter>
              </defs>

              {/* Outer gold rim */}
              <circle cx="200" cy="200" r="190" fill="none" stroke="url(#goldRim)" strokeWidth="8" />
              <circle cx="200" cy="200" r="182" fill="#0f172a" />

              {/* Segments */}
              {allSegments.map((segment, index) => {
                const pos = getTextPosition(index);
                const lines = splitTextForSegment(segment.label);
                const hasTwoLines = lines.length > 1;

                return (
                  <g key={`${segment.type}-${index}`}>
                    <path
                      d={createSegmentPath(index, 178, 65)}
                      fill={segment.color}
                      stroke={segment.borderColor}
                      strokeWidth="2"
                    />
                    <path
                      d={createSegmentPath(index, 178, 65)}
                      fill="url(#centerGlow)"
                      opacity="0.3"
                    />

                    {/* Text */}
                    <g transform={`rotate(${pos.rotation + 90}, ${pos.x}, ${pos.y})`}>
                      {hasTwoLines ? (
                        <>
                          <text
                            x={pos.x}
                            y={pos.y - 9}
                            fill={segment.textColor}
                            fontSize="14"
                            fontWeight="bold"
                            textAnchor="middle"
                            filter="url(#textShadow)"
                          >
                            {lines[0].toUpperCase()}
                          </text>
                          <text
                            x={pos.x}
                            y={pos.y + 10}
                            fill={segment.textColor}
                            fontSize="14"
                            fontWeight="bold"
                            textAnchor="middle"
                            filter="url(#textShadow)"
                          >
                            {lines[1].toUpperCase()}
                          </text>
                        </>
                      ) : (
                        <text
                          x={pos.x}
                          y={pos.y}
                          fill={segment.textColor}
                          fontSize="16"
                          fontWeight="bold"
                          textAnchor="middle"
                          filter="url(#textShadow)"
                        >
                          {lines[0].toUpperCase()}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}

              {/* Center decorations */}
              <circle cx="200" cy="200" r="62" fill="url(#goldRim)" />
              <circle cx="200" cy="200" r="56" fill="#0f172a" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
                <line key={angle} x1="200" y1="148" x2="200" y2="158" stroke="#fbbf24" strokeWidth="2" transform={`rotate(${angle}, 200, 200)`} />
              ))}
              <circle cx="200" cy="200" r="20" fill="url(#goldRim)" />
              <circle cx="200" cy="200" r="14" fill="#0f172a" />
            </svg>

            {/* SPIN button overlay */}
            <button
              onClick={spinWheel}
              disabled={isSpinning || spinsRemaining <= 0}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-20 sm:h-20 rounded-full font-black text-lg sm:text-lg disabled:cursor-not-allowed z-10"
              style={{
                background: isSpinning
                  ? 'linear-gradient(145deg, #374151, #1f2937)'
                  : 'linear-gradient(145deg, #fbbf24, #f59e0b)',
                color: isSpinning ? '#6b7280' : '#78350f',
                boxShadow: isSpinning
                  ? 'inset 0 2px 8px rgba(0,0,0,0.5)'
                  : '0 8px 25px rgba(251, 191, 36, 0.4)',
                border: '3px solid #b45309',
              }}
            >
              {isSpinning ? '...' : 'SPIN'}
            </button>
          </div>
        </div>

        {/* Result display */}
        {result && (
          <div className={`mt-6 p-5 rounded-2xl text-center max-w-sm w-full ${resultType === 'win' ? 'animate-bounce-in animate-golden-glow' : ''}`} style={{
            background: resultType === 'win'
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))'
              : resultType === 'retry'
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))'
              : 'linear-gradient(135deg, rgba(80, 20, 20, 0.95), rgba(60, 20, 20, 0.95))',
            border: `2px solid ${resultType === 'win' ? '#22c55e' : resultType === 'retry' ? '#fbbf24' : '#ef4444'}`,
          }}>
            {resultType === 'win' && (
              <>
                <p className="text-2xl font-black text-white mb-2">🎊 {result}</p>
                <button
                  disabled={isSaving || !couponCode}
                  onClick={() => router.push(`/coupon/${shopId}?code=${couponCode}&lang=${currentLang}`)}
                  className={`w-full py-3 px-6 font-bold rounded-xl transition-colors text-lg ${
                    isSaving || !couponCode
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {isSaving ? 'Génération...' : 'Récupérer mon prix →'}
                </button>
                {saveError && (
                  <p className="text-red-200 mt-2 text-sm font-bold">Erreur. Veuillez réessayer.</p>
                )}
              </>
            )}
            {resultType === 'retry' && (
              <>
                <p className="text-xl font-black text-white mb-2">🔄 Tour gratuit !</p>
                <button
                  onClick={() => setResult('')}
                  className="w-full py-3 px-6 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Tourner encore ↻
                </button>
              </>
            )}
            {resultType === 'lost' && (
              <>
                <p className="text-2xl font-black text-red-300 mb-2">😢 PERDU</p>
                <p className="text-white text-sm mb-3">Meilleure chance la prochaine fois !</p>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 px-6 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-colors"
                >
                  Retour
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

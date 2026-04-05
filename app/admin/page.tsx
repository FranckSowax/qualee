'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  QrCode,
  Download,
  ExternalLink,
  Search,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Copy,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  Filter,
  Calendar,
  RotateCw,
  MessageSquare,
  Mail,
  Building2,
  Clock,
  Archive,
  Reply,
  Trash2,
  Award,
  CreditCard,
  Coins,
  ShoppingBag,
  MessageCircle,
  Phone,
  Shield,
  Settings2
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface Merchant {
  id: string;
  email: string;
  business_name: string;
  subscription_tier: string;
  logo_url?: string;
  background_url?: string;
  created_at: string;
  is_active?: boolean;
  google_maps_url?: string;
  tripadvisor_url?: string;
  tiktok_url?: string;
  instagram_url?: string;
  redirect_strategy?: string;
}

interface MerchantStats {
  totalReviews: number;
  positiveReviews: number;
  avgRating: number;
  totalSpins: number;
  couponsRedeemed?: number;
}

interface AuthUser {
  id: string;
  email?: string;
}

interface MerchantWithStats extends Merchant {
  stats: MerchantStats;
}

interface ApiResponse {
  merchants: MerchantWithStats[];
  globalStats: {
    totalMerchants: number;
    activeMerchants: number;
    totalReviews: number;
    totalSpins: number;
    totalCouponsRedeemed: number;
  };
}

type TierPricing = {
  [key: string]: number;
};

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company: string | null;
  establishments: string | null;
  message: string | null;
  status: 'new' | 'read' | 'replied' | 'archived';
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  read_at: string | null;
  replied_at: string | null;
}

interface LoyaltyClient {
  id: string;
  merchant_id: string;
  card_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  points: number;
  total_purchases: number;
  total_spent: number;
  qr_code_data: string;
  status: 'active' | 'suspended' | 'expired';
  last_visit: string | null;
  created_at: string;
  updated_at: string;
  merchant?: {
    business_name: string;
    logo_url: string | null;
  };
}

interface LoyaltyStats {
  totalCards: number;
  activeCards: number;
  totalPoints: number;
  totalPurchases: number;
  totalSpent: number;
  cardsThisMonth: number;
  pointsDistributed: number;
  pointsRedeemed: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filteredMerchants, setFilteredMerchants] = useState<Merchant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalMerchants: 0,
    activeMerchants: 0,
    totalReviews: 0,
    totalRevenue: 0,
    totalSpins: 0,
  });

  // Estimated monthly revenue per tier
  const TIER_PRICING: TierPricing = {
    'free': 0,
    'starter': 0, // Essai Gratuit (Découverte)
    'premium': 1000, // Pro Plan
  };

  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [merchantStats, setMerchantStats] = useState<Record<string, MerchantStats>>({});
  const [activeSection, setActiveSection] = useState<'dashboard' | 'merchants' | 'messages' | 'loyalty' | 'whatsapp'>('dashboard');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'starter' | 'premium'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Messages state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageStatusFilter, setMessageStatusFilter] = useState<'all' | 'new' | 'read' | 'replied' | 'archived'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [messagesCounts, setMessagesCounts] = useState({ new: 0, read: 0, replied: 0, archived: 0 });

  // Loyalty state
  const [loyaltyClients, setLoyaltyClients] = useState<LoyaltyClient[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats>({
    totalCards: 0,
    activeCards: 0,
    totalPoints: 0,
    totalPurchases: 0,
    totalSpent: 0,
    cardsThisMonth: 0,
    pointsDistributed: 0,
    pointsRedeemed: 0
  });
  const [loyaltySearch, setLoyaltySearch] = useState('');
  const [loyaltyStatusFilter, setLoyaltyStatusFilter] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');

  // WhatsApp state
  interface WhatsAppConfig {
    id?: string;
    merchant_id: string;
    provider: 'meta' | 'whapi';
    waba_id?: string;
    phone_number_id?: string;
    access_token?: string;
    display_phone?: string;
    api_key?: string;
    is_verified?: boolean;
    message_price_fcfa?: number;
    created_at?: string;
  }
  interface WhatsAppMerchant {
    id: string;
    business_name: string;
    email: string;
    config: WhatsAppConfig | null;
  }
  const [waConfigs, setWaConfigs] = useState<WhatsAppMerchant[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [waEditMerchant, setWaEditMerchant] = useState<WhatsAppMerchant | null>(null);
  const [waForm, setWaForm] = useState<{
    provider: 'meta' | 'whapi';
    waba_id: string;
    phone_number_id: string;
    access_token: string;
    display_phone: string;
    api_key: string;
    message_price_fcfa: number;
  }>({ provider: 'meta', waba_id: '', phone_number_id: '', access_token: '', display_phone: '', api_key: '', message_price_fcfa: 50 });
  const [waSaving, setWaSaving] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    if (activeSection === 'messages') {
      await loadMessages();
    } else if (activeSection === 'loyalty') {
      await loadLoyaltyData();
    } else if (activeSection === 'whatsapp') {
      await loadWhatsAppConfigs();
    } else {
      await loadMerchants();
    }
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  // Load contact messages
  const loadMessages = async () => {
    setMessagesLoading(true);
    try {
      const response = await fetch(`/api/contact?status=${messageStatusFilter}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setMessagesCounts(data.statusCounts || { new: 0, read: 0, replied: 0, archived: 0 });
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Update message status
  const updateMessageStatus = async (id: string, status: ContactMessage['status']) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (response.ok) {
        await loadMessages();
      }
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  // Delete message
  const deleteMessage = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;
    try {
      const response = await fetch('/api/contact', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        setSelectedMessage(null);
        await loadMessages();
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Load loyalty data
  const loadLoyaltyData = async () => {
    setLoyaltyLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (loyaltySearch) params.append('search', loyaltySearch);
      if (loyaltyStatusFilter !== 'all') params.append('status', loyaltyStatusFilter);

      const response = await fetch(`/api/admin/loyalty?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLoyaltyClients(data.clients || []);
        setLoyaltyStats(data.stats || {
          totalCards: 0,
          activeCards: 0,
          totalPoints: 0,
          totalPurchases: 0,
          totalSpent: 0,
          cardsThisMonth: 0,
          pointsDistributed: 0,
          pointsRedeemed: 0
        });
      }
    } catch (err) {
      console.error('Error loading loyalty data:', err);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  // Load WhatsApp configs
  const loadWhatsAppConfigs = async () => {
    setWaLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch('/api/admin/whatsapp-config', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const configMap: Record<string, WhatsAppConfig> = {};
        (data.configs || []).forEach((c: WhatsAppConfig) => { configMap[c.merchant_id] = c; });
        const merged: WhatsAppMerchant[] = (data.merchants || []).map((m: { id: string; business_name: string; email: string }) => ({
          id: m.id,
          business_name: m.business_name,
          email: m.email,
          config: configMap[m.id] || null,
        }));
        setWaConfigs(merged);
      }
    } catch (err) {
      console.error('Error loading WhatsApp configs:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const openWaConfig = (merchant: WhatsAppMerchant) => {
    setWaEditMerchant(merchant);
    const c = merchant.config;
    setWaForm({
      provider: c?.provider || 'meta',
      waba_id: c?.waba_id || '',
      phone_number_id: c?.phone_number_id || '',
      access_token: c?.access_token || '',
      display_phone: c?.display_phone || '',
      api_key: c?.api_key || '',
      message_price_fcfa: c?.message_price_fcfa || 50,
    });
  };

  const saveWaConfig = async () => {
    if (!waEditMerchant) return;
    setWaSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch('/api/admin/whatsapp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ merchantId: waEditMerchant.id, ...waForm }),
      });
      if (response.ok) {
        await loadWhatsAppConfigs();
        setWaEditMerchant(null);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Error saving WhatsApp config:', err);
    } finally {
      setWaSaving(false);
    }
  };

  const verifyWaConfig = async () => {
    if (!waEditMerchant) return;
    setWaSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch('/api/admin/whatsapp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ merchantId: waEditMerchant.id, action: 'verify', ...waForm }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Configuration vérifiée avec succès !');
        await loadWhatsAppConfigs();
        setWaEditMerchant(null);
      } else {
        alert(data.error || 'Échec de la vérification');
      }
    } catch (err) {
      console.error('Error verifying WhatsApp config:', err);
    } finally {
      setWaSaving(false);
    }
  };

  const deleteWaConfig = async () => {
    if (!waEditMerchant) return;
    if (!confirm('Supprimer la configuration WhatsApp de ce marchand ?')) return;
    setWaSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`/api/admin/whatsapp-config?merchantId=${waEditMerchant.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        await loadWhatsAppConfigs();
        setWaEditMerchant(null);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Error deleting WhatsApp config:', err);
    } finally {
      setWaSaving(false);
    }
  };

  // Track if data has been loaded to prevent duplicate calls
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Only run once on mount
    if (!dataLoaded) {
      checkAdminAuth();
    }
  }, [dataLoaded]);

  // Set up auto-refresh interval separately
  useEffect(() => {
    if (!user) return;

    // Set up real-time refresh every 60 seconds (increased from 30)
    const interval = setInterval(() => {
      loadMerchants();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  // Load messages when switching to messages section or when filter changes
  useEffect(() => {
    if (activeSection === 'messages' && user) {
      loadMessages();
    }
  }, [activeSection, messageStatusFilter, user]);

  // Load loyalty data when switching to loyalty section or when filters change
  useEffect(() => {
    if (activeSection === 'loyalty' && user) {
      loadLoyaltyData();
    }
  }, [activeSection, loyaltyStatusFilter, loyaltySearch, user]);

  // Load WhatsApp configs when switching to whatsapp section
  useEffect(() => {
    if (activeSection === 'whatsapp' && user) {
      loadWhatsAppConfigs();
    }
  }, [activeSection, user]);

  useEffect(() => {
    let filtered = merchants;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => 
        statusFilter === 'active' ? m.is_active !== false : m.is_active === false
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(m => m.subscription_tier === tierFilter);
    }

    setFilteredMerchants(filtered);
  }, [searchQuery, merchants, statusFilter, tierFilter]);

  const checkAdminAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Admin authorization check
    // The middleware already validates admin access, but we double-check here
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
    const userEmail = user.email?.toLowerCase();

    if (adminEmails.length > 0 && (!userEmail || !adminEmails.includes(userEmail))) {
      console.warn('Unauthorized admin access attempt');
      router.push('/dashboard');
      return;
    }

    setUser(user);
    await loadMerchants();
    // Load loyalty stats for dashboard display
    await loadLoyaltyStats();
    setDataLoaded(true);
    setLoading(false);
  };

  // Load only loyalty stats (for dashboard display without full client list)
  const loadLoyaltyStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/loyalty?limit=0', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLoyaltyStats(data.stats || {
          totalCards: 0,
          activeCards: 0,
          totalPoints: 0,
          totalPurchases: 0,
          totalSpent: 0,
          cardsThisMonth: 0,
          pointsDistributed: 0,
          pointsRedeemed: 0
        });
      }
    } catch (err) {
      console.error('Error loading loyalty stats:', err);
    }
  };

  const loadMerchants = async () => {
    try {
      setError(null);
      // Get session for authorization header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found');
        setError('Session non trouvée. Veuillez vous reconnecter.');
        return;
      }

      // Use admin API to fetch all merchants (bypasses RLS)
      const response = await fetch('/api/admin/merchants', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur API: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.merchants) {
        setMerchants(data.merchants);
        setFilteredMerchants(data.merchants);

        // Build stats map from API response
        const statsMap: Record<string, MerchantStats> = {};
        data.merchants.forEach((merchant: MerchantWithStats) => {
          statsMap[merchant.id] = merchant.stats;
        });
        setMerchantStats(statsMap);

        // Calculate revenue
        const totalRevenue = data.merchants.reduce((sum: number, m: MerchantWithStats) => {
          if (m.is_active === false) return sum;
          const tier = m.subscription_tier?.toLowerCase() || 'free';
          const price = TIER_PRICING[tier] || 0;
          return sum + price;
        }, 0);

        setStats({
          totalMerchants: data.globalStats.totalMerchants,
          activeMerchants: data.globalStats.activeMerchants,
          totalReviews: data.globalStats.totalReviews,
          totalRevenue,
          totalSpins: data.globalStats.totalSpins,
        });
        
        setLastUpdated(new Date());
      }
    } catch (error: unknown) {
      const err = error as Error;
      setError(err.message || 'Impossible de charger les données marchands');
    }
  };

  const downloadQRCode = async (merchantId: string, businessName: string) => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/rate/${merchantId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#2D6A4F',
        light: '#FFFFFF',
      },
    });

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${businessName.replace(/\s+/g, '-')}-QR.png`;
    link.click();
  };

  const generateAndSaveQRCode = async (merchantId: string, businessName: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/rate/${merchantId}`;
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#2D6A4F',
          light: '#FFFFFF',
        },
      });

      // Convert data URL to blob
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `${merchantId}-qr.png`, { type: 'image/png' });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('merchant-assets')
        .upload(`qr-codes/${merchantId}.png`, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('merchant-assets')
        .getPublicUrl(`qr-codes/${merchantId}.png`);

      // Update merchant record with QR URL
      const { error: updateError } = await supabase
        .from('merchants')
        .update({ qr_code_url: publicUrl })
        .eq('id', merchantId);

      if (updateError) throw updateError;

      alert(`QR Code généré et enregistré pour ${businessName}!`);
      await loadMerchants(); // Reload to show updated data
    } catch (error: unknown) {
      const err = error as Error;
      alert(`Erreur: ${err.message}`);
    }
  };

  const copyRateLink = (merchantId: string) => {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/rate/${merchantId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-white/70">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex text-white">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-700/50 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex flex-col gap-2">
            <img 
              src="/logo-cartelle.png"
              alt="Cartelle Logo"
              className="h-8 w-auto"
            />
            <p className="text-xs text-white">Admin Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'dashboard'
                ? 'bg-purple-500/20 text-white border border-purple-500/30'
                : 'text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Tableau de Bord</span>
          </button>

          <button
            onClick={() => setActiveSection('merchants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'merchants'
                ? 'bg-purple-500/20 text-white border border-purple-500/30'
                : 'text-white hover:bg-slate-800/50'
            }`}
          >
            <Store className="w-5 h-5" />
            <span className="font-medium">Marchands</span>
          </button>

          <button
            onClick={() => setActiveSection('messages')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'messages'
                ? 'bg-purple-500/20 text-white border border-purple-500/30'
                : 'text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium">Messages</span>
            {messagesCounts.new > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {messagesCounts.new}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('loyalty')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'loyalty'
                ? 'bg-purple-500/20 text-white border border-purple-500/30'
                : 'text-white hover:bg-slate-800/50'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">Cartes Fidélité</span>
            {loyaltyStats.totalCards > 0 && (
              <span className="ml-auto bg-emerald-500/80 text-white text-xs px-2 py-0.5 rounded-full">
                {loyaltyStats.totalCards}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('whatsapp')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'whatsapp'
                ? 'bg-purple-500/20 text-white border border-purple-500/30'
                : 'text-white hover:bg-slate-800/50'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">WhatsApp</span>
          </button>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-slate-700/50">
          <Button
            onClick={() => supabase.auth.signOut().then(() => router.push('/auth/login'))}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-slate-900/50 border-b border-slate-700/50 backdrop-blur-xl">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {activeSection === 'dashboard' ? 'Tableau de Bord' :
                   activeSection === 'merchants' ? 'Gestion des Marchands' :
                   activeSection === 'loyalty' ? 'Cartes Fidélité' :
                   activeSection === 'whatsapp' ? 'WhatsApp' : 'Messages'}
                </h2>
                <p className="text-white/70 text-sm mt-0.5">
                  {activeSection === 'dashboard'
                    ? 'Statistiques et analytics'
                    : activeSection === 'merchants'
                    ? 'Liste et gestion des marchands'
                    : activeSection === 'loyalty'
                    ? 'Gestion des cartes de fidélité clients'
                    : activeSection === 'whatsapp'
                    ? 'Configuration WhatsApp par marchand'
                    : 'Demandes de contact Multi Store'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <span className="text-xs text-white/70">
                    Mis à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
                  </span>
                )}
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/30"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Actualisation...' : 'Actualiser'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            {/* Time Range Selector */}
            <div className="flex gap-2 mb-6">
              <Button
                onClick={() => setTimeRange('day')}
                className={`gap-2 ${
                  timeRange === 'day'
                    ? 'bg-purple-500/20 text-white border-purple-500/30'
                    : 'bg-slate-800 text-white border-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Jour
              </Button>
              <Button
                onClick={() => setTimeRange('week')}
                className={`gap-2 ${
                  timeRange === 'week'
                    ? 'bg-purple-500/20 text-white border-purple-500/30'
                    : 'bg-slate-800 text-white border-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Semaine
              </Button>
              <Button
                onClick={() => setTimeRange('month')}
                className={`gap-2 ${
                  timeRange === 'month'
                    ? 'bg-purple-500/20 text-white border-purple-500/30'
                    : 'bg-slate-800 text-white border-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Mois
              </Button>
            </div>

            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <Store className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">+12%</span>
                </div>
              </div>
              <p className="text-white text-sm mb-2">Total Marchands</p>
              <p className="text-4xl font-bold text-white mb-1">{stats.totalMerchants}</p>
              <p className="text-xs text-white/60">{stats.activeMerchants} actifs</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-blue-500/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">+8%</span>
                </div>
              </div>
              <p className="text-white text-sm mb-2">Total Reviews</p>
              <p className="text-4xl font-bold text-white mb-1">{stats.totalReviews}</p>
              <p className="text-xs text-white/60">Tous marchands</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">+15%</span>
                </div>
              </div>
              <p className="text-white text-sm mb-2">Revenue Estimé (MRR)</p>
              <p className="text-4xl font-bold text-white mb-1">{stats.totalRevenue.toFixed(0)}฿</p>
              <p className="text-xs text-white/60">Basé sur abonnements</p>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-pink-500/20 rounded-xl">
                  <RotateCw className="w-6 h-6 text-pink-400" />
                </div>
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">+5%</span>
                </div>
              </div>
              <p className="text-white text-sm mb-2">Total Spins</p>
              <p className="text-4xl font-bold text-white mb-1">{stats.totalSpins}</p>
              <p className="text-xs text-white/60">Tours de roue totaux</p>
            </div>
          </div>
        </div>

            {/* Loyalty Stats Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold !text-white mb-4 flex items-center gap-2" style={{ color: 'white' }}>
                <Award className="w-5 h-5 text-amber-400" />
                Statistiques Fidélité
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Cartes créées</p>
                      <p className="text-2xl font-bold text-white">{loyaltyStats.totalCards}</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-400">+{loyaltyStats.cardsThisMonth} ce mois</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-xl p-4 border border-emerald-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Coins className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Points en circulation</p>
                      <p className="text-2xl font-bold text-white">{loyaltyStats.totalPoints.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-400">{loyaltyStats.pointsDistributed.toLocaleString()} distribués</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Achats totaux</p>
                      <p className="text-2xl font-bold text-white">{loyaltyStats.totalPurchases}</p>
                    </div>
                  </div>
                  <p className="text-xs text-blue-400">{loyaltyStats.totalSpent.toLocaleString()} FCFA dépensés</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">Points échangés</p>
                      <p className="text-2xl font-bold text-white">{loyaltyStats.pointsRedeemed.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs text-purple-400">{loyaltyStats.activeCards} cartes actives</p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Activity Chart */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold !text-white mb-4" style={{ color: 'white' }}>Activité Récente</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={(() => {
                        // Generate data based on selected time range
                        let labels: string[];
                        let divisor: number;

                        switch (timeRange) {
                          case 'day':
                            // Heures de la journée
                            labels = ['00h', '04h', '08h', '12h', '16h', '20h', '23h'];
                            divisor = 24;
                            break;
                          case 'month':
                            // Semaines du mois
                            labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
                            divisor = 4;
                            break;
                          case 'week':
                          default:
                            // Jours de la semaine
                            labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                            divisor = 7;
                            break;
                        }

                        const baseReviews = Math.max(1, Math.floor(stats.totalReviews / divisor));
                        const baseSpins = Math.max(1, Math.floor(stats.totalSpins / divisor));

                        return labels.map((label) => ({
                          name: label,
                          reviews: Math.floor(baseReviews * (0.5 + Math.random())),
                          spins: Math.floor(baseSpins * (0.5 + Math.random())),
                        }));
                      })()}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSpins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="reviews"
                        stroke="#8b5cf6"
                        fillOpacity={1}
                        fill="url(#colorReviews)"
                        name="Reviews"
                      />
                      <Area
                        type="monotone"
                        dataKey="spins"
                        stroke="#06b6d4"
                        fillOpacity={1}
                        fill="url(#colorSpins)"
                        name="Spins"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subscription Distribution */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold !text-white mb-4" style={{ color: 'white' }}>Répartition des Abonnements</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const starterCount = merchants.filter(m => m.subscription_tier === 'starter').length;
                          const premiumCount = merchants.filter(m => m.subscription_tier === 'premium').length;
                          const freeCount = merchants.filter(m => !m.subscription_tier || m.subscription_tier === 'free').length;
                          return [
                            { name: 'Starter', value: starterCount, color: '#8b5cf6' },
                            { name: 'Premium', value: premiumCount, color: '#10b981' },
                            { name: 'Free', value: freeCount, color: '#6b7280' },
                          ].filter(d => d.value > 0);
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {(() => {
                          const starterCount = merchants.filter(m => m.subscription_tier === 'starter').length;
                          const premiumCount = merchants.filter(m => m.subscription_tier === 'premium').length;
                          const freeCount = merchants.filter(m => !m.subscription_tier || m.subscription_tier === 'free').length;
                          const data = [
                            { name: 'Starter', value: starterCount, color: '#8b5cf6' },
                            { name: 'Premium', value: premiumCount, color: '#10b981' },
                            { name: 'Free', value: freeCount, color: '#6b7280' },
                          ].filter(d => d.value > 0);
                          return data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ));
                        })()}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Legend
                        formatter={(value) => <span style={{ color: '#d1d5db' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Merchants */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold !text-white mb-4" style={{ color: 'white' }}>Top Marchands par Reviews</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={merchants
                      .map(m => ({
                        name: m.business_name?.substring(0, 15) || 'N/A',
                        reviews: merchantStats[m.id]?.totalReviews || 0,
                        spins: merchantStats[m.id]?.totalSpins || 0,
                      }))
                      .sort((a, b) => b.reviews - a.reviews)
                      .slice(0, 5)
                    }
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="reviews" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Reviews" />
                    <Bar dataKey="spins" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Spins" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </>
        )}

        {/* Merchants Section */}
        {activeSection === 'merchants' && (
          <>
            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 mb-6 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-white/70" />
                <span className="text-sm font-semibold text-white">Filtres</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>

                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tous les plans</option>
                  <option value="starter">Starter</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            {/* Merchants List */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">Liste des Marchands</h2>
            <p className="text-sm text-white/70 mt-1">{filteredMerchants.length} marchands trouvés</p>
          </div>
          <div className="divide-y divide-slate-700/50">
            {filteredMerchants.map((merchant) => {
              const stats = merchantStats[merchant.id] || { totalReviews: 0, positiveReviews: 0, avgRating: 0, totalSpins: 0 };
              const isExpanded = selectedMerchant === merchant.id;

              return (
                <div key={merchant.id} className="p-6 hover:bg-slate-700/30 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                        <span className="text-white font-bold text-lg">
                          {merchant.business_name?.[0]?.toUpperCase() || 'M'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{merchant.business_name}</h3>
                          <Badge className="capitalize bg-slate-700 text-white border-slate-600">{merchant.subscription_tier}</Badge>
                          {merchant.is_active !== false ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-white/70 mb-3">{merchant.email}</p>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                            <p className="text-xs text-white/70">Reviews</p>
                            <p className="text-lg font-bold text-white">{stats.totalReviews}</p>
                          </div>
                          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                            <p className="text-xs text-white/70">Positive</p>
                            <p className="text-lg font-bold text-emerald-400">{stats.positiveReviews}</p>
                          </div>
                          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                            <p className="text-xs text-white/70">Avg Rating</p>
                            <p className="text-lg font-bold text-white">{stats.avgRating} ⭐</p>
                          </div>
                          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                            <p className="text-xs text-white/70">Spins</p>
                            <p className="text-lg font-bold text-purple-400">{stats.totalSpins}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => copyRateLink(merchant.id)}
                            className="gap-2 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => downloadQRCode(merchant.id, merchant.business_name)}
                            className="gap-2 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                          >
                            <Download className="w-4 h-4" />
                            Download QR
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => generateAndSaveQRCode(merchant.id, merchant.business_name)}
                            className="gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30"
                          >
                            <QrCode className="w-4 h-4" />
                            Générer QR
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => window.open(`/rate/${merchant.id}`, '_blank')}
                            className="gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/30"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Page
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setSelectedMerchant(isExpanded ? null : merchant.id)}
                            className="gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
                          >
                            <Eye className="w-4 h-4" />
                            {isExpanded ? 'Hide' : 'Details'}
                          </Button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-white mb-1">Merchant ID</p>
                              <code className="text-xs text-white font-mono bg-slate-800 px-2 py-1 rounded">{merchant.id}</code>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white mb-1">Rate Link</p>
                              <code className="text-xs text-white font-mono break-all bg-slate-800 px-2 py-1 rounded block">
                                {process.env.NEXT_PUBLIC_APP_URL}/rate/{merchant.id}
                              </code>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white mb-1">Inscription</p>
                              <p className="text-xs text-white">
                                {new Date(merchant.created_at).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {merchant.logo_url && (
                              <div>
                                <p className="text-xs font-semibold text-white mb-2">Logo</p>
                                <div className="bg-slate-800 p-2 rounded-lg inline-block">
                                  <img src={merchant.logo_url} alt="Logo" className="h-16 object-contain" />
                                </div>
                              </div>
                            )}
                            {merchant.background_url && (
                              <div>
                                <p className="text-xs font-semibold text-white mb-2">Background</p>
                                <img src={merchant.background_url} alt="Background" className="h-24 w-auto object-cover rounded-lg border border-slate-700" />
                              </div>
                            )}
                            
                            {/* Social Media Links */}
                            <div className="border-t border-slate-700/50 pt-3 mt-3">
                              <p className="text-xs font-semibold text-white mb-2">Liens de Redirection</p>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/70">Stratégie:</span>
                                  <Badge className="text-xs capitalize bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    {merchant.redirect_strategy?.replace('_', ' ') || 'none'}
                                  </Badge>
                                </div>
                                {merchant.google_maps_url && (
                                  <div className="bg-slate-800/50 p-2 rounded">
                                    <span className="text-xs text-white/70 block mb-1">Google Reviews:</span>
                                    <a href={merchant.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 block truncate">
                                      {merchant.google_maps_url}
                                    </a>
                                  </div>
                                )}
                                {merchant.tripadvisor_url && (
                                  <div className="bg-slate-800/50 p-2 rounded">
                                    <span className="text-xs text-white/70 block mb-1">TripAdvisor:</span>
                                    <a href={merchant.tripadvisor_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 block truncate">
                                      {merchant.tripadvisor_url}
                                    </a>
                                  </div>
                                )}
                                {merchant.tiktok_url && (
                                  <div className="bg-slate-800/50 p-2 rounded">
                                    <span className="text-xs text-white/70 block mb-1">TikTok:</span>
                                    <a href={merchant.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 block truncate">
                                      {merchant.tiktok_url}
                                    </a>
                                  </div>
                                )}
                                {merchant.instagram_url && (
                                  <div className="bg-slate-800/50 p-2 rounded">
                                    <span className="text-xs text-white/70 block mb-1">Instagram:</span>
                                    <a href={merchant.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 block truncate">
                                      {merchant.instagram_url}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMerchants.length === 0 && (
              <div className="p-12 text-center">
                <Store className="w-12 h-12 text-white mx-auto mb-3" />
                <p className="text-white">Aucun marchand trouvé</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* Messages Section */}
        {activeSection === 'messages' && (
          <>
            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {(['all', 'new', 'read', 'replied', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setMessageStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    messageStatusFilter === status
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-800/50 text-white/70 hover:bg-slate-700/50'
                  }`}
                >
                  {status === 'all' ? 'Tous' : status === 'new' ? 'Nouveaux' : status === 'read' ? 'Lus' : status === 'replied' ? 'Répondus' : 'Archivés'}
                  {status !== 'all' && messagesCounts[status] > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      status === 'new' ? 'bg-red-500' : 'bg-slate-600'
                    }`}>
                      {messagesCounts[status]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Messages List */}
              <div className="lg:col-span-1 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50">
                  <h3 className="font-semibold text-white">Liste des messages</h3>
                  <p className="text-xs text-white/50 mt-1">{messages.length} message(s)</p>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {messagesLoading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-white/50">
                      <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Aucun message</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <button
                        key={msg.id}
                        onClick={() => {
                          setSelectedMessage(msg);
                          if (msg.status === 'new') {
                            updateMessageStatus(msg.id, 'read');
                          }
                        }}
                        className={`w-full text-left p-4 border-b border-slate-700/30 hover:bg-slate-700/30 transition-all ${
                          selectedMessage?.id === msg.id ? 'bg-slate-700/50' : ''
                        } ${msg.status === 'new' ? 'bg-purple-500/10' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${msg.status === 'new' ? 'text-white' : 'text-white/80'}`}>
                              {msg.name}
                            </p>
                            <p className="text-xs text-white/50 truncate">{msg.email}</p>
                            {msg.company && (
                              <p className="text-xs text-purple-400 truncate mt-1">
                                <Building2 className="w-3 h-3 inline mr-1" />
                                {msg.company}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {msg.status === 'new' && (
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                            <span className="text-xs text-white/40">
                              {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Message Detail */}
              <div className="lg:col-span-2 bg-slate-800/30 rounded-xl border border-slate-700/50">
                {selectedMessage ? (
                  <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-700/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white">{selectedMessage.name}</h3>
                          <a href={`mailto:${selectedMessage.email}`} className="text-purple-400 hover:underline text-sm">
                            {selectedMessage.email}
                          </a>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={`${
                            selectedMessage.status === 'new' ? 'bg-red-500/20 text-red-400' :
                            selectedMessage.status === 'read' ? 'bg-blue-500/20 text-blue-400' :
                            selectedMessage.status === 'replied' ? 'bg-green-500/20 text-green-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {selectedMessage.status === 'new' ? 'Nouveau' :
                             selectedMessage.status === 'read' ? 'Lu' :
                             selectedMessage.status === 'replied' ? 'Répondu' : 'Archivé'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                      <div className="space-y-4">
                        {selectedMessage.company && (
                          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                            <Building2 className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="text-xs text-white/50">Entreprise</p>
                              <p className="text-white font-medium">{selectedMessage.company}</p>
                            </div>
                          </div>
                        )}

                        {selectedMessage.establishments && (
                          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                            <Store className="w-5 h-5 text-purple-400" />
                            <div>
                              <p className="text-xs text-white/50">Nombre d&apos;établissements</p>
                              <p className="text-white font-medium">{selectedMessage.establishments}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                          <Clock className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-xs text-white/50">Date de réception</p>
                            <p className="text-white font-medium">
                              {new Date(selectedMessage.created_at).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {selectedMessage.message && (
                          <div className="mt-6">
                            <h4 className="text-sm font-semibold text-white/70 mb-2">Message</h4>
                            <div className="p-4 bg-slate-900/50 rounded-lg">
                              <p className="text-white whitespace-pre-wrap">{selectedMessage.message}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-slate-700/50 flex gap-3">
                      <a
                        href={`mailto:${selectedMessage.email}?subject=Re: Demande Multi Store - ${selectedMessage.company || selectedMessage.name}`}
                        onClick={() => updateMessageStatus(selectedMessage.id, 'replied')}
                        className="flex-1"
                      >
                        <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
                          <Reply className="w-4 h-4 mr-2" />
                          Répondre par email
                        </Button>
                      </a>
                      <Button
                        onClick={() => updateMessageStatus(selectedMessage.id, 'archived')}
                        variant="outline"
                        className="border-slate-600 text-white hover:bg-slate-700"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archiver
                      </Button>
                      <Button
                        onClick={() => deleteMessage(selectedMessage.id)}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/50">
                    <div className="text-center">
                      <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Sélectionnez un message pour voir les détails</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Loyalty Cards Section */}
        {activeSection === 'loyalty' && (
          <>
            {/* Loyalty Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Total Cartes</p>
                    <p className="text-2xl font-bold text-white">{loyaltyStats.totalCards}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-xl p-4 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Cartes Actives</p>
                    <p className="text-2xl font-bold text-white">{loyaltyStats.activeCards}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Coins className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Points Total</p>
                    <p className="text-2xl font-bold text-white">{loyaltyStats.totalPoints.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Montant Total</p>
                    <p className="text-2xl font-bold text-white">{loyaltyStats.totalSpent.toLocaleString()} FCFA</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 mb-6 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-white/70" />
                <span className="text-sm font-semibold text-white">Filtres</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, email, téléphone, card ID..."
                    value={loyaltySearch}
                    onChange={(e) => setLoyaltySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={loyaltyStatusFilter}
                  onChange={(e) => setLoyaltyStatusFilter(e.target.value as typeof loyaltyStatusFilter)}
                  className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actives</option>
                  <option value="suspended">Suspendues</option>
                  <option value="expired">Expirées</option>
                </select>
              </div>
            </div>

            {/* Loyalty Cards Table */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-white">Liste des Cartes Fidélité</h2>
                <p className="text-sm text-white/70 mt-1">{loyaltyClients.length} carte(s) trouvée(s)</p>
              </div>

              {loyaltyLoading ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/70">Chargement des cartes fidélité...</p>
                </div>
              ) : loyaltyClients.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70 mb-2">Aucune carte fidélité trouvée</p>
                  <p className="text-sm text-white/50">Les cartes seront créées automatiquement lors des premiers feedbacks clients</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Card ID</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Client</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Merchant</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Points</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Achats</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Statut</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Créée le</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white/70 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {loyaltyClients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <code className="text-sm text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                              {client.card_id}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-white font-medium">{client.name || 'N/A'}</p>
                              <p className="text-xs text-white/50">{client.email || client.phone || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {client.merchant?.logo_url ? (
                                <img src={client.merchant.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center">
                                  <Store className="w-3 h-3 text-purple-400" />
                                </div>
                              )}
                              <span className="text-white text-sm">{client.merchant?.business_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Coins className="w-4 h-4 text-amber-400" />
                              <span className="text-white font-semibold">{client.points.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-white">{client.total_purchases} achats</p>
                              <p className="text-xs text-white/50">{Number(client.total_spent).toLocaleString()} FCFA</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`${
                              client.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              client.status === 'suspended' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {client.status === 'active' ? 'Active' :
                               client.status === 'suspended' ? 'Suspendue' : 'Expirée'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-white/70">
                            {new Date(client.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => window.open(`/card/${client.qr_code_data}`, '_blank')}
                                className="gap-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/30"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Voir
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/card/${client.qr_code_data}`);
                                  alert('Lien copié!');
                                }}
                                className="gap-1 bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* WhatsApp Section */}
        {activeSection === 'whatsapp' && (
          <>
            {waLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-teal-400" />
                    <h3 className="text-lg font-semibold text-white">Configurations WhatsApp</h3>
                  </div>
                  <Badge className="bg-slate-700 text-white border-slate-600">
                    {waConfigs.length} marchands
                  </Badge>
                </div>

                <div className="divide-y divide-slate-700/50">
                  {waConfigs.length === 0 ? (
                    <div className="px-6 py-12 text-center text-white/50">
                      <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>Aucun marchand trouvé</p>
                    </div>
                  ) : (
                    waConfigs.map((merchant) => {
                      const cfg = merchant.config;
                      let statusLabel = 'Non configuré';
                      let statusColor = 'bg-slate-600 text-slate-200';
                      if (cfg) {
                        if (cfg.is_verified) {
                          statusLabel = 'Vérifié ✓';
                          statusColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                        } else if (cfg.provider === 'meta') {
                          statusLabel = 'Meta Cloud';
                          statusColor = 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                        } else if (cfg.provider === 'whapi') {
                          statusLabel = 'Whapi Legacy';
                          statusColor = 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
                        }
                      }

                      return (
                        <div key={merchant.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="p-2 bg-teal-500/10 rounded-lg shrink-0">
                              <Phone className="w-4 h-4 text-teal-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{merchant.business_name}</p>
                              <p className="text-sm text-white/50 truncate">{merchant.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => openWaConfig(merchant)}
                              className="gap-1.5 bg-teal-600 hover:bg-teal-500 text-white border-0"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                              Configurer
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* WhatsApp Configuration Modal */}
            {waEditMerchant && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 rounded-2xl border border-slate-700/50 w-full max-w-lg shadow-2xl">
                  <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Configuration WhatsApp</h3>
                      <p className="text-sm text-white/50">{waEditMerchant.business_name}</p>
                    </div>
                    <button
                      onClick={() => setWaEditMerchant(null)}
                      className="text-white/50 hover:text-white text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {/* Provider Select */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">Fournisseur</label>
                      <select
                        value={waForm.provider}
                        onChange={(e) => setWaForm({ ...waForm, provider: e.target.value as 'meta' | 'whapi' })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      >
                        <option value="meta">Meta Cloud API</option>
                        <option value="whapi">Whapi (Legacy)</option>
                      </select>
                    </div>

                    {waForm.provider === 'meta' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1.5">WABA ID</label>
                          <input
                            type="text"
                            value={waForm.waba_id}
                            onChange={(e) => setWaForm({ ...waForm, waba_id: e.target.value })}
                            placeholder="WhatsApp Business Account ID"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1.5">Phone Number ID</label>
                          <input
                            type="text"
                            value={waForm.phone_number_id}
                            onChange={(e) => setWaForm({ ...waForm, phone_number_id: e.target.value })}
                            placeholder="Phone Number ID"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1.5">Access Token</label>
                          <input
                            type="password"
                            value={waForm.access_token}
                            onChange={(e) => setWaForm({ ...waForm, access_token: e.target.value })}
                            placeholder="Permanent Access Token"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-1.5">Display Phone</label>
                          <input
                            type="text"
                            value={waForm.display_phone}
                            onChange={(e) => setWaForm({ ...waForm, display_phone: e.target.value })}
                            placeholder="+33 6 12 34 56 78"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-1.5">API Key</label>
                        <input
                          type="password"
                          value={waForm.api_key}
                          onChange={(e) => setWaForm({ ...waForm, api_key: e.target.value })}
                          placeholder="Whapi API Key"
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                      </div>
                    )}

                    {/* Prix par message */}
                    <div className="mt-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                      <label className="block text-sm font-semibold text-white/90 mb-1.5">Prix par message (FCFA)</label>
                      <p className="text-xs text-white/40 mb-2">Ce prix sera facturé au merchant pour chaque message de campagne envoyé.</p>
                      <input
                        type="number"
                        min={1}
                        value={waForm.message_price_fcfa}
                        onChange={(e) => setWaForm({ ...waForm, message_price_fcfa: parseInt(e.target.value) || 50 })}
                        placeholder="50"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
                    <div>
                      {waEditMerchant.config && (
                        <Button
                          size="sm"
                          onClick={deleteWaConfig}
                          disabled={waSaving}
                          className="gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={verifyWaConfig}
                        disabled={waSaving}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Vérifier
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveWaConfig}
                        disabled={waSaving}
                        className="gap-1.5 bg-teal-600 hover:bg-teal-500 text-white border-0"
                      >
                        {waSaving ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

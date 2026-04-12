'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Phone,
  Users,
  Wallet,
  BarChart3,
  TrendingUp,
  AlertCircle,
  MailCheck,
  MailX,
  BookOpen,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  merchant_id: string;
  name: string;
  template_id: string;
  template_variables: any;
  estimated_cost_eur: number;
  actual_cost_eur: number;
  total_recipients: number;
  send_count: number;
  last_sent_at: string;
  created_at: string;
}

interface CampaignMessage {
  id: string;
  campaign_id: string;
  recipient_phone: string;
  recipient_name: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  cost_eur: number;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  meta_message_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  queued: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En attente', icon: Clock },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Envoye', icon: Send },
  delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivre', icon: MailCheck },
  read: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Lu', icon: Eye },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Echoue', icon: MailX },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CampaignReportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Fetch merchant
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();
      setMerchant(merchantData);

      // Fetch campaign
      const { data: campaignData, error: campError } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campError || !campaignData) {
        setError('Campagne introuvable');
        setLoading(false);
        return;
      }

      // Verify ownership
      if (campaignData.merchant_id !== user.id) {
        setError('Acces non autorise');
        setLoading(false);
        return;
      }

      setCampaign(campaignData);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from('whatsapp_campaign_messages')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      setMessages(messagesData || []);
      setLoading(false);
    };

    fetchData();
  }, [campaignId, router]);

  // ─── Computed stats ─────────────────────────────────────────────────
  const totalSent = messages.filter(m => ['sent', 'delivered', 'read'].includes(m.status)).length;
  const totalDelivered = messages.filter(m => ['delivered', 'read'].includes(m.status)).length;
  const totalRead = messages.filter(m => m.status === 'read').length;
  const totalFailed = messages.filter(m => m.status === 'failed').length;
  const totalQueued = messages.filter(m => m.status === 'queued').length;
  const totalCost = messages
    .filter(m => ['sent', 'delivered', 'read'].includes(m.status))
    .reduce((sum, m) => sum + (m.cost_eur || 0), 0);

  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{error}</h2>
          <p className="text-sm text-gray-500 mb-4">Cette campagne n&apos;existe pas ou vous n&apos;avez pas les droits d&apos;acces.</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/marketing/whatsapp-campaign')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux campagnes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/marketing/whatsapp-campaign')}
            className="gap-1.5 h-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Rapport de campagne</h1>
            <p className="text-sm text-gray-500">{campaign?.name}</p>
          </div>
          {campaign?.last_sent_at && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              Envoye le {new Date(campaign.last_sent_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total envoyes */}
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalSent}</p>
                <p className="text-xs text-gray-500">Total envoyes</p>
              </div>
            </div>
          </div>

          {/* Delivres */}
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-green-500 to-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                <MailCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalDelivered}</p>
                <p className="text-xs text-gray-500">Delivres</p>
              </div>
            </div>
          </div>

          {/* Lus */}
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 to-pink-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalRead}</p>
                <p className="text-xs text-gray-500">Lus</p>
              </div>
            </div>
          </div>

          {/* Echoues */}
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <MailX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalFailed}</p>
                <p className="text-xs text-gray-500">Echoues</p>
              </div>
            </div>
          </div>

          {/* Cout total */}
          <div className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-500 to-violet-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{totalCost.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Cout total (EUR)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Delivery Rate */}
          <div className="group relative p-5 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Taux de livraison</p>
                  <p className="text-xs text-gray-500">Delivres / Envoyes</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{deliveryRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-green-500 to-violet-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${deliveryRate}%` }}
              />
            </div>
          </div>

          {/* Read Rate */}
          <div className="group relative p-5 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Taux de lecture</p>
                  <p className="text-xs text-gray-500">Lus / Delivres</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-violet-600">{readRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-violet-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${readRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Messages Table */}
        <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Detail des messages</h2>
                <p className="text-xs text-gray-500">{messages.length} message{messages.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Telephone</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Envoye</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Delivre</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Lu</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Cout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-green-500" />
                          <span className="text-sm font-medium text-gray-900">{msg.recipient_phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm text-gray-700">{msg.recipient_name || '-'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {msg.sent_at ? new Date(msg.sent_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {msg.delivered_at ? new Date(msg.delivered_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-500">
                          {msg.read_at ? new Date(msg.read_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium text-gray-700">{msg.cost_eur || 0} EUR</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                      <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">Aucun message</p>
                      <p className="text-xs">Cette campagne n&apos;a pas encore de messages enregistres.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Failed messages detail */}
        {totalFailed > 0 && (
          <div className="group relative p-5 border border-red-200 rounded-xl overflow-hidden bg-red-50/50">
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-red-400" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Messages echoues ({totalFailed})</h3>
                <p className="text-xs text-red-700">Detail des erreurs d&apos;envoi</p>
              </div>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {messages.filter(m => m.status === 'failed').map((msg) => (
                <div key={msg.id} className="flex items-center gap-2 p-2 bg-white rounded-lg text-xs border border-red-100">
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-medium text-gray-900">{msg.recipient_phone}</span>
                  {msg.recipient_name && <span className="text-gray-500">({msg.recipient_name})</span>}
                  {msg.error_message && (
                    <span className="text-red-600 ml-auto truncate max-w-[200px]">{msg.error_message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back to campaigns link */}
        <div className="flex justify-center pt-2 pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/marketing/whatsapp-campaign')}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour a la liste des campagnes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Star, Search, Mail, Calendar, Filter, Phone, MessageCircle, X, ExternalLink } from 'lucide-react';

interface Customer {
  user_token: string;
  email: string | null;
  phone: string | null;
  first_visit: string;
  total_reviews: number;
  avg_rating: number;
  last_review: string;
  is_positive: boolean;
  feedbacks: any[];
}

interface CustomerDetailsModalProps {
  customer: Customer | null;
  onClose: () => void;
  isFr: boolean;
}

function CustomerDetailsModal({ customer, onClose, isFr }: CustomerDetailsModalProps) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-pink-600 to-violet-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${
                customer.email || customer.phone
                  ? 'bg-white text-pink-600'
                  : 'bg-pink-500 text-white'
              }`}>
                {customer.email ? customer.email[0].toUpperCase() : customer.phone ? '📱' : '?'}
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {customer.email || customer.phone || (isFr ? 'Client Anonyme' : 'Anonymous Customer')}
                </h2>
                <p className="text-pink-100 text-sm font-mono">
                  ID: {customer.user_token.substring(0, 12)}...
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50 border-b border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{customer.total_reviews}</p>
            <p className="text-xs text-gray-500">{isFr ? 'Avis Total' : 'Total Reviews'}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="text-2xl font-bold text-gray-900">{customer.avg_rating.toFixed(1)}</p>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-xs text-gray-500">{isFr ? 'Note Moyenne' : 'Average Rating'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {customer.total_reviews > 1 ? (isFr ? 'Habitué' : 'Regular') : (isFr ? 'Nouveau' : 'New')}
            </p>
            <p className="text-xs text-gray-500">{isFr ? 'Statut' : 'Status'}</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{isFr ? 'Coordonnées' : 'Contact Info'}</h3>
          <div className="space-y-2">
            {customer.email && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Phone className="w-4 h-4 text-green-500" />
                <span>{customer.phone}</span>
                <a
                  href={`https://wa.me/${customer.phone.replace(/^\+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-green-600 hover:text-green-700 flex items-center gap-1 text-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {!customer.email && !customer.phone && (
              <p className="text-sm text-gray-400 italic">{isFr ? 'Aucune coordonnée disponible' : 'No contact info available'}</p>
            )}
          </div>
        </div>

        {/* Feedbacks List */}
        <div className="p-5 max-h-[280px] overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {isFr ? 'Historique des Avis' : 'Review History'} ({customer.feedbacks.length})
          </h3>
          <div className="space-y-2.5">
            {customer.feedbacks.map((feedback, index) => (
              <div
                key={feedback.id || index}
                className="p-3.5 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= feedback.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(feedback.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {feedback.comment ? (
                  <p className="text-sm text-gray-600">{feedback.comment}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">{isFr ? 'Pas de commentaire' : 'No comment'}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose} variant="outline" className="text-sm">
            {isFr ? 'Fermer' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const { i18n } = useTranslation(undefined, { useSuspense: false });
  const isFr = i18n.language === 'fr';
  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [webCustomers, setWebCustomers] = useState<Customer[]>([]);
  const [whatsappCustomers, setWhatsappCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'web' | 'whatsapp'>('web');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

      // Fetch customer feedback
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      // Separate customers by workflow type (email vs phone)
      const webCustomersMap = new Map<string, Customer>();
      const whatsappCustomersMap = new Map<string, Customer>();

      feedbackData?.forEach((feedback) => {
        const hasPhone = feedback.customer_phone;
        const map = hasPhone ? whatsappCustomersMap : webCustomersMap;
        const key = feedback.user_token;

        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            user_token: feedback.user_token,
            email: feedback.customer_email || null,
            phone: feedback.customer_phone || null,
            first_visit: feedback.created_at,
            total_reviews: 1,
            avg_rating: feedback.rating,
            last_review: feedback.created_at,
            is_positive: feedback.is_positive,
            feedbacks: [feedback]
          });
        } else {
          existing.total_reviews += 1;
          existing.avg_rating = (existing.avg_rating * (existing.total_reviews - 1) + feedback.rating) / existing.total_reviews;
          if (!existing.email && feedback.customer_email) {
            existing.email = feedback.customer_email;
          }
          if (!existing.phone && feedback.customer_phone) {
            existing.phone = feedback.customer_phone;
          }
          if (new Date(feedback.created_at) > new Date(existing.last_review)) {
            existing.last_review = feedback.created_at;
          }
          existing.feedbacks.push(feedback);
        }
      });

      setWebCustomers(Array.from(webCustomersMap.values()));
      setWhatsappCustomers(Array.from(whatsappCustomersMap.values()));
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Update filtered customers when tab or search changes
  useEffect(() => {
    const customers = activeTab === 'web' ? webCustomers : whatsappCustomers;

    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(c => {
        if (activeTab === 'web') {
          return (c.email && c.email.toLowerCase().includes(query)) ||
                 c.user_token.toLowerCase().includes(query);
        } else {
          return (c.phone && c.phone.includes(query)) ||
                 c.user_token.toLowerCase().includes(query);
        }
      });
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, activeTab, webCustomers, whatsappCustomers]);

  const totalCustomers = webCustomers.length + whatsappCustomers.length;
  const totalEmails = webCustomers.filter(c => c.email).length;
  const totalPhones = whatsappCustomers.filter(c => c.phone).length;

  if (loading || !user || !merchant) {
    return (
      <DashboardLayout merchant={merchant}>
        <div className="flex items-center justify-center h-96">
          <Loader2Spinner isFr={isFr} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              {isFr ? 'Clients' : 'Customers'}
            </h1>
            <p className="text-gray-500 mt-1 ml-[52px]">{isFr ? 'Gérez votre base de données clients et leurs interactions' : 'Manage your customer database and interactions'}</p>
          </div>
          <Button variant="outline" className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50">
            <TrendingUp className="w-4 h-4" />
            {isFr ? 'Exporter CSV' : 'Export CSV'}
          </Button>
        </div>

        {/* Stats Grid - compact 4-col */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: isFr ? 'Clients Totaux' : 'Total Customers', value: totalCustomers, icon: Users, color: 'pink' },
            { label: isFr ? 'Emails Collectés' : 'Emails Collected', value: totalEmails, icon: Mail, color: 'violet' },
            { label: isFr ? 'WhatsApp Collectés' : 'WhatsApp Collected', value: totalPhones, icon: Phone, color: 'pink' },
            {
              label: isFr ? 'Avis Moyen/Client' : 'Avg Reviews/Customer',
              value: totalCustomers > 0
                ? (([...webCustomers, ...whatsappCustomers].reduce((sum, c) => sum + c.total_reviews, 0)) / totalCustomers).toFixed(1)
                : '0',
              icon: Star,
              color: 'violet'
            },
          ].map((stat, i) => (
            <div key={i} className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
              <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color === 'pink' ? 'bg-pink-50 text-pink-600' : 'bg-violet-50 text-violet-600'}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('web'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'web'
                ? 'text-pink-600 border-pink-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            {isFr ? 'Workflow Web' : 'Web Workflow'}
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{webCustomers.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('whatsapp'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === 'whatsapp'
                ? 'text-green-600 border-green-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {isFr ? 'Workflow WhatsApp' : 'WhatsApp Workflow'}
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{whatsappCustomers.length}</span>
          </button>
        </div>

        {/* Customer Table Card */}
        <div className="group relative border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md bg-white">
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

          {/* Search in card header */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'web' ? (isFr ? 'Rechercher par email...' : 'Search by email...') : (isFr ? 'Rechercher par numéro WhatsApp...' : 'Search by WhatsApp number...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{isFr ? 'Client' : 'Customer'}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {activeTab === 'web' ? 'Email' : 'WhatsApp'}
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{isFr ? 'Statut' : 'Status'}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{isFr ? 'Note' : 'Rating'}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{isFr ? 'Avis' : 'Reviews'}</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{isFr ? 'Dernière Visite' : 'Last Visit'}</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.user_token} className="hover:bg-pink-50/30 transition-colors">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                            activeTab === 'web'
                              ? customer.email
                                ? 'bg-pink-50 text-pink-600'
                                : 'bg-gray-100 text-gray-400'
                              : customer.phone
                                ? 'bg-violet-50 text-violet-600'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {activeTab === 'web'
                              ? (customer.email ? customer.email[0].toUpperCase() : '?')
                              : (customer.phone ? '📱' : '?')
                            }
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activeTab === 'web'
                                ? (customer.email || (isFr ? 'Client Anonyme' : 'Anonymous Customer'))
                                : (customer.phone || (isFr ? 'Client Anonyme' : 'Anonymous Customer'))
                              }
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {customer.user_token.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {activeTab === 'web' ? (
                          customer.email ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {customer.email}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )
                        ) : (
                          customer.phone ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Phone className="w-3.5 h-3.5 text-green-500" />
                              {customer.phone}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {customer.total_reviews > 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-violet-700">
                            {isFr ? 'Habitué' : 'Regular'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {isFr ? 'Nouveau' : 'New'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-gray-900">{customer.avg_rating.toFixed(1)}</span>
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{customer.total_reviews}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {new Date(customer.last_review).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-pink-600 hover:text-violet-700 hover:bg-pink-50 text-xs"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          {isFr ? 'Détails' : 'Details'}
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        {activeTab === 'web' ? (
                          <Mail className="w-10 h-10 text-gray-300 mb-3" />
                        ) : (
                          <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
                        )}
                        <p className="text-base font-medium text-gray-900">
                          {searchQuery
                            ? (isFr ? 'Aucun client trouvé pour cette recherche' : 'No customers found for this search')
                            : (isFr ? `Aucun client ${activeTab === 'web' ? 'Web' : 'WhatsApp'} trouvé` : `No ${activeTab === 'web' ? 'Web' : 'WhatsApp'} customers found`)
                          }
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {searchQuery
                            ? (isFr ? 'Essayez une autre recherche' : 'Try a different search')
                            : (isFr
                                ? `Les clients du workflow ${activeTab === 'web' ? 'Web (email)' : 'WhatsApp'} apparaîtront ici.`
                                : `${activeTab === 'web' ? 'Web (email)' : 'WhatsApp'} workflow customers will appear here.`)
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          isFr={isFr}
        />
      )}
    </DashboardLayout>
  );
}

function Loader2Spinner({ isFr }: { isFr: boolean }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 border-3 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-sm text-gray-500">{isFr ? 'Chargement de vos clients...' : 'Loading your customers...'}</p>
    </div>
  );
}

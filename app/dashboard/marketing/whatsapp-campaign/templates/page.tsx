'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import {
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Send,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Type,
  Image as ImageIcon,
  Video,
  Phone,
  Link as LinkIcon,
  MessageSquare,
  Globe,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateButton {
  type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO';
  text?: string;
  buttons?: TemplateButton[];
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  rejection_reason?: string;
  components: TemplateComponent[];
  created_at: string;
}

type HeaderType = 'none' | 'text' | 'image' | 'video';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon' },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approuve' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejete' },
  PAUSED: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En pause' },
  DISABLED: { bg: 'bg-gray-200', text: 'text-gray-500', label: 'Desactive' },
};

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilitaire',
};

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Francais',
  en: 'Anglais',
  es: 'Espagnol',
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Live Preview Component
// ---------------------------------------------------------------------------

function LivePreview({
  headerType,
  headerContent,
  bodyText,
  footerText,
  buttons,
}: {
  headerType: HeaderType;
  headerContent: string;
  bodyText: string;
  footerText: string;
  buttons: TemplateButton[];
}) {
  return (
    <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-[300px] flex items-start justify-center">
      <div className="bg-white rounded-xl shadow-md max-w-[280px] w-full overflow-hidden">
        {/* Header */}
        {headerType === 'text' && headerContent && (
          <div className="px-3 pt-3 pb-1 font-bold text-sm text-gray-900">{headerContent}</div>
        )}
        {headerType === 'image' && (
          <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
            {headerContent ? (
              <img src={headerContent} alt="Header" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
        )}
        {headerType === 'video' && (
          <div className="w-full h-36 bg-gray-800 flex items-center justify-center">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Body */}
        <div className="px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
          {bodyText || <span className="text-gray-400 italic">Corps du message...</span>}
        </div>

        {/* Footer */}
        {footerText && (
          <div className="px-3 pb-2 text-xs text-gray-500">{footerText}</div>
        )}

        {/* Timestamp */}
        <div className="px-3 pb-2 text-right">
          <span className="text-[10px] text-gray-400">12:00</span>
        </div>

        {/* Buttons */}
        {buttons.filter((b) => b.text.trim()).length > 0 && (
          <div className="border-t border-gray-100">
            {buttons
              .filter((b) => b.text.trim())
              .map((btn, i) => (
                <div
                  key={i}
                  className="text-center py-2 text-sm text-teal-600 font-medium border-b border-gray-100 last:border-b-0 flex items-center justify-center gap-1"
                >
                  {btn.type === 'URL' && <LinkIcon className="w-3 h-3" />}
                  {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                  {btn.type === 'QUICK_REPLY' && <MessageSquare className="w-3 h-3" />}
                  {btn.text}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WhatsAppTemplatesPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Templates list
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLanguage, setFormLanguage] = useState('fr');
  const [formCategory, setFormCategory] = useState<'MARKETING' | 'UTILITY'>('MARKETING');
  const [formHeaderType, setFormHeaderType] = useState<HeaderType>('none');
  const [formHeaderContent, setFormHeaderContent] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formFooter, setFormFooter] = useState('');
  const [formButtons, setFormButtons] = useState<TemplateButton[]>([]);

  // Feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // -----------------------------------------------------------------------
  // Auth & data fetch
  // -----------------------------------------------------------------------

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await supabase.from('merchants').select('*').eq('id', user.id).single();
      if (!data) {
        router.push('/login');
        return;
      }
      setMerchant(data);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    if (merchant?.id) {
      fetchTemplates(merchant.id);
    }
  }, [merchant]);

  // -----------------------------------------------------------------------
  // API helpers
  // -----------------------------------------------------------------------

  const fetchTemplates = async (merchantId: string) => {
    setFetchingTemplates(true);
    try {
      const res = await fetch(`/api/whatsapp/templates?merchantId=${merchantId}`);
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des templates:', err);
    } finally {
      setFetchingTemplates(false);
    }
  };

  const syncTemplates = async () => {
    if (!merchant) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', merchantId: merchant.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Templates synchronises depuis Meta avec succes.' });
        fetchTemplates(merchant.id);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la synchronisation.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!merchant) return;
    if (!confirm('Supprimer ce template ? Cette action est irreversible.')) return;
    setDeleting(templateId);
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchant.id, templateId }),
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setMessage({ type: 'success', text: 'Template supprime.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la suppression.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setDeleting(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const submitTemplate = async () => {
    if (!merchant) return;
    if (!formName.trim() || !formBody.trim()) {
      setMessage({ type: 'error', text: 'Le nom et le corps du message sont obligatoires.' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const components: TemplateComponent[] = [];

    // Header
    if (formHeaderType !== 'none') {
      const header: TemplateComponent = { type: 'HEADER' };
      if (formHeaderType === 'text') {
        header.format = 'TEXT';
        header.text = formHeaderContent;
      } else if (formHeaderType === 'image') {
        header.format = 'IMAGE';
        header.text = formHeaderContent;
      } else if (formHeaderType === 'video') {
        header.format = 'VIDEO';
        header.text = formHeaderContent;
      }
      components.push(header);
    }

    // Body
    components.push({ type: 'BODY', text: formBody });

    // Footer
    if (formFooter.trim()) {
      components.push({ type: 'FOOTER', text: formFooter });
    }

    // Buttons
    const validButtons = formButtons.filter((b) => b.text.trim());
    if (validButtons.length > 0) {
      components.push({ type: 'BUTTONS', buttons: validButtons });
    }

    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          merchantId: merchant.id,
          name: formName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          language: formLanguage,
          category: formCategory,
          components,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Template soumis a Meta pour approbation.' });
        resetForm();
        setShowCreateForm(false);
        fetchTemplates(merchant.id);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la creation du template.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // -----------------------------------------------------------------------
  // Form helpers
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setFormName('');
    setFormLanguage('fr');
    setFormCategory('MARKETING');
    setFormHeaderType('none');
    setFormHeaderContent('');
    setFormBody('');
    setFormFooter('');
    setFormButtons([]);
  };

  const addButton = () => {
    if (formButtons.length >= 3) return;
    setFormButtons((prev) => [...prev, { type: 'QUICK_REPLY', text: '' }]);
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    setFormButtons((prev) => prev.map((b, i) => (i === index ? { ...b, ...updates } : b)));
  };

  const removeButton = (index: number) => {
    setFormButtons((prev) => prev.filter((_, i) => i !== index));
  };

  // Sanitise template name as user types
  const handleNameChange = (value: string) => {
    setFormName(value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-teal-600" />
              Templates WhatsApp
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gerez vos modeles de messages WhatsApp Business
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={syncTemplates}
              disabled={syncing}
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Synchroniser depuis Meta'}
            </Button>
            <Button
              onClick={() => setShowCreateForm((v) => !v)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {showCreateForm ? (
                <>
                  <X className="w-4 h-4 mr-2" /> Fermer
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Nouveau template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Status message                                                    */}
        {/* ----------------------------------------------------------------- */}
        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {message.text}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Create Template Form                                              */}
        {/* ----------------------------------------------------------------- */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                Creer un nouveau template
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x lg:divide-gray-100">
              {/* Left: Form Fields */}
              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du template
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="mon_template_promo"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minuscules et underscores uniquement</p>
                </div>

                {/* Language & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Globe className="w-3.5 h-3.5 inline mr-1" />
                      Langue
                    </label>
                    <select
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="fr">Francais</option>
                      <option value="en">Anglais</option>
                      <option value="es">Espagnol</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categorie
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as 'MARKETING' | 'UTILITY')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utilitaire</option>
                    </select>
                  </div>
                </div>

                {/* Header */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">En-tete</label>
                  <div className="flex gap-2 mb-2">
                    {(['none', 'text', 'image', 'video'] as HeaderType[]).map((ht) => (
                      <button
                        key={ht}
                        type="button"
                        onClick={() => {
                          setFormHeaderType(ht);
                          setFormHeaderContent('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          formHeaderType === ht
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                        }`}
                      >
                        {ht === 'none' && 'Aucun'}
                        {ht === 'text' && 'Texte'}
                        {ht === 'image' && 'Image'}
                        {ht === 'video' && 'Video'}
                      </button>
                    ))}
                  </div>
                  {formHeaderType === 'text' && (
                    <input
                      type="text"
                      value={formHeaderContent}
                      onChange={(e) => setFormHeaderContent(e.target.value)}
                      placeholder="Texte de l'en-tete"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                  {(formHeaderType === 'image' || formHeaderType === 'video') && (
                    <input
                      type="text"
                      value={formHeaderContent}
                      onChange={(e) => setFormHeaderContent(e.target.value)}
                      placeholder={formHeaderType === 'image' ? "URL de l'image" : 'URL de la video'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  )}
                </div>

                {/* Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corps du message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    rows={5}
                    placeholder={"Bonjour {{1}},\n\nDecouvrez notre offre speciale : {{2}} !\n\nA bientot."}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Utilisez {"{{1}}"}, {"{{2}}"}, etc. pour les variables dynamiques
                  </p>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pied de page <span className="text-gray-400 text-xs">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={formFooter}
                    onChange={(e) => setFormFooter(e.target.value)}
                    placeholder="Ex: Repondez STOP pour vous desabonner"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Boutons <span className="text-gray-400 text-xs">(max 3)</span>
                    </label>
                    {formButtons.length < 3 && (
                      <button
                        type="button"
                        onClick={addButton}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Ajouter
                      </button>
                    )}
                  </div>
                  {formButtons.length === 0 && (
                    <p className="text-xs text-gray-400 italic">Aucun bouton ajoute</p>
                  )}
                  <div className="space-y-3">
                    {formButtons.map((btn, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => removeButton(i)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">Type</label>
                            <select
                              value={btn.type}
                              onChange={(e) =>
                                updateButton(i, { type: e.target.value as TemplateButton['type'] })
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="URL">URL</option>
                              <option value="QUICK_REPLY">Reponse rapide</option>
                              <option value="PHONE_NUMBER">Telephone</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Titre (max 25 car.)</label>
                            <input
                              type="text"
                              value={btn.text}
                              maxLength={25}
                              onChange={(e) => updateButton(i, { text: e.target.value })}
                              placeholder="Titre du bouton"
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                        {btn.type === 'URL' && (
                          <div>
                            <label className="text-xs text-gray-500">URL</label>
                            <input
                              type="text"
                              value={btn.url || ''}
                              onChange={(e) => updateButton(i, { url: e.target.value })}
                              placeholder="https://example.com"
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        )}
                        {btn.type === 'PHONE_NUMBER' && (
                          <div>
                            <label className="text-xs text-gray-500">Numero de telephone</label>
                            <input
                              type="text"
                              value={btn.phone_number || ''}
                              onChange={(e) => updateButton(i, { phone_number: e.target.value })}
                              placeholder="+33612345678"
                              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <Button
                    onClick={submitTemplate}
                    disabled={submitting || !formName.trim() || !formBody.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" /> Soumettre a Meta
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-600" />
                  Apercu en direct
                </h3>
                <LivePreview
                  headerType={formHeaderType}
                  headerContent={formHeaderContent}
                  bodyText={formBody}
                  footerText={formFooter}
                  buttons={formButtons}
                />
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* Templates List                                                    */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Vos templates
              {templates.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                  {templates.length}
                </span>
              )}
            </h2>
            {fetchingTemplates && <Loader2 className="w-4 h-4 animate-spin text-teal-600" />}
          </div>

          {templates.length === 0 && !fetchingTemplates ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Aucun template pour le moment</p>
              <p className="text-sm text-gray-400 mt-1">
                Creez votre premier template ou synchronisez depuis Meta
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Nom</th>
                      <th className="px-6 py-3">Langue</th>
                      <th className="px-6 py-3">Categorie</th>
                      <th className="px-6 py-3">Statut</th>
                      <th className="px-6 py-3">Cree le</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {templates.map((tpl) => (
                      <tr key={tpl.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-sm text-gray-900">{tpl.name}</div>
                          {tpl.status === 'REJECTED' && tpl.rejection_reason && (
                            <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {tpl.rejection_reason}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {LANGUAGE_LABELS[tpl.language] || tpl.language}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {CATEGORY_LABELS[tpl.category] || tpl.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={tpl.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(tpl.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteTemplate(tpl.id)}
                            disabled={deleting === tpl.id}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            title="Supprimer"
                          >
                            {deleting === tpl.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{tpl.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {LANGUAGE_LABELS[tpl.language] || tpl.language}
                          </span>
                          <span className="text-xs text-gray-500">
                            {CATEGORY_LABELS[tpl.category] || tpl.category}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTemplate(tpl.id)}
                        disabled={deleting === tpl.id}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        {deleting === tpl.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={tpl.status} />
                      <span className="text-xs text-gray-400">{formatDate(tpl.created_at)}</span>
                    </div>
                    {tpl.status === 'REJECTED' && tpl.rejection_reason && (
                      <p className="text-xs text-red-500 flex items-start gap-1 bg-red-50 rounded-lg px-3 py-2">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {tpl.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

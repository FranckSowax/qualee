'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Prize } from '@/lib/types/database';
import { Plus, Trash2, AlertCircle, Upload, Image as ImageIcon, Percent, Pencil, X, Ban, RefreshCw, Lock, Palette, Gift, Settings2, BarChart3, Sparkles } from 'lucide-react';
import { WheelPreview, PrizeWithQuantity } from '@/components/dashboard/WheelPreview';

// Default segment colors (S1-S6 = prizes, S7 = #UNLUCKY#, S8 = #R&#xC9;ESSAYER#)
const DEFAULT_SEGMENT_COLORS = [
  { color: '#FF6B6B', textColor: '#FFFFFF', borderColor: '#FF5252' },
  { color: '#4ECDC4', textColor: '#FFFFFF', borderColor: '#26A69A' },
  { color: '#45B7D1', textColor: '#FFFFFF', borderColor: '#2196F3' },
  { color: '#96CEB4', textColor: '#FFFFFF', borderColor: '#4CAF50' },
  { color: '#FFEAA7', textColor: '#2D3436', borderColor: '#FDCB6E' },
  { color: '#DDA0DD', textColor: '#FFFFFF', borderColor: '#BA55D3' },
  { color: '#DC2626', textColor: '#FFFFFF', borderColor: '#B91C1C' },  // #UNLUCKY#
  { color: '#F59E0B', textColor: '#1F2937', borderColor: '#D97706' },  // #R\u00C9ESSAYER#
];

// Labels for each segment slot
const SEGMENT_LABELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', '#UNLUCKY#', '#R\u00C9ESSAYER#'];

// Special segment types that are always present on the wheel
const SPECIAL_SEGMENTS = {
  UNLUCKY: 'unlucky',
  RETRY: 'retry',
} as const;

type TabId = 'prizes' | 'config';

export default function PrizesPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation(undefined, { useSuspense: false });
  const isFr = i18n.language === 'fr';

  // Wheel themes
  const WHEEL_THEMES = [
    {
      name: isFr ? 'Classique' : 'Classic',
      colors: [
        { bg: '#FF6B6B', text: '#FFFFFF' },
        { bg: '#4ECDC4', text: '#FFFFFF' },
        { bg: '#45B7D1', text: '#FFFFFF' },
        { bg: '#96CEB4', text: '#FFFFFF' },
        { bg: '#FFEAA7', text: '#333333' },
        { bg: '#DDA0DD', text: '#FFFFFF' },
        { bg: '#DC2626', text: '#FFFFFF' },
        { bg: '#F59E0B', text: '#FFFFFF' },
      ]
    },
    {
      name: isFr ? 'Qualee Pink' : 'Qualee Pink',
      colors: [
        { bg: '#0D9488', text: '#FFFFFF' },
        { bg: '#14B8A6', text: '#FFFFFF' },
        { bg: '#2DD4BF', text: '#333333' },
        { bg: '#10B981', text: '#FFFFFF' },
        { bg: '#34D399', text: '#333333' },
        { bg: '#059669', text: '#FFFFFF' },
        { bg: '#DC2626', text: '#FFFFFF' },
        { bg: '#F59E0B', text: '#FFFFFF' },
      ]
    },
    {
      name: isFr ? 'Oc\u00E9an' : 'Ocean',
      colors: [
        { bg: '#0EA5E9', text: '#FFFFFF' },
        { bg: '#06B6D4', text: '#FFFFFF' },
        { bg: '#14B8A6', text: '#FFFFFF' },
        { bg: '#0284C7', text: '#FFFFFF' },
        { bg: '#22D3EE', text: '#333333' },
        { bg: '#0D9488', text: '#FFFFFF' },
        { bg: '#DC2626', text: '#FFFFFF' },
        { bg: '#F59E0B', text: '#FFFFFF' },
      ]
    },
    {
      name: isFr ? 'Vibrant' : 'Vibrant',
      colors: [
        { bg: '#0D9488', text: '#FFFFFF' },
        { bg: '#F59E0B', text: '#333333' },
        { bg: '#EC4899', text: '#FFFFFF' },
        { bg: '#8B5CF6', text: '#FFFFFF' },
        { bg: '#10B981', text: '#FFFFFF' },
        { bg: '#EF4444', text: '#FFFFFF' },
        { bg: '#DC2626', text: '#FFFFFF' },
        { bg: '#F59E0B', text: '#FFFFFF' },
      ]
    },
  ];

  const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'prizes', icon: <Gift className="w-4 h-4" />, label: isFr ? 'Prix & Probabilit\u00E9s' : 'Prizes & Probabilities' },
    { id: 'config', icon: <Settings2 className="w-4 h-4" />, label: isFr ? 'Configuration & Aper\u00E7u' : 'Configuration & Preview' },
  ];

  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    probability: 10,
  });

  const [activeTab, setActiveTab] = useState<TabId>('prizes');

  // Segment quantities for the wheel (max 8 total segments)
  const MAX_SEGMENTS = 8;
  const [prizeQuantities, setPrizeQuantities] = useState<Record<string, number>>({});
  const [unluckyQuantity, setUnluckyQuantity] = useState(1);
  const [retryQuantity, setRetryQuantity] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [segmentColors, setSegmentColors] = useState(DEFAULT_SEGMENT_COLORS);
  const [selectedTheme, setSelectedTheme] = useState<number | null>(null);

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

      // Load segment quantities from merchant data (or use defaults)
      if (merchantData?.unlucky_quantity !== undefined) {
        setUnluckyQuantity(merchantData.unlucky_quantity);
      }
      if (merchantData?.retry_quantity !== undefined) {
        setRetryQuantity(merchantData.retry_quantity);
      }
      if (merchantData?.prize_quantities) {
        setPrizeQuantities(merchantData.prize_quantities);
      }
      if (merchantData?.segment_colors && Array.isArray(merchantData.segment_colors) && merchantData.segment_colors.length > 0) {
        setSegmentColors(merchantData.segment_colors);
      }

      fetchPrizes(user.id);
    };

    checkAuth();
  }, [router]);

  const fetchPrizes = async (merchantId: string) => {
    const { data } = await supabase
      .from('prizes')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    setPrizes(data || []);
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `prizes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('merchant-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload image');
    }

    const { data: { publicUrl } } = supabase.storage
      .from('merchant-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUploading(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      } else if (editingId) {
        // Keep existing image if editing and no new file selected
        const existingPrize = prizes.find(p => p.id === editingId);
        imageUrl = existingPrize?.image_url;
      }

      const prizeData = {
        merchant_id: user.id,
        name: formData.name,
        description: formData.description,
        probability: formData.probability,
        image_url: imageUrl,
      };

      if (editingId) {
        const { error } = await supabase
          .from('prizes')
          .update(prizeData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prizes')
          .insert(prizeData);
        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', probability: 10 });
      setImageFile(null);
      setImagePreview('');
      fetchPrizes(user.id);
    } catch (error: any) {
      alert(error.message || 'Failed to save prize');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleEdit = (prize: Prize) => {
    setFormData({
      name: prize.name,
      description: prize.description || '',
      probability: prize.probability,
    });
    setEditingId(prize.id);
    setImagePreview(prize.image_url || '');
    setShowForm(true);
    setActiveTab('prizes');
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', probability: 10 });
    setImageFile(null);
    setImagePreview('');
  };

  const handleDelete = async (prizeId: string) => {
    if (!confirm(isFr ? 'Voulez-vous vraiment supprimer ce prix ?' : 'Are you sure you want to delete this prize?')) return;

    await supabase.from('prizes').delete().eq('id', prizeId);
    fetchPrizes(user.id);
  };

  // Apply a wheel theme
  const applyTheme = (themeIndex: number) => {
    const theme = WHEEL_THEMES[themeIndex];
    const newColors = theme.colors.map(c => ({
      color: c.bg,
      textColor: c.text,
      borderColor: c.bg,
    }));
    setSegmentColors(newColors);
    setSelectedTheme(themeIndex);
  };

  // Detect if current colors match a theme
  const detectActiveTheme = (): number | null => {
    for (let i = 0; i < WHEEL_THEMES.length; i++) {
      const theme = WHEEL_THEMES[i];
      const matches = theme.colors.every((c, idx) =>
        segmentColors[idx]?.color === c.bg && segmentColors[idx]?.textColor === c.text
      );
      if (matches) return i;
    }
    return null;
  };

  // Calculate total segments used
  const totalPrizeSegments = Object.values(prizeQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalSegments = totalPrizeSegments + unluckyQuantity + retryQuantity;
  const remainingSegments = MAX_SEGMENTS - totalSegments;

  // Build prize quantities array for WheelPreview
  const prizeQuantitiesArray: PrizeWithQuantity[] = prizes.map(prize => ({
    prize,
    quantity: prizeQuantities[prize.id] || 0
  }));

  // Update prize quantity
  const updatePrizeQuantity = (prizeId: string, delta: number) => {
    const currentQty = prizeQuantities[prizeId] || 0;
    const newQty = Math.max(0, currentQty + delta);

    // Check if we can add more segments
    if (delta > 0 && totalSegments >= MAX_SEGMENTS) {
      return; // Can't add more
    }

    setPrizeQuantities(prev => ({
      ...prev,
      [prizeId]: newQty
    }));
  };

  // Update special segment quantity
  const updateUnluckyQuantity = (delta: number) => {
    const newQty = Math.max(0, unluckyQuantity + delta);
    if (delta > 0 && totalSegments >= MAX_SEGMENTS) return;
    setUnluckyQuantity(newQty);
  };

  const updateRetryQuantity = (delta: number) => {
    const newQty = Math.max(0, retryQuantity + delta);
    if (delta > 0 && totalSegments >= MAX_SEGMENTS) return;
    setRetryQuantity(newQty);
  };

  // Save segment quantities to merchant
  const saveSegmentQuantities = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          unlucky_quantity: unluckyQuantity,
          retry_quantity: retryQuantity,
          prize_quantities: prizeQuantities,
          segment_colors: segmentColors,
        })
        .eq('id', user.id);

      if (error) throw error;
      setMigrationNeeded(false);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'PGRST204' || err.message?.includes('quantity')) {
        setMigrationNeeded(true);
      }
    }
  };

  // Auto-save when quantities change
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        saveSegmentQuantities();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [unluckyQuantity, retryQuantity, prizeQuantities, segmentColors, user]);

  const getChanceDescription = (prob: number) => {
    if (prob >= 50) return { text: isFr ? 'Tr\u00E8s fr\u00E9quent' : 'Very frequent', color: 'text-green-600', bg: 'bg-green-50' };
    if (prob >= 25) return { text: isFr ? 'Fr\u00E9quent' : 'Frequent', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (prob >= 10) return { text: isFr ? 'Moyen' : 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (prob >= 5) return { text: isFr ? 'Rare' : 'Rare', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { text: isFr ? 'Tr\u00E8s rare' : 'Very rare', color: 'text-red-600', bg: 'bg-red-50' };
  };

  // Current active theme (either manually selected or auto-detected)
  const activeThemeIndex = selectedTheme !== null ? selectedTheme : detectActiveTheme();

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{isFr ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6 max-w-5xl">
        {/* Migration Warning */}
        {migrationNeeded && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">{isFr ? 'Mise \u00E0 jour de la base de donn\u00E9es requise' : 'Database update required'}</h3>
              <p className="text-sm text-amber-700 mt-1">
                {isFr ? 'Les colonnes pour les probabilit\u00E9s sp\u00E9ciales manquent dans la base de donn\u00E9es.' : 'The columns for special probabilities are missing from the database.'}
              </p>
              <pre className="mt-2 bg-amber-100 p-2 rounded text-xs overflow-x-auto text-amber-900 border border-amber-200">
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS unlucky_probability INTEGER DEFAULT 20;{'\n'}
                ALTER TABLE merchants ADD COLUMN IF NOT EXISTS retry_probability INTEGER DEFAULT 10;
              </pre>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{isFr ? 'Gestion des Prix' : 'Prize Management'}</h1>
            <p className="text-gray-500 text-sm">{isFr ? 'Configurez vos prix et la roue de la chance' : 'Configure your prizes and the wheel of fortune'}</p>
          </div>
          {/* Summary badges */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200">
              <Gift className="w-3.5 h-3.5" />
              {prizes.length} {isFr ? 'prix' : 'prizes'}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              remainingSegments === 0
                ? 'bg-green-50 text-green-700 border-green-200'
                : remainingSegments > 0
                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <Percent className="w-3.5 h-3.5" />
              {totalSegments}/{MAX_SEGMENTS} segments
            </span>
          </div>
        </div>

        {/* Tabs Navigation */}
        <nav className="flex gap-1 border-b-2 border-gray-100 overflow-x-auto" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-teal-700 hover:bg-teal-50/50'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 transition-transform duration-300 origin-left ${
                  activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="animate-[fadeIn_0.3s_ease-out]" key={activeTab}>

          {/* ===== PRIZES & PROBABILITIES TAB ===== */}
          {activeTab === 'prizes' && (
            <div className="space-y-5">
              {/* Add Prize Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => showForm ? handleCancel() : setShowForm(true)}
                  className={`gap-2 ${showForm ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                  variant={showForm ? 'outline' : 'default'}
                  size="sm"
                >
                  {showForm ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>{isFr ? 'Annuler' : 'Cancel'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isFr ? 'Ajouter un Prix' : 'Add a Prize'}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Inline Add/Edit Form */}
              {showForm && (
                <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                    {editingId ? (isFr ? 'Modifier le Prix' : 'Edit Prize') : (isFr ? 'Nouveau Prix' : 'New Prize')}
                  </h3>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left column: image */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo</label>
                        {imagePreview ? (
                          <div className="relative h-36 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            <img src={imagePreview} alt="Prize preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => { setImageFile(null); setImagePreview(''); }}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors h-36 flex flex-col items-center justify-center">
                            <input
                              type="file"
                              id="prize-image"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                            <label htmlFor="prize-image" className="cursor-pointer">
                              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-600">
                                <span className="text-teal-600 font-semibold">{isFr ? 'Cliquez' : 'Click'}</span> {isFr ? 'pour uploader' : 'to upload'}
                              </p>
                              <p className="text-xs text-gray-400">PNG, JPG</p>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Right column: fields */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{isFr ? 'Nom du Prix' : 'Prize Name'}</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={isFr ? 'R\u00E9duction de 10%' : '10% discount'}
                            required
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder={isFr ? 'Obtenez 10% de r\u00E9duction...' : 'Get 10% off...'}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">{isFr ? 'Probabilit\u00E9' : 'Probability'}</label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg font-bold text-teal-600">{formData.probability}%</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${getChanceDescription(formData.probability).bg} ${getChanceDescription(formData.probability).color} font-medium`}>
                                {getChanceDescription(formData.probability).text}
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={formData.probability}
                            onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>1%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                        {isFr ? 'Annuler' : 'Cancel'}
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading || uploading}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white px-6"
                      >
                        {uploading ? (isFr ? 'Upload...' : 'Uploading...') : loading ? (isFr ? 'Sauvegarde...' : 'Saving...') : (editingId ? (isFr ? 'Mettre \u00E0 jour' : 'Update') : (isFr ? 'Cr\u00E9er le Prix' : 'Create Prize'))}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Prize Grid */}
              {prizes.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {prizes.map((prize) => {
                    const quantity = prizeQuantities[prize.id] || 0;
                    return (
                      <Card key={prize.id} className="group relative p-0 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                        <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />

                        {/* Image / Placeholder */}
                        {prize.image_url ? (
                          <div className="relative h-28 bg-gradient-to-br from-teal-100 to-emerald-50">
                            <img src={prize.image_url} alt={prize.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shadow ${quantity > 0 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                x{quantity}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="relative h-28 bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
                            <Gift className="w-10 h-10 text-teal-300" />
                            <div className="absolute top-2 right-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold shadow ${quantity > 0 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                x{quantity}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="p-3">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{prize.name}</h4>
                          {prize.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{prize.description}</p>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <Button
                              onClick={() => updatePrizeQuantity(prize.id, -1)}
                              disabled={quantity <= 0}
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 border-teal-300 text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                            >
                              -
                            </Button>
                            <span className="text-lg font-bold text-teal-600 w-6 text-center">{quantity}</span>
                            <Button
                              onClick={() => updatePrizeQuantity(prize.id, 1)}
                              disabled={totalSegments >= MAX_SEGMENTS}
                              variant="outline"
                              size="sm"
                              className="w-7 h-7 rounded-full p-0 border-teal-300 text-teal-600 hover:bg-teal-50 disabled:opacity-50"
                            >
                              +
                            </Button>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1.5 mt-2">
                            <Button
                              onClick={() => handleEdit(prize)}
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs h-7 text-gray-600 border-gray-200 hover:bg-gray-50 gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              {isFr ? 'Modifier' : 'Edit'}
                            </Button>
                            <Button
                              onClick={() => handleDelete(prize.id)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-red-600 border-red-200 hover:bg-red-50 px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : !showForm ? (
                <Card className="group relative p-10 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{isFr ? 'Aucun prix configur\u00E9' : 'No prizes configured'}</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      {isFr ? 'Ajoutez votre premier prix pour configurer la roue.' : 'Add your first prize to configure the wheel.'}
                    </p>
                    <Button onClick={() => setShowForm(true)} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white" size="sm">
                      <Plus className="w-4 h-4" />
                      {isFr ? 'Ajouter mon Premier Prix' : 'Add my First Prize'}
                    </Button>
                  </div>
                </Card>
              ) : null}

              {/* Wheel Composition Stats */}
              <Card className="group relative p-4 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{isFr ? 'Composition de la Roue' : 'Wheel Composition'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'R\u00E9partition des segments' : 'Segment distribution'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Visual segment usage indicator */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: MAX_SEGMENTS }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-6 rounded-sm transition-colors ${
                            i < totalSegments
                              ? i < totalPrizeSegments
                                ? 'bg-teal-500'
                                : i < totalPrizeSegments + unluckyQuantity
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-sm font-bold ${
                      totalSegments === MAX_SEGMENTS ? 'text-green-600' : totalSegments > MAX_SEGMENTS ? 'text-red-600' : 'text-teal-600'
                    }`}>
                      {totalSegments}/{MAX_SEGMENTS}
                    </span>
                  </div>
                </div>
                {totalSegments < MAX_SEGMENTS && (
                  <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    {isFr
                      ? `${remainingSegments} segment${remainingSegments > 1 ? 's' : ''} restant${remainingSegments > 1 ? 's' : ''} \u00E0 assigner`
                      : `${remainingSegments} segment${remainingSegments > 1 ? 's' : ''} remaining to assign`}
                  </p>
                )}
                {totalSegments === MAX_SEGMENTS && (
                  <p className="mt-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    {isFr ? 'Roue compl\u00E8te ! Tous les segments sont assign\u00E9s.' : 'Wheel complete! All segments are assigned.'}
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* ===== CONFIGURATION & PREVIEW TAB ===== */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Special Segments - Compact inline */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Segments Sp\u00E9ciaux' : 'Special Segments'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'Segments permanents sur la roue' : 'Permanent segments on the wheel'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* UNLUCKY */}
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-red-200 bg-red-50/50">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      <Ban className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">#UNLUCKY#</p>
                      <p className="text-xs text-gray-500">{isFr ? '\u00C9liminatoire' : 'Elimination'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => updateUnluckyQuantity(-1)}
                        disabled={unluckyQuantity <= 0}
                        variant="outline"
                        size="sm"
                        className="w-7 h-7 rounded-full p-0 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        -
                      </Button>
                      <span className="text-xl font-bold text-red-600 w-6 text-center">{unluckyQuantity}</span>
                      <Button
                        onClick={() => updateUnluckyQuantity(1)}
                        disabled={totalSegments >= MAX_SEGMENTS}
                        variant="outline"
                        size="sm"
                        className="w-7 h-7 rounded-full p-0 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* RETRY */}
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-yellow-200 bg-yellow-50/50">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center flex-shrink-0">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">#R\u00C9ESSAYER#</p>
                      <p className="text-xs text-gray-500">{isFr ? 'Tour suppl\u00E9mentaire' : 'Extra spin'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => updateRetryQuantity(-1)}
                        disabled={retryQuantity <= 0}
                        variant="outline"
                        size="sm"
                        className="w-7 h-7 rounded-full p-0 border-yellow-300 text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                      >
                        -
                      </Button>
                      <span className="text-xl font-bold text-yellow-600 w-6 text-center">{retryQuantity}</span>
                      <Button
                        onClick={() => updateRetryQuantity(1)}
                        disabled={totalSegments >= MAX_SEGMENTS}
                        variant="outline"
                        size="sm"
                        className="w-7 h-7 rounded-full p-0 border-yellow-300 text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {totalSegments === 0 && (
                  <div className="mt-4 flex items-center gap-2 text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{isFr ? 'Ajoutez des segments \u00E0 la roue pour la configurer.' : 'Add segments to the wheel to configure it.'}</span>
                  </div>
                )}
              </Card>

              {/* Wheel Themes */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Th\u00E8mes de la Roue' : 'Wheel Themes'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? 'Choisissez un th\u00E8me ou personnalisez les couleurs ci-dessous' : 'Choose a theme or customize colors below'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {WHEEL_THEMES.map((theme, index) => {
                    const isActive = activeThemeIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => applyTheme(index)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${
                          isActive
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-sm font-semibold mb-2 ${isActive ? 'text-teal-700' : 'text-gray-700'}`}>
                          {theme.name}
                        </p>
                        <div className="flex gap-1.5">
                          {theme.colors.slice(0, 6).map((c, ci) => (
                            <div
                              key={ci}
                              className="w-5 h-5 rounded-full border border-gray-200"
                              style={{ backgroundColor: c.bg }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Wheel Preview + Segment Colors side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Wheel Preview */}
                <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Settings2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Aper\u00E7u de la Roue' : 'Wheel Preview'}</h3>
                      <p className="text-xs text-gray-500">{totalSegments}/{MAX_SEGMENTS} segments {isFr ? 'configur\u00E9s' : 'configured'}</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <WheelPreview
                      prizeQuantities={prizeQuantitiesArray}
                      unluckyQuantity={unluckyQuantity}
                      retryQuantity={retryQuantity}
                      size={260}
                      maxSegments={MAX_SEGMENTS}
                      segmentColors={segmentColors}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                      {isFr ? 'Prix' : 'Prizes'}: {totalPrizeSegments}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                      #UNLUCKY# x{unluckyQuantity}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium border border-yellow-200">
                      #R\u00C9ESSAYER# x{retryQuantity}
                    </span>
                  </div>
                </Card>

                {/* Segment Colors */}
                <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{isFr ? 'Couleurs des segments' : 'Segment Colors'}</h3>
                      <p className="text-xs text-gray-500">{isFr ? 'Fond + texte par segment' : 'Background + text per segment'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {segmentColors.map((config, index) => {
                      const label = SEGMENT_LABELS[index] || `S${index + 1}`;
                      const isSpecial = index >= 6;
                      return (
                        <div key={index} className={`rounded-lg p-2 border flex items-center gap-2 ${
                          isSpecial ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                        }`}>
                          <span className={`text-xs flex-shrink-0 font-medium ${
                            index === 6 ? 'text-red-600' : index === 7 ? 'text-yellow-600' : 'text-gray-500'
                          }`}>{label}</span>
                          <div className="flex gap-1 ml-auto">
                            <label className="cursor-pointer" title={isFr ? 'Couleur du segment' : 'Segment color'}>
                              <input
                                type="color"
                                value={config.color}
                                onChange={(e) => {
                                  const newColors = [...segmentColors];
                                  newColors[index] = { ...config, color: e.target.value, borderColor: e.target.value };
                                  setSegmentColors(newColors);
                                  setSelectedTheme(null);
                                }}
                                className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                              />
                            </label>
                            <label className="cursor-pointer" title={isFr ? 'Couleur du texte' : 'Text color'}>
                              <input
                                type="color"
                                value={config.textColor}
                                onChange={(e) => {
                                  const newColors = [...segmentColors];
                                  newColors[index] = { ...config, textColor: e.target.value };
                                  setSegmentColors(newColors);
                                  setSelectedTheme(null);
                                }}
                                className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{isFr ? '1er carr\u00E9 = fond, 2e = texte. S7/S8 = sp\u00E9ciaux.' : '1st square = background, 2nd = text. S7/S8 = special.'}</p>
                </Card>
              </div>

              {/* Configuration Summary */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{isFr ? 'R\u00E9sum\u00E9 de la Configuration' : 'Configuration Summary'}</h3>
                    <p className="text-xs text-gray-500">{isFr ? "Vue d'ensemble de votre roue" : 'Overview of your wheel'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-center">
                    <p className="text-2xl font-bold text-teal-600">{totalSegments}</p>
                    <p className="text-xs text-teal-700 font-medium">{isFr ? 'Segments totaux' : 'Total Segments'}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{totalPrizeSegments}</p>
                    <p className="text-xs text-emerald-700 font-medium">{isFr ? 'Segments prix' : 'Prize Segments'}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{unluckyQuantity + retryQuantity}</p>
                    <p className="text-xs text-red-700 font-medium">{isFr ? 'Segments sp\u00E9ciaux' : 'Special Segments'}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">
                      {totalSegments > 0 ? Math.round((totalPrizeSegments / totalSegments) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-700 font-medium">{isFr ? 'Chance de gain' : 'Win Chance'}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

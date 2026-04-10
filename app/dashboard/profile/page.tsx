'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload, Image as ImageIcon, Check, X, Loader2, Save,
  UserCircle, Palette, Building2, Mail, Phone, MapPin, Globe, User
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';

type TabId = 'info' | 'appearance';

const TABS: { id: TabId; icon: React.ReactNode; labelFr: string; labelEn: string }[] = [
  { id: 'info', icon: <UserCircle className="w-4 h-4" />, labelFr: 'Informations', labelEn: 'Information' },
  { id: 'appearance', icon: <Palette className="w-4 h-4" />, labelFr: 'Apparence', labelEn: 'Appearance' },
];

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isFr = i18n.language === 'fr';

  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [backgroundPreview, setBackgroundPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string, sql?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('info');

  // Contact info state
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');


  // Appearance state
  const [logoBackgroundColor, setLogoBackgroundColor] = useState('#FFFFFF');

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

      if (merchantData) {
        setMerchant(merchantData);
        setBusinessName(merchantData.business_name || '');
        setEmail(merchantData.email || '');
        setPhone(merchantData.phone || '');
        setAddress(merchantData.address || '');
        setCity(merchantData.city || '');
        setCountry(merchantData.country || '');
        setWebsite(merchantData?.website || '');
        setManagerName(merchantData?.manager_name || '');
        setManagerPhone(merchantData?.manager_phone || '');
        setLogoBackgroundColor(merchantData.logo_background_color || '#FFFFFF');
        if (merchantData.logo_url) setLogoPreview(merchantData.logo_url);
        if (merchantData.background_url) setBackgroundPreview(merchantData.background_url);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundFile(file);

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const target = 9 / 16;
        if (Math.abs(aspectRatio - target) > 0.15) {
          setMessage({
            type: 'error',
            text: isFr
              ? `Le ratio de l'image est ${(aspectRatio * 16 / 9).toFixed(2)}:16. Recommande : 9:16 (format vertical)`
              : `Image ratio is ${(aspectRatio * 16 / 9).toFixed(2)}:16. Recommended: 9:16 (vertical format)`
          });
        } else {
          setMessage(null);
        }
      };
      img.src = URL.createObjectURL(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

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

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const updates: any = {};

      if (activeTab === 'info') {
        updates.business_name = businessName;
        updates.email = email;
        updates.phone = phone;
        updates.address = address;
        updates.city = city;
        updates.country = country;
        updates.website = website || null;
        updates.manager_name = managerName || null;
        updates.manager_phone = managerPhone || null;
      } else if (activeTab === 'appearance') {
        updates.logo_background_color = logoBackgroundColor || '#FFFFFF';

        if (logoFile) {
          const logoUrl = await uploadImage(logoFile, 'logos');
          updates.logo_url = logoUrl;
        }

        if (backgroundFile) {
          const backgroundUrl = await uploadImage(backgroundFile, 'backgrounds');
          updates.background_url = backgroundUrl;
        }
      }

      const { error } = await supabase
        .from('merchants')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: isFr ? 'Profil mis a jour avec succes !' : 'Profile updated successfully!'
      });
      setLogoFile(null);
      setBackgroundFile(null);

      // Refresh merchant data
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', user.id)
        .single();
      if (merchantData) {
        setMerchant(merchantData);
      }
    } catch (error: any) {
      if (error.message && (error.message.includes('row-level security') || error.message.includes('StorageApiError'))) {
        setMessage({
          type: 'warning',
          text: isFr ? 'Configuration de la base de donnees requise : les politiques de stockage sont manquantes.' : 'Database configuration required: Storage policies are missing.',
          sql: `
-- Run this in your Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public) VALUES ('merchant-assets', 'merchant-assets', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'merchant-assets' );

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'merchant-assets' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'merchant-assets' AND auth.role() = 'authenticated' );`
        });
      } else {
        setMessage({ type: 'error', text: error.message || (isFr ? 'Erreur lors de la sauvegarde' : 'Failed to save profile') });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">{isFr ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-teal-50/30 transition-all duration-200';

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {isFr ? 'Profil' : 'Profile'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isFr ? 'Gerez les informations et l\'apparence de votre commerce' : 'Manage your business information and appearance'}
          </p>
        </div>

        {/* Success/Error/Warning message */}
        {message && (
          <div
            className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-teal-50 border border-teal-200 text-teal-700'
                : message.type === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            ) : message.type === 'warning' ? (
              <span className="shrink-0 mt-0.5">&#9888;</span>
            ) : (
              <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {message.text}
              {message.sql && (
                <pre className="mt-2 p-3 bg-white/50 rounded border text-xs font-mono overflow-x-auto">
                  {message.sql}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <nav className="flex gap-1 border-b-2 border-gray-100 overflow-x-auto" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMessage(null);
              }}
              className={`
                relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-300 rounded-t-lg whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-teal-700 hover:bg-teal-50/50'
                }
              `}
            >
              {tab.icon}
              <span>{isFr ? tab.labelFr : tab.labelEn}</span>
              {/* Active underline */}
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
          {/* ===== INFORMATIONS TAB ===== */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Business Info Card */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Informations du commerce' : 'Business Information'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Nom et coordonnees de votre etablissement' : 'Name and contact details of your business'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Left column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isFr ? 'Nom de l\'etablissement' : 'Business Name'}
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isFr ? 'Telephone' : 'Phone'}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isFr ? 'Site web' : 'Website'}
                      </label>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Right column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isFr ? 'Nom du gerant' : 'Manager Name'}
                      </label>
                      <input
                        type="text"
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isFr ? 'Telephone du gerant' : 'Manager Phone'}
                      </label>
                      <input
                        type="tel"
                        value={managerPhone}
                        onChange={(e) => setManagerPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Address Card */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Adresse' : 'Address'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Localisation de votre etablissement' : 'Location of your business'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isFr ? 'Adresse' : 'Address'}
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isFr ? 'Ville' : 'City'}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isFr ? 'Pays' : 'Country'}
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ===== APPEARANCE TAB ===== */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              {/* Logo Upload Card */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Logo du commerce' : 'Business Logo'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Affiche en haut de votre page' : 'Displayed at the top of your page'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                  <ImageUpload
                    preview={logoPreview || null}
                    onFileSelect={(file) => {
                      setLogoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLogoPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                    onDelete={() => {
                      setLogoFile(null);
                      setLogoPreview('');
                    }}
                    label={isFr ? 'Cliquer pour telecharger' : 'Click to upload'}
                    sublabel={`PNG, JPG ${isFr ? "jusqu'a" : 'up to'} 5MB`}
                    className={logoPreview ? 'w-32 h-32 shrink-0' : 'flex-1'}
                  />
                </div>
              </Card>

              {/* Background Upload Card */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Image d\'arriere-plan' : 'Background Image'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Arriere-plan de votre page (format 9:16)' : 'Background for your page (9:16 ratio)'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                  <ImageUpload
                    preview={backgroundPreview || null}
                    onFileSelect={(file) => {
                      setBackgroundFile(file);

                      const img = new Image();
                      img.onload = () => {
                        const aspectRatio = img.width / img.height;
                        const target = 9 / 16;
                        if (Math.abs(aspectRatio - target) > 0.15) {
                          setMessage({
                            type: 'error',
                            text: isFr
                              ? `Le ratio de l'image est ${(aspectRatio * 16 / 9).toFixed(2)}:16. Recommande : 9:16 (format vertical)`
                              : `Image ratio is ${(aspectRatio * 16 / 9).toFixed(2)}:16. Recommended: 9:16 (vertical format)`
                          });
                        } else {
                          setMessage(null);
                        }
                      };
                      img.src = URL.createObjectURL(file);

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setBackgroundPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                    onDelete={() => {
                      setBackgroundFile(null);
                      setBackgroundPreview('');
                    }}
                    label={isFr ? 'Cliquer pour telecharger' : 'Click to upload'}
                    sublabel={`PNG, JPG (9:16) ${isFr ? "jusqu'a" : 'up to'} 10MB`}
                    aspectRatio={backgroundPreview ? '9/16' : undefined}
                    className={backgroundPreview ? 'w-32 shrink-0' : 'flex-1'}
                  />
                </div>
              </Card>

              {/* Logo Background Color Card */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Couleur de fond du logo' : 'Logo Background Color'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Couleur affichee derriere votre logo sur la roue' : 'Color displayed behind your logo on the wheel'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={logoBackgroundColor}
                    onChange={(e) => setLogoBackgroundColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer p-1"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={logoBackgroundColor}
                      onChange={(e) => setLogoBackgroundColor(e.target.value)}
                      placeholder="#FFFFFF"
                      className={inputClass}
                    />
                  </div>
                  {/* Color preview with logo */}
                  {logoPreview && (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center border border-gray-200 shadow-sm"
                      style={{ backgroundColor: logoBackgroundColor }}
                    >
                      <img src={logoPreview} alt="Logo" className="w-8 h-8 object-contain" />
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isFr ? 'Enregistrement...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isFr ? 'Enregistrer' : 'Save'}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

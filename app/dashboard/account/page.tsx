'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield, Lock, Mail, Calendar, AlertTriangle,
  Eye, EyeOff, Check, X, Loader2, Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n/config';

type TabId = 'info' | 'security';

const TABS: { id: TabId; icon: React.ReactNode; labelFr: string; labelEn: string }[] = [
  { id: 'info', icon: <Lock className="w-4 h-4" />, labelFr: 'Informations', labelEn: 'Information' },
  { id: 'security', icon: <Shield className="w-4 h-4" />, labelFr: 'Sécurité', labelEn: 'Security' },
];

export default function AccountPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isFr = i18n.language === 'fr';

  const [user, setUser] = useState<any>(null);
  const [merchant, setMerchant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      }
    };

    checkAuth();
  }, [router]);

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;

  const strengthCount = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = strengthCount <= 1
    ? (isFr ? 'Faible' : 'Weak')
    : strengthCount <= 3
      ? (isFr ? 'Moyen' : 'Medium')
      : (isFr ? 'Fort' : 'Strong');
  const strengthColor = strengthCount <= 1 ? 'bg-red-500' : strengthCount <= 3 ? 'bg-amber-500' : 'bg-green-500';
  const strengthTextColor = strengthCount <= 1 ? 'text-red-600' : strengthCount <= 3 ? 'text-amber-600' : 'text-green-600';

  const handleChangePassword = async () => {
    if (!passwordsMatch || strengthCount < 4) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setMessage({
        type: 'success',
        text: isFr ? 'Mot de passe mis à jour avec succès !' : 'Password updated successfully!'
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || (isFr ? 'Erreur lors de la mise à jour du mot de passe' : 'Failed to update password')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const expectedText = isFr ? 'SUPPRIMER' : 'DELETE';
    if (deleteConfirmText !== expectedText) return;

    setDeleting(true);

    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || (isFr ? 'Erreur lors de la suppression du compte' : 'Failed to delete account')
      });
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!user || !merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">{isFr ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:bg-pink-50/30 transition-all duration-200';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout merchant={merchant}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {isFr ? 'Compte' : 'Account'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isFr ? 'Gérez votre compte et vos paramètres de sécurité' : 'Manage your account and security settings'}
          </p>
        </div>

        {/* Success/Error message */}
        {message && (
          <div
            className={`flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              message.type === 'success'
                ? 'bg-pink-50 border border-pink-200 text-violet-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
            ) : (
              <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
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
                  ? 'text-pink-600'
                  : 'text-gray-500 hover:text-violet-700 hover:bg-pink-50/50'
                }
              `}
            >
              {tab.icon}
              <span>{isFr ? tab.labelFr : tab.labelEn}</span>
              {/* Active underline */}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#EB1E99] to-[#7209B7] transition-transform duration-300 origin-left ${
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
              {/* Email Section */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Adresse email' : 'Email address'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Votre adresse email de connexion' : 'Your login email address'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isFr ? 'Adresse email' : 'Email address'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={user.email || ''}
                      disabled
                      className={`${inputClass} pl-10 opacity-60 cursor-not-allowed`}
                    />
                  </div>
                </div>
              </Card>

              {/* Change Password Section */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Changer le mot de passe' : 'Change password'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Mettez à jour votre mot de passe de connexion' : 'Update your login password'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isFr ? 'Nouveau mot de passe' : 'New password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder={isFr ? 'Entrez votre nouveau mot de passe' : 'Enter your new password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <div className="space-y-3">
                      {/* Strength Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${strengthColor} transition-all duration-300 rounded-full`}
                            style={{ width: `${(strengthCount / 4) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${strengthTextColor}`}>
                          {strengthLabel}
                        </span>
                      </div>

                      {/* Criteria */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {[
                          { met: hasMinLength, label: isFr ? 'Min. 8 caractères' : 'Min. 8 characters' },
                          { met: hasUppercase, label: isFr ? 'Au moins 1 majuscule' : 'At least 1 uppercase letter' },
                          { met: hasNumber, label: isFr ? 'Au moins 1 chiffre' : 'At least 1 number' },
                          { met: hasSpecial, label: isFr ? 'Au moins 1 caractère spécial' : 'At least 1 special character' },
                        ].map((criterion, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {criterion.met ? (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className={criterion.met ? 'text-green-700' : 'text-gray-500'}>
                              {criterion.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isFr ? 'Confirmer le mot de passe' : 'Confirm password'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder={isFr ? 'Confirmez votre mot de passe' : 'Confirm your password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {isFr ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'}
                      </p>
                    )}
                    {passwordsMatch && (
                      <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {isFr ? 'Les mots de passe correspondent' : 'Passwords match'}
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={saving || !passwordsMatch || strengthCount < 4}
                      className="bg-pink-600 hover:bg-violet-700 text-white px-6 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {isFr ? 'Enregistrement...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {isFr ? 'Mettre à jour le mot de passe' : 'Update password'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ===== SECURITY TAB ===== */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Security Info Card */}
              <Card className="group relative p-6 border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#EB1E99] to-[#7209B7] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {isFr ? 'Informations de sécurité' : 'Security information'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isFr ? 'Détails de votre compte' : 'Your account details'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">
                        {isFr ? 'Dernière connexion' : 'Last sign-in'}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(user.last_sign_in_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">
                        {isFr ? 'Compte créé le' : 'Account created'}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Danger Zone Card */}
              <Card className="group relative p-6 border border-red-200 bg-red-50/50 rounded-xl overflow-hidden transition-all duration-300 hover:border-red-300 hover:shadow-md">
                <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-red-700">
                      {isFr ? 'Zone de danger' : 'Danger zone'}
                    </h3>
                    <p className="text-xs text-red-500">
                      {isFr ? 'Les actions ci-dessous sont irréversibles.' : 'The actions below are irreversible.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white/60 rounded-lg border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      {isFr ? 'Supprimer mon compte' : 'Delete my account'}
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">
                      {isFr
                        ? 'Toutes vos données seront définitivement supprimées.'
                        : 'All your data will be permanently deleted.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 shrink-0"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isFr ? 'Supprimer mon compte' : 'Delete my account'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isFr ? 'Supprimer votre compte ?' : 'Delete your account?'}
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {isFr
                ? 'Cette action est irréversible. Toutes vos données, y compris vos campagnes, clients et paramètres, seront définitivement supprimées.'
                : 'This action is irreversible. All your data, including campaigns, customers, and settings, will be permanently deleted.'}
            </p>

            <p className="text-sm font-medium text-gray-700 mb-2">
              {isFr
                ? <>Tapez <span className="font-bold text-red-600">SUPPRIMER</span> pour confirmer :</>
                : <>Type <span className="font-bold text-red-600">DELETE</span> to confirm:</>}
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className={`${inputClass} mb-4`}
              placeholder={isFr ? 'SUPPRIMER' : 'DELETE'}
              autoFocus
            />

            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                variant="outline"
                className="px-4"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== (isFr ? 'SUPPRIMER' : 'DELETE')}
                className="bg-red-600 hover:bg-red-700 text-white px-5 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isFr ? 'Suppression...' : 'Deleting...'}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isFr ? 'Supprimer définitivement' : 'Delete permanently'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

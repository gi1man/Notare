import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../db';
import { STARTER_CATEGORIES } from '../../db/starterData';
import { generateDummyData } from '../../db/dummyDataGenerator';
import { exportDataCSV, exportDataJSON } from '../../db/exportData';
import { FontScaleOption, ThemeMode } from '../../types';
import { CategoryManagerModal } from '../categories/CategoryManagerModal';
import { importMigrationBackup } from '../../db/cloudBackup';
import { Upload, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  registerWithEmailPassword,
  signInWithEmailPassword,
  changeUserPassword,
  resetPasswordByEmail,
  getCurrentUser,
  signOutUser,
  reconcileSync,
} from '../../db/firestoreSync';
import {
  Settings,
  Eye,
  EyeOff,
  Type,
  Sun,
  Moon,
  Globe,
  Trash2,
  Share,
  ShieldAlert,
  Folder,
  RotateCcw,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileCode,
  UserCheck,
  KeyRound,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, setActiveTab } = useApp();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Email & Custom Password Sync State
  const [syncEmail, setSyncEmail] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [showSyncPassword, setShowSyncPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isForceSyncing, setIsForceSyncing] = useState(false);

  const handleForceSync = async () => {
    const user = getCurrentUser();
    if (!user) {
      setRestoreStatus({ type: 'error', message: 'You must be signed in to force sync.' });
      return;
    }
    setIsForceSyncing(true);
    setRestoreStatus({ type: null, message: '' });
    try {
      await reconcileSync(user.uid, true);
      setRestoreStatus({ type: 'success', message: 'Force full sync completed successfully.' });
    } catch (err: any) {
      setRestoreStatus({ type: 'error', message: err.message || 'Force sync failed.' });
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncEmail.trim() || !syncPassword || isAuthSubmitting) return;
    setIsAuthSubmitting(true);
    setAuthStatus({ type: null, message: '' });

    try {
      await registerWithEmailPassword(syncEmail.trim(), syncPassword);
      setAuthStatus({
        type: 'success',
        message: 'Cloud Sync account created! All local goals and logs are backed up to your account.',
      });
      setSyncPassword('');
    } catch (err: any) {
      setAuthStatus({
        type: 'error',
        message: err.message || 'Failed to create account. Password must be at least 6 characters.',
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignInAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncEmail.trim() || !syncPassword || isAuthSubmitting) return;
    setIsAuthSubmitting(true);
    setAuthStatus({ type: null, message: '' });

    try {
      await signInWithEmailPassword(syncEmail.trim(), syncPassword);
      setAuthStatus({
        type: 'success',
        message: 'Device linked successfully! Synced goals and activity history to this phone.',
      });
      setSyncPassword('');
    } catch (err: any) {
      setAuthStatus({
        type: 'error',
        message: err.message || 'Failed to sign in. Please verify your email and password.',
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || isAuthSubmitting) return;
    setIsAuthSubmitting(true);
    setAuthStatus({ type: null, message: '' });

    try {
      await changeUserPassword(newPasswordInput);
      setAuthStatus({
        type: 'success',
        message: 'Account password updated successfully!',
      });
      setNewPasswordInput('');
    } catch (err: any) {
      setAuthStatus({
        type: 'error',
        message: err.message || 'Failed to change password. Please ensure you are signed in.',
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleClearLocalData = async () => {
    await db.entries.clear();
    await db.categories.clear();
    await db.goals.clear();
    await db.meta.clear();

    // Write a fresh default settings record directly (don't spread old settings)
    await db.meta.put({
      key: 'settings',
      value: {
        onboarding_completed: false,
        telemetry_opt_in: false,
        theme: 'light',
        font_scale: 'normal',
        high_a11y_profile: false,
        undo_duration_ms: 5000,
        voice_language: 'en-US',
        mic_help_dismissed_count: 0,
        mic_help_do_not_show: false,
        ios_a2hs_dismissed: false,
        is_demo_mode: false,
      },
    });

    setShowClearConfirm(false);
    setActiveTab('entry');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-sky-600 dark:text-sky-400" />
          Settings & Preferences
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Customize display, accessibility, and cloud sync options
        </p>
      </div>

      {/* 🔐 Account Card — adapts to auth state */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-slate-900 dark:text-white font-extrabold text-lg">
            <UserCheck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            Account
          </h3>
          {getCurrentUser() && !getCurrentUser()?.isAnonymous ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Signed In ✓
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              Not Signed In
            </span>
          )}
        </div>

        {authStatus.message && (
          <div
            className={`p-3 rounded-xl text-xs font-bold ${
              authStatus.type === 'success'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            {authStatus.message}
          </div>
        )}

        {getCurrentUser() && !getCurrentUser()?.isAnonymous ? (
          /* ── Signed In View ── */
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {getCurrentUser()?.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your data syncs automatically across all devices signed into this account.
            </p>

            {/* Change Password */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-500" /> Change Password
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full p-3 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isAuthSubmitting || !newPasswordInput}
                  className="py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 tap-target"
                >
                  Update
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    const email = getCurrentUser()?.email;
                    if (!email) return;
                    try {
                      await resetPasswordByEmail(email);
                      setAuthStatus({ type: 'success', message: `Password reset email sent to ${email}.` });
                    } catch (err: any) {
                      setAuthStatus({ type: 'error', message: err.message || 'Failed to send reset email.' });
                    }
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0F4C45] dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
                >
                  Forgot Password?
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Sign out of your account on this device?')) {
                      try {
                        await signOutUser();
                        setAuthStatus({ type: 'success', message: 'Signed out. Your data is still saved locally.' });
                      } catch (err: any) {
                        setAuthStatus({ type: 'error', message: err.message || 'Failed to sign out.' });
                      }
                    }
                  }}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Not Signed In View ── */
          <form className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create an account to sync your data across devices, or sign in to restore your data on a new phone.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                placeholder="e.g. name@example.com"
                value={syncEmail}
                onChange={(e) => setSyncEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showSyncPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  className="w-full p-3 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSyncPassword(!showSyncPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showSyncPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleRegisterAccount}
                disabled={isAuthSubmitting || !syncEmail || !syncPassword}
                className="py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 tap-target"
              >
                Create Account
              </button>

              <button
                type="button"
                onClick={handleSignInAccount}
                disabled={isAuthSubmitting || !syncEmail || !syncPassword}
                className="py-3 px-4 bg-[#0F4C45] hover:bg-[#135c54] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 tap-target"
              >
                Sign In
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!syncEmail.trim()) {
                  setAuthStatus({ type: 'error', message: 'Enter your email above, then tap Forgot Password.' });
                  return;
                }
                try {
                  await resetPasswordByEmail(syncEmail.trim());
                  setAuthStatus({ type: 'success', message: `Password reset email sent to ${syncEmail.trim()}.` });
                } catch (err: any) {
                  setAuthStatus({ type: 'error', message: err.message || 'Failed to send reset email.' });
                }
              }}
              className="text-xs font-semibold text-slate-500 hover:text-[#0F4C45] dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
            >
              Forgot Password?
            </button>
          </form>
        )}
      </div>

      {/* iOS Installation Prompt Card */}
      <div className="p-5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 space-y-3">
        <div className="flex items-center gap-3 text-sky-800 dark:text-sky-300 font-bold text-base">
          <Share className="w-6 h-6" /> Install Notare on iPhone / iPad
        </div>
        <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
          For fast 1-tap access on your home screen: Tap the <strong>Share</strong> button in Safari below, then select <strong>'Add to Home Screen'</strong>.
        </p>
      </div>

      {/* Accessibility & Visual Controls */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-sky-600" /> Display & Accessibility
        </h3>

        {/* Anonymous Community Telemetry Opt-In Toggle */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Contribute Anonymous Community Stats
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Allow un-linkable numerical category totals (e.g. +1 walk) to contribute to aggregate community benchmarks. Zero notes, names, or user IDs are stored.
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 tap-target">
            <input
              type="checkbox"
              checked={settings.telemetry_opt_in}
              onChange={(e) => updateSettings({ telemetry_opt_in: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* High Accessibility Preset Toggle */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-base text-slate-900 dark:text-white">
              High Accessibility Profile
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enables 10-second undo windows, extra-large fonts, high-contrast borders, and maximum tap targets.
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 tap-target">
            <input
              type="checkbox"
              checked={settings.high_a11y_profile}
              onChange={(e) => updateSettings({ high_a11y_profile: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>

        {/* Font Scale Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Type className="w-4 h-4" /> Font Size Override
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['auto', 'normal', 'large', 'extra-large'] as FontScaleOption[]).map((option) => (
              <button
                key={option}
                onClick={() => updateSettings({ font_scale: option })}
                className={`py-3 px-2 rounded-xl text-xs font-bold capitalize transition-all tap-target ${
                  settings.font_scale === option
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {option.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Mode Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
            Color Theme (Light mode default)
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSettings({ theme: mode })}
                className={`py-3 px-3 rounded-xl text-xs font-bold capitalize transition-all tap-target flex items-center justify-center gap-1.5 ${
                  settings.theme === mode
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {mode === 'light' && <Sun className="w-4 h-4" />}
                {mode === 'dark' && <Moon className="w-4 h-4" />}
                {mode} Mode
              </button>
            ))}
          </div>
        </div>

        {/* Voice Note Language Dropdown */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Voice Dictation Language
          </label>
          <select
            value={settings.voice_language || 'en-US'}
            onChange={(e) => updateSettings({ voice_language: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-AU">English (Australia)</option>
            <option value="es-ES">Spanish (Español)</option>
            <option value="fr-FR">French (Français)</option>
            <option value="de-DE">German (Deutsch)</option>
          </select>
        </div>
      </div>

      {/* Category & Item Management Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Folder className="w-5 h-5 text-sky-600 dark:text-sky-400" /> Category & Item Management
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Delete categories, move items between categories, or pin your favorites.
        </p>

        <button
          onClick={() => setShowCatManager(true)}
          className="w-full py-3.5 px-4 bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/60 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 font-bold rounded-xl text-sm transition-all tap-target flex items-center justify-center gap-2"
        >
          <Folder className="w-4 h-4" /> Manage Categories & Items
        </button>
      </div>

      {/* Backup & Export Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-sky-600 dark:text-sky-400" /> Backup & Export
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your data syncs automatically to the cloud when you have an account. You can also download manual backups.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => exportDataCSV()}
            className="flex-1 py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all tap-target flex items-center justify-center gap-2 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download CSV
          </button>

          <button
            onClick={() => exportDataJSON()}
            className="flex-1 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-md transition-all tap-target flex items-center justify-center gap-2 text-sm"
          >
            <FileCode className="w-4 h-4" /> Download JSON
          </button>
        </div>

        {/* Collapsible Restore Section */}
        <div className="flex gap-2 w-full mt-2">
          <button
            onClick={() => setShowRestore(!showRestore)}
            className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center gap-1 transition-colors"
          >
            Restore from backup
            {showRestore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleForceSync}
            disabled={isForceSyncing}
            className="flex-1 py-2 text-xs font-semibold text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isForceSyncing ? 'animate-spin' : ''}`} />
            {isForceSyncing ? 'Syncing...' : 'Force Full Sync'}
          </button>
        </div>

        {showRestore && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a previously exported <code>.json</code> backup file to restore your data. This will replace all local data.
            </p>

            {restoreStatus.type && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                restoreStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
              }`}>
                {restoreStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {restoreStatus.message}
              </div>
            )}

            <label className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer tap-target">
              <Upload className="w-4 h-4" /> Select Backup File
              <input
                type="file"
                accept=".json,application/json,text/plain,*/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    const jsonString = event.target?.result as string;
                    if (!jsonString) return;
                    if (confirm('Restoring a backup will replace all local data. Continue?')) {
                      const result = await importMigrationBackup(jsonString);
                      if (result.success) {
                        await updateSettings({ onboarding_completed: true, is_demo_mode: false });
                        setRestoreStatus({ type: 'success', message: `Restored ${result.count.entries} entries, ${result.count.categories} categories, ${result.count.goals} goals.` });
                        setTimeout(() => window.location.reload(), 1200);
                      } else {
                        setRestoreStatus({ type: 'error', message: result.message });
                      }
                    }
                  };
                  reader.readAsText(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Category Manager Modal */}
      {showCatManager && (
        <CategoryManagerModal onClose={() => setShowCatManager(false)} />
      )}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-5 h-5" /> Data & Device Actions
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={async () => {
              await generateDummyData();
              await updateSettings({ is_demo_mode: true });
              alert('Loaded 14 days of sample entries and goals! Check your Dashboard and History.');
            }}
            className="py-3 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold rounded-xl text-sm transition-all tap-target flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" /> Generate 14 Days Demo Data
          </button>

          <button
            onClick={async () => {
              for (const cat of STARTER_CATEGORIES) {
                await db.categories.put({ ...cat, deleted_at: null });
              }
              alert('Default categories (Creativity, Business & Work, Fitness, etc.) reloaded!');
            }}
            className="py-3 px-4 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-bold rounded-xl text-sm transition-all tap-target flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reload Default Categories
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="py-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold rounded-xl text-sm transition-all tap-target flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Clear Local Device Data
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Data Wipe */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400">
              Clear Local Data?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This will reset all local entries and categories on this device to starter defaults.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLocalData}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
              >
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

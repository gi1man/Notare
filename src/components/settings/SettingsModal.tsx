import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../db';
import { STARTER_CATEGORIES } from '../../db/starterData';
import { generateDummyData } from '../../db/dummyDataGenerator';
import { exportDataCSV, exportDataJSON } from '../../db/exportData';
import { FontScaleOption, ThemeMode } from '../../types';
import { CategoryManagerModal } from '../categories/CategoryManagerModal';
import { DeviceMigrationModal } from './DeviceMigrationModal';
import { registerWithEmailPassword, signInWithEmailPassword } from '../../db/firestoreSync';
import {
  Settings,
  Eye,
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
  Cloud,
  Download,
  FileSpreadsheet,
  FileCode,
  UserCheck,
  Smartphone,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, setActiveTab } = useApp();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Email & Custom Password Sync State
  const [syncEmail, setSyncEmail] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [authStatus, setAuthStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

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

  const handleClearLocalData = async () => {
    await db.entries.clear();
    await db.categories.clear();
    await db.goals.clear();
    await db.meta.clear();

    await db.initializeDefaults();
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

      {/* 🔐 Cloud Sync & Multi-Device Password Link Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-extrabold text-lg">
            <Cloud className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Multi-Device Sync & Account Backup</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Active ✓
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Create an account or sign in with a custom password (letters, numbers, and special characters supported) to sync your goals and logs between 2 or more phones.
        </p>

        <form className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Email / Username
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
              Custom Password (Letters, Numbers, Special Chars)
            </label>
            <input
              type="password"
              placeholder="e.g. MyPass#2026!"
              value={syncPassword}
              onChange={(e) => setSyncPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
            />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleRegisterAccount}
              disabled={isAuthSubmitting || !syncEmail || !syncPassword}
              className="py-3 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 tap-target"
            >
              <UserCheck className="w-4 h-4" />
              Create Sync Account
            </button>

            <button
              type="button"
              onClick={handleSignInAccount}
              disabled={isAuthSubmitting || !syncEmail || !syncPassword}
              className="py-3 px-4 bg-[#0F4C45] hover:bg-[#135c54] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 tap-target"
            >
              <Smartphone className="w-4 h-4 text-[#8FA99B]" />
              Link 2nd Device / Sign In
            </button>
          </div>
        </form>
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

      {/* Cloud Backup & Device Migration Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400" /> Cloud Backup & Device Migration
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Back up your mobile data to cloud/local storage or migrate habits to a new phone.
        </p>

        <button
          onClick={() => setShowMigrationModal(true)}
          className="w-full py-3.5 px-4 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl text-sm transition-all tap-target flex items-center justify-center gap-2"
        >
          <Cloud className="w-4 h-4" /> Cloud Backup & Restore Backup File
        </button>
      </div>

      {/* Export Your Data Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-sky-600 dark:text-sky-400" /> Export Your Data
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Download 100% of your activity logs anytime in CSV format for spreadsheets or raw JSON format for analysis.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => exportDataCSV()}
            className="flex-1 py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all tap-target flex items-center justify-center gap-2 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download CSV File
          </button>

          <button
            onClick={() => exportDataJSON()}
            className="flex-1 py-3.5 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-md transition-all tap-target flex items-center justify-center gap-2 text-sm"
          >
            <FileCode className="w-4 h-4" /> Download JSON File
          </button>
        </div>
      </div>

      {/* Device Migration Modal */}
      {showMigrationModal && (
        <DeviceMigrationModal onClose={() => setShowMigrationModal(false)} />
      )}

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

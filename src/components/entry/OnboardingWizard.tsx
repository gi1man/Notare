import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateDummyData } from '../../db/dummyDataGenerator';
import { UnifiedGoalWizardModal } from '../goals/UnifiedGoalWizardModal';
import {
  registerWithEmailPassword,
  signInWithEmailPassword,
  getCurrentUser,
  pushAllLocalDataToCloud,
  resetPasswordByEmail,
} from '../../db/firestoreSync';
import {
  Target,
  Sparkles,
  FolderPlus,
  UserCheck,
  LogIn,
  Eye,
  EyeOff,
} from 'lucide-react';

export const OnboardingWizard: React.FC = () => {
  const { updateSettings, setActiveTab, resetToCategoryPicker } = useApp();

  // Wizard state: 'auth' | 'experience_choice' | 'add_goals'
  const [wizardStep, setWizardStep] = useState<
    'auth' | 'experience_choice' | 'add_goals'
  >('auth');

  // Auth Tab: 'create' or 'login'
  const [authTab, setAuthTab] = useState<'create' | 'login'>('create');

  // Auth Inputs
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [telemetryOptIn, setTelemetryOptIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user && !user.isAnonymous && wizardStep === 'auth') {
      setWizardStep('experience_choice');
    }
  }, [wizardStep]);

  // Step 1: Submit Account Creation or Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmail.trim() || !accountPassword || isSubmitting) return;
    setIsSubmitting(true);
    setAuthError('');

    try {
      await updateSettings({ telemetry_opt_in: telemetryOptIn });

      if (authTab === 'create') {
        await registerWithEmailPassword(accountEmail.trim(), accountPassword);
        setWizardStep('experience_choice');
      } else {
        await signInWithEmailPassword(accountEmail.trim(), accountPassword);
        await updateSettings({ onboarding_completed: true, is_demo_mode: false });
        setActiveTab('dashboard');
        resetToCategoryPicker();
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Option A: Choose Demo Mode
  const handleChooseDemoMode = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await generateDummyData();
      await updateSettings({ is_demo_mode: true, onboarding_completed: true });

      const user = getCurrentUser();
      if (user) {
        await pushAllLocalDataToCloud(user.uid);
      }

      setActiveTab('dashboard');
      resetToCategoryPicker();
    } catch (err) {
      console.error('Failed to initialize demo mode:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#F5F1E8] dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-6 my-auto">
        {/* ============================================================ */}
        {/* STEP 1: AUTHENTICATION (SIGN UP OR SIGN IN)                   */}
        {/* ============================================================ */}
        {wizardStep === 'auth' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-[#0F4C45] text-white dark:bg-sky-600 dark:text-white shadow-md">
                <Target className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-serif-logo font-extrabold text-[#0F4C45] dark:text-white">
                Welcome to Notare
              </h2>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Your private, resilient activity & habit tracker. Create an account to sync seamlessly across all your devices.
              </p>
            </div>

            {/* Tab Switcher: Create Account vs Sign In */}
            <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('create');
                  setAuthError('');
                }}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                  authTab === 'create'
                    ? 'bg-[#0F4C45] text-white dark:bg-sky-600 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Create Account
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                  authTab === 'login'
                    ? 'bg-[#0F4C45] text-white dark:bg-sky-600 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="p-3.5 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold leading-relaxed">
                  ⚠️ {authError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full p-3.5 pr-12 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Opt-In Telemetry Checkbox */}
              {authTab === 'create' && (
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telemetryOptIn}
                      onChange={(e) => setTelemetryOptIn(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0F4C45] focus:ring-[#0F4C45]"
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        Contribute Anonymous Community Stats (Optional)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        Helps generate AI community benchmarks. Zero personal details or notes are ever stored or shared.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !accountEmail.trim() || !accountPassword}
                className="w-full py-4 px-6 bg-[#0F4C45] hover:bg-[#135c54] disabled:opacity-40 text-white font-extrabold rounded-2xl text-base shadow-lg transition-all tap-target flex items-center justify-center gap-2"
              >
                {authTab === 'create' ? 'Create Account & Continue →' : 'Sign In & Continue →'}
              </button>

              {authTab === 'login' && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!accountEmail.trim()) {
                      setAuthError('Enter your email address above, then tap Forgot Password.');
                      return;
                    }
                    try {
                      await resetPasswordByEmail(accountEmail.trim());
                      setAuthError('');
                      alert(`Password reset email sent to ${accountEmail.trim()}. Check your inbox.`);
                    } catch (err: any) {
                      setAuthError(err.message || 'Failed to send reset email.');
                    }
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0F4C45] dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: EXPERIENCE CHOICE (SAMPLE DATA vs CUSTOM GOALS)       */}
        {/* ============================================================ */}
        {wizardStep === 'experience_choice' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-[#0F4C45] text-white dark:bg-sky-600 shadow-md">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-serif-logo font-bold text-[#0F4C45] dark:text-white">
                How would you like to start?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Explore Notare with pre-loaded sample data or build your own custom habit targets right away.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Sample Demo Mode */}
              <button
                type="button"
                onClick={handleChooseDemoMode}
                disabled={isSubmitting}
                className="group flex flex-col items-center justify-between p-6 rounded-3xl bg-white border border-slate-300 hover:border-[#0F4C45] dark:bg-slate-900 dark:border-slate-700 dark:hover:border-sky-500 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 tap-target text-center space-y-4"
              >
                <div className="p-3.5 rounded-2xl bg-[#8FA99B] text-[#0F4C45] dark:bg-slate-800 dark:text-sky-400 group-hover:scale-105 transition-transform shadow-sm">
                  <FolderPlus className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xl text-slate-900 dark:text-white">
                    Load Sample Data
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Instantly view pre-populated categories, goals, and tracking entries.
                  </div>
                </div>
              </button>

              {/* Option 2: Create Custom Goals */}
              <button
                type="button"
                onClick={() => setWizardStep('add_goals')}
                disabled={isSubmitting}
                className="group flex flex-col items-center justify-between p-6 rounded-3xl bg-[#0F4C45] text-[#F5F1E8] hover:bg-[#135c54] dark:bg-sky-600 dark:text-white transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 tap-target text-center space-y-4"
              >
                <div className="p-3.5 rounded-2xl bg-[#8FA99B] text-[#0F4C45] dark:bg-slate-800 dark:text-white group-hover:scale-105 transition-transform shadow-sm">
                  <Target className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xl">Create Custom Goals</div>
                  <div className="text-xs font-semibold opacity-90 leading-relaxed">
                    Set up your custom categories, activity goals, and targets right now.
                  </div>
                </div>
              </button>
            </div>

            {/* Switch Account Option */}
            <div className="pt-2 border-t border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWizardStep('auth')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Switch Account / Sign In with Another User →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: UNIFIED GOAL CREATION WIZARD                          */}
        {/* ============================================================ */}
        {wizardStep === 'add_goals' && (
          <UnifiedGoalWizardModal
            onClose={() => {
              updateSettings({ onboarding_completed: true, is_demo_mode: false });
              setActiveTab('entry');
              resetToCategoryPicker();
            }}
          />
        )}
      </div>
    </div>
  );
};

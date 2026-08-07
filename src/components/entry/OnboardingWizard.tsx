import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../db';
import { Goal, Category, GoalFrequency } from '../../types';
import { generateDummyData } from '../../db/dummyDataGenerator';
import {
  syncCategoryToCloud,
  syncGoalToCloud,
  registerWithEmailPassword,
  signInWithEmailPassword,
  getCurrentUser,
  pushAllLocalDataToCloud,
} from '../../db/firestoreSync';
import { IconRenderer } from '../common/IconRenderer';
import {
  Target,
  Check,
  Sparkles,
  FolderPlus,
  ArrowLeft,
  Plus,
  Home,
  UserCheck,
  LogIn,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CategoryTemplate {
  id: string;
  name: string;
  icon: string;
  suggestedItems: string[];
}

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: 'cat-fitness',
    name: 'Fitness & Health',
    icon: 'Dumbbell',
    suggestedItems: ['Walking', 'Resistance Training', 'Running', 'Sleep'],
  },
  {
    id: 'cat-nutrition',
    name: 'Nutrition',
    icon: 'Apple',
    suggestedItems: ['Water Intake', 'Balanced Meals', 'Snacks'],
  },
  {
    id: 'cat-learning',
    name: 'Mind & Learning',
    icon: 'Brain',
    suggestedItems: ['Book Reading', 'Crosswords', 'Meditation'],
  },
  {
    id: 'cat-home',
    name: 'Home & Hobbies',
    icon: 'Home',
    suggestedItems: ['Gardening', 'DIY Repairs', 'Crafts'],
  },
  {
    id: 'cat-business',
    name: 'Business & Work',
    icon: 'Briefcase',
    suggestedItems: ['Deep Work', 'Meetings', 'Study'],
  },
];

export const OnboardingWizard: React.FC = () => {
  const { updateSettings, setActiveTab, resetToCategoryPicker } = useApp();

  // Wizard Step Flow: 'auth' -> 'experience_choice' -> 'add_goals'
  const [wizardStep, setWizardStep] = useState<'auth' | 'experience_choice' | 'add_goals'>(() => {
    const user = getCurrentUser();
    return user && !user.isAnonymous ? 'experience_choice' : 'auth';
  });
  const [authTab, setAuthTab] = useState<'create' | 'login'>('create');

  const [showAddAnotherPrompt, setShowAddAnotherPrompt] = useState<boolean>(false);

  // Auth Inputs
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Category Selection State
  const [selectedTemplate, setSelectedTemplate] = useState<CategoryTemplate | null>(null);
  const [customCatName, setCustomCatName] = useState<string>('');
  const [catIcon] = useState<string>('Folder');

  // Subcategory Item State
  const [itemName, setItemName] = useState<string>('');

  // Goal State
  const [targetVal, setTargetVal] = useState<number>(30);
  const [targetUnit, setTargetUnit] = useState<string>('mins');
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');

  // Step 1: Submit Account Creation or Login
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmail.trim() || !accountPassword || isSubmitting) return;
    setIsSubmitting(true);
    setAuthError('');

    try {
      if (authTab === 'create') {
        // Create new account in Firebase
        await registerWithEmailPassword(accountEmail.trim(), accountPassword);
        // Move to Screen 2 (Experience Choice)
        setWizardStep('experience_choice');
      } else {
        // Sign in existing user in Firebase
        await signInWithEmailPassword(accountEmail.trim(), accountPassword);
        const existingEntries = await db.entries.count();
        if (existingEntries > 0) {
          // Existing user already has data, finish onboarding and go straight home
          await updateSettings({ onboarding_completed: true, is_demo_mode: false });
          setActiveTab('entry');
          resetToCategoryPicker();
        } else {
          // New/Empty existing user account, move to Screen 2 (Experience Choice)
          setWizardStep('experience_choice');
        }
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

  // Step 3: Save Custom Category & Goal
  const handleCreateCategoryAndGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCatName = selectedTemplate ? selectedTemplate.name : customCatName.trim();
    const finalItemName = itemName.trim();

    if (!finalCatName || !finalItemName || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Create Top-Level Category
      const parentCatId = selectedTemplate ? selectedTemplate.id : `cat-${Date.now()}`;
      let parentCat = await db.categories.get(parentCatId);
      if (!parentCat) {
        parentCat = {
          id: parentCatId,
          parent_id: null,
          name: finalCatName,
          icon: catIcon || 'Folder',
          pinned: true,
          sort_order: 1,
          updated_at: new Date().toISOString(),
        };
        await db.categories.put(parentCat);
        await syncCategoryToCloud(parentCat);
      }

      // 2. Create Subcategory Activity Item
      const subId = `sub-${Date.now()}`;
      const newSub: Category = {
        id: subId,
        parent_id: parentCatId,
        name: finalItemName,
        icon: 'Activity',
        value_schema: { type: 'duration', unit: targetUnit || 'mins' },
        sort_order: 1,
        updated_at: new Date().toISOString(),
      };
      await db.categories.put(newSub);
      await syncCategoryToCloud(newSub);

      // 3. Create Goal
      const newGoal: Goal = {
        id: `goal-${Date.now()}`,
        subcategory_id: subId,
        frequency,
        direction: 'at_least',
        target_type: targetUnit === 'glasses' ? 'count' : 'time',
        target_value: Number(targetVal) || 1,
        updated_at: new Date().toISOString(),
      };
      await db.goals.put(newGoal);
      await syncGoalToCloud(newGoal);

      setShowAddAnotherPrompt(true);
    } catch (err) {
      console.error('Failed to create category and goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnotherGoal = () => {
    setSelectedTemplate(null);
    setCustomCatName('');
    setItemName('');
    setTargetVal(30);
    setTargetUnit('mins');
    setFrequency('daily');
    setShowAddAnotherPrompt(false);
  };

  const handleFinishAndGoHome = async () => {
    await updateSettings({ onboarding_completed: true, is_demo_mode: false });
    setActiveTab('entry');
    resetToCategoryPicker();
  };

  const handleSelectTemplate = (template: CategoryTemplate) => {
    setSelectedTemplate(template);
    setCustomCatName('');
    if (!itemName && template.suggestedItems.length > 0) {
      setItemName(template.suggestedItems[0]);
    }
  };

  const effectiveCatName = selectedTemplate ? selectedTemplate.name : customCatName.trim();
  const canSubmitGoal = Boolean(effectiveCatName && itemName.trim());

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#F5F1E8] dark:bg-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-6 my-auto">
        {/* ============================================================ */}
        {/* PROMPT: ADD ANOTHER GOAL OR GO TO HOME SCREEN                */}
        {/* ============================================================ */}
        {showAddAnotherPrompt ? (
          <div className="space-y-6 text-center py-2">
            <div className="inline-flex p-4 bg-[#8FA99B] text-[#0F4C45] dark:bg-sky-600 dark:text-white rounded-3xl shadow-md animate-bounce">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
                Goal Saved! 🎯
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed max-w-md mx-auto">
                Do you want to add another activity goal?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={handleAddAnotherGoal}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-[#0F4C45] hover:bg-[#135c54] text-white font-extrabold rounded-2xl text-base shadow-md transition-all tap-target"
              >
                <Plus className="w-5 h-5" />
                Add Another Goal
              </button>

              <button
                type="button"
                onClick={handleFinishAndGoHome}
                className="flex items-center justify-center gap-2 py-4 px-6 bg-[#8FA99B] text-[#0F4C45] hover:bg-[#7d998b] dark:bg-slate-700 dark:text-white font-bold rounded-2xl text-base shadow-md transition-all tap-target"
              >
                <Home className="w-5 h-5" />
                Not Now, Go Home
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* STEP 1: INITIAL STARTUP ACCOUNT SETUP SCREEN                 */}
            {/* ============================================================ */}
            {wizardStep === 'auth' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2 text-center">
                  <div className="inline-flex p-3.5 bg-[#0F4C45] text-[#F5F1E8] dark:bg-sky-600 dark:text-white rounded-2xl shadow-md">
                    <FolderPlus className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <h2 className="text-3xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
                    Welcome to Notare 🌿
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                    Create an account or sign in to get started.
                  </p>
                </div>

                {/* Tab Switcher: Create Account vs Sign In */}
                <div className="flex rounded-2xl bg-white dark:bg-slate-900 p-1 border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('create');
                      setAuthError('');
                    }}
                    className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
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
                    className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
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
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Email / Username
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@example.com"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Password (Letters, Numbers & Special Characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder={authTab === 'create' ? 'Choose a password...' : 'Enter password...'}
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        className="w-full p-3.5 pr-12 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !accountEmail || !accountPassword}
                    className="w-full py-4 px-6 bg-[#0F4C45] hover:bg-[#135c54] disabled:opacity-40 text-white font-extrabold rounded-2xl text-base shadow-lg transition-all tap-target flex items-center justify-center gap-2"
                  >
                    {authTab === 'create' ? 'Create Account & Continue →' : 'Sign In & Continue →'}
                  </button>
                </form>
              </div>
            )}

            {/* ============================================================ */}
            {/* STEP 2: EXPERIENCE CHOICE (Demo Mode vs Create Goals)        */}
            {/* ============================================================ */}
            {wizardStep === 'experience_choice' && (
              <div className="space-y-6 text-center">
                {/* Header */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
                    How would you like to start? 🌿
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                    Account ready! Choose your initial experience below:
                  </p>
                </div>

                {/* 2 Choice Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Option 1: Explore Demo Mode */}
                  <button
                    type="button"
                    onClick={handleChooseDemoMode}
                    disabled={isSubmitting}
                    className="group flex flex-col items-center justify-between p-6 rounded-3xl bg-[#8FA99B] text-[#0F4C45] hover:bg-[#7d998b] dark:bg-slate-700 dark:text-white transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 tap-target text-center space-y-4"
                  >
                    <div className="p-3.5 rounded-2xl bg-[#0F4C45] text-white dark:bg-sky-600 group-hover:scale-105 transition-transform shadow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-extrabold text-xl">Demo Mode</div>
                      <div className="text-xs font-semibold opacity-90 leading-relaxed">
                        Start with pre-loaded sample goals, streaks & graphs to see how Notare works.
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
            {/* STEP 3: CREATE CUSTOM GOALS                                  */}
            {/* ============================================================ */}
            {wizardStep === 'add_goals' && (
              <div className="space-y-6">
                {/* Back Button & Header */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep('experience_choice')}
                    className="p-2 rounded-xl text-[#0F4C45] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Back to Choice"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-2xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
                    Create Your Activity Goal 🎯
                  </h2>
                </div>

                <form onSubmit={handleCreateCategoryAndGoal} className="space-y-5">
                  {/* Step 1: Choose or Name Category */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      1. Choose or Create Category
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CATEGORY_TEMPLATES.map((tmpl) => {
                        const isSelected = selectedTemplate?.id === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => handleSelectTemplate(tmpl)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all tap-target ${
                              isSelected
                                ? 'border-[#0F4C45] bg-[#8FA99B] text-[#0F4C45] dark:border-sky-500 dark:bg-slate-700 dark:text-white font-bold shadow-sm'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-[#0F4C45] text-white dark:bg-sky-900/60 dark:text-sky-300">
                                <IconRenderer name={tmpl.icon} className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-sm">{tmpl.name}</span>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#0F4C45] text-white dark:bg-sky-400 dark:text-slate-900 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Category Input */}
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Or type custom category name (e.g. Gardening, Sailing)..."
                        value={customCatName}
                        onChange={(e) => {
                          setCustomCatName(e.target.value);
                          setSelectedTemplate(null);
                        }}
                        className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
                      />
                    </div>
                  </div>

                  {/* Step 2: Activity Item Name */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Name Your Activity Item
                    </label>

                    {selectedTemplate && selectedTemplate.suggestedItems.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedTemplate.suggestedItems.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setItemName(sug)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              itemName === sug
                                ? 'bg-[#0F4C45] text-white dark:bg-sky-600'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      type="text"
                      required
                      placeholder="e.g. Walking, Green Tea, Book Reading..."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
                    />
                  </div>

                  {/* Step 3: Target Amount & Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        3. Target Amount ({targetUnit})
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={targetVal}
                          onChange={(e) => setTargetVal(Number(e.target.value))}
                          className="w-full p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-lg text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="unit"
                          value={targetUnit}
                          onChange={(e) => setTargetUnit(e.target.value)}
                          className="w-24 p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Frequency
                      </label>
                      <div className="flex rounded-2xl border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-900 p-1">
                        {(['daily', 'weekly', 'monthly'] as GoalFrequency[]).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFrequency(f)}
                            className={`flex-1 py-2 font-bold text-xs capitalize rounded-xl transition-all ${
                              frequency === f
                                ? 'bg-[#0F4C45] text-white dark:bg-sky-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={!canSubmitGoal || isSubmitting}
                      className="w-full py-4 px-6 bg-[#0F4C45] hover:bg-[#135c54] disabled:opacity-40 dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-extrabold rounded-2xl text-lg shadow-lg hover:shadow-xl transition-all tap-target flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5 text-[#8FA99B] dark:text-white" />
                      Save Goal & Start Tracking ✓
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

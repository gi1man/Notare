import React, { useState, useEffect } from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { db } from '../../db';
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  Target,
  LayoutDashboard,
  History,
  FolderPlus,
  Compass,
} from 'lucide-react';

interface TutorialStep {
  id: number;
  tab: ActiveTab;
  title: string;
  description: string;
  highlightText: string;
  icon: React.ReactNode;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    tab: 'entry',
    title: 'Step 1 of 6: Log Activity 🎯',
    description:
      'Tap any category card on screen, then click the button for an activity to log an activity right now — try it!',
    highlightText: 'Tap any category card on screen, then click the button for an activity to log an activity right now — try it!',
    icon: <Target className="w-6 h-6 text-emerald-400" />,
  },
  {
    id: 2,
    tab: 'entry',
    title: 'Step 2 of 6: Create New Category 📂',
    description:
      'Tap the "+ Add Category" button in the top right header to create a new category with your own icon — try it!',
    highlightText: 'Tap the "+ Add Category" button in the top right header to create a new category with your own icon — try it!',
    icon: <FolderPlus className="w-6 h-6 text-amber-400" />,
  },
  {
    id: 3,
    tab: 'entry',
    title: 'Step 3 of 6: Set & Create Goals 🎯',
    description:
      'Tap any category card, then click the "+ Add Goal" button in the top header to set a new activity goal right now — try it!',
    highlightText: 'Tap any category card, then click the "+ Add Goal" button in the top header to set a new activity goal right now — try it!',
    icon: <Compass className="w-6 h-6 text-sky-400" />,
  },
  {
    id: 4,
    tab: 'dashboard',
    title: 'Step 4 of 6: Goal Dashboard 📊',
    description:
      'The Reporting Dashboard displays your active goal streaks, completed daily/weekly/monthly targets, and progress donut charts.',
    highlightText: 'Goal progress rings turn solid green as you complete targets!',
    icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />,
  },
  {
    id: 5,
    tab: 'insights',
    title: 'Step 5 of 6: Smart AI Insights 💡',
    description:
      'Notare automatically analyzes correlations between your activities, like how morning walks boost sleep quality or focus.',
    highlightText: 'Private, localized pattern discovery tailored to your health.',
    icon: <Sparkles className="w-6 h-6 text-amber-400" />,
  },
  {
    id: 6,
    tab: 'history',
    title: 'Step 6 of 6: Activity History 📜',
    description:
      'Search, filter, or review all your past logged activities, voice transcripts, and notes anytime.',
    highlightText: 'Filter by category or search voice notes instantly.',
    icon: <History className="w-6 h-6 text-indigo-400" />,
  },
];

export const DemoTutorial: React.FC = () => {
  const {
    settings,
    setActiveTab,
    setEntryStep,
    setSelectedCategory,
    resetToCategoryPicker,
  } = useApp();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Align the main application screen view with the current tutorial step
  const alignScreenWithStep = async (stepIndex: number) => {
    const step = TUTORIAL_STEPS[stepIndex];
    setActiveTab(step.tab);

    if (step.id === 1 || step.id === 2) {
      // Top-level Log Activity category picker (showing + Add Category button)
      resetToCategoryPicker();
    } else if (step.id === 3) {
      // Subcategory picker (showing + Add Goal button inside a category)
      setEntryStep('subcategory_picker');
      const fitnessCat = await db.categories.get('cat-fitness');
      if (fitnessCat) {
        setSelectedCategory(fitnessCat);
      } else {
        const firstTopCat = await db.categories
          .filter((c) => c.parent_id === null && !c.deleted_at)
          .first();
        if (firstTopCat) setSelectedCategory(firstTopCat);
      }
    }
  };

  // Auto-launch tutorial when in demo mode and align screen for step 1
  useEffect(() => {
    if (settings.is_demo_mode) {
      setIsDismissed(false);
      setCurrentStepIndex(0);
      alignScreenWithStep(0);
    }
  }, [settings.is_demo_mode]);

  if (!settings.is_demo_mode || isDismissed) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  const handleNextStep = async () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      await alignScreenWithStep(nextIndex);
    } else {
      setIsDismissed(true);
    }
  };

  const handlePrevStep = async () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      await alignScreenWithStep(prevIndex);
    }
  };

  const handleGoToStep = async (idx: number) => {
    setCurrentStepIndex(idx);
    await alignScreenWithStep(idx);
  };

  const handleExitTutorial = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Floating Tutorial Callout Card */}
      <div className="bg-slate-900/95 text-white p-5 rounded-3xl shadow-2xl border-2 border-sky-500/60 backdrop-blur-md space-y-4">
        {/* Card Top: Icon, Step Title & Exit Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              {currentStep.icon}
            </div>
            <div>
              <div className="font-extrabold text-sm text-sky-400">
                {currentStep.title}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Guided Interactive Tour
              </div>
            </div>
          </div>

          <button
            onClick={handleExitTutorial}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors tap-target flex items-center justify-center"
            title="Exit Tutorial"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Exit Tutorial</span>
          </button>
        </div>

        {/* Description Body */}
        <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-200">
          <p>{currentStep.description}</p>
          <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-800/50 text-sky-200 text-xs font-semibold">
            💡 {currentStep.highlightText}
          </div>
        </div>

        {/* Step Indicator Dots & Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => handleGoToStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'bg-sky-400 w-6'
                    : 'bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Go to step ${step.id}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExitTutorial}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Exit
            </button>

            {currentStepIndex > 0 && (
              <button
                onClick={handlePrevStep}
                className="px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Prev
              </button>
            )}

            <button
              onClick={handleNextStep}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 tap-target"
            >
              {currentStepIndex === TUTORIAL_STEPS.length - 1 ? (
                <>
                  Done <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

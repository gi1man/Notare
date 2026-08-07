import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { clearDemoData } from '../../db/dummyDataGenerator';
import { Sparkles, Trash2 } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { settings, updateSettings, resetToCategoryPicker } = useApp();
  const [isClearing, setIsClearing] = useState(false);

  if (!settings.is_demo_mode) return null;

  const handleExitDemo = async () => {
    if (isClearing) return;
    setIsClearing(true);

    try {
      await clearDemoData();
      await updateSettings({ onboarding_completed: false, is_demo_mode: false });
      resetToCategoryPicker();
    } catch (err) {
      console.error('Failed to exit demo mode:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-[#0F4C45] dark:bg-sky-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-0 z-50 border-b border-[#8FA99B]/30">
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-amber-400 text-slate-900 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Demo Mode
          </span>
          <span className="hidden sm:inline opacity-90">
            Pre-populated with sample entries & goals.
          </span>
        </div>

        <button
          onClick={handleExitDemo}
          disabled={isClearing}
          className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-all tap-target flex items-center gap-1.5 shadow-sm"
          title="Delete sample data and exit demo mode"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Exit Demo & Clear Samples
        </button>
      </div>
    </div>
  );
};

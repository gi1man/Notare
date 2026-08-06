import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../db';
import { STARTER_CATEGORIES } from '../../db/starterData';
import { IconRenderer } from '../common/IconRenderer';
import { Check, Sparkles, ShieldCheck } from 'lucide-react';

export const OnboardingWizard: React.FC = () => {
  const { updateSettings } = useApp();
  const topCategories = STARTER_CATEGORIES.filter((c) => c.parent_id === null);

  // Selected top category IDs
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(
    topCategories.map((c) => c.id)
  );
  const [telemetryOptIn, setTelemetryOptIn] = useState<boolean>(false);

  const toggleCategory = (id: string) => {
    if (selectedCatIds.includes(id)) {
      setSelectedCatIds(selectedCatIds.filter((item) => item !== id));
    } else {
      setSelectedCatIds([...selectedCatIds, id]);
    }
  };

  const handleSelectAll = () => {
    setSelectedCatIds(topCategories.map((c) => c.id));
  };

  const handleFinish = async () => {
    // Enable selected categories, soft-delete unselected ones
    const allStarter = STARTER_CATEGORIES;

    for (const cat of allStarter) {
      const topParentId = cat.parent_id || cat.id;
      const isSelected = selectedCatIds.includes(topParentId);

      if (!isSelected) {
        // Soft delete
        await db.categories.put({
          ...cat,
          deleted_at: new Date().toISOString(),
        });
      } else {
        await db.categories.put({
          ...cat,
          deleted_at: null,
        });
      }
    }

    // Complete onboarding
    await updateSettings({
      onboarding_completed: true,
      telemetry_opt_in: telemetryOptIn,
    });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 rounded-2xl mb-2">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome to Notare
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Select the activities you want to track. You can customize, add, or change these anytime.
          </p>
        </div>

        {/* Action: Select All */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">
            Initial Categories
          </span>
          <button
            onClick={handleSelectAll}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Select All Defaults
          </button>
        </div>

        {/* Category Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {topCategories.map((cat) => {
            const isChecked = selectedCatIds.includes(cat.id);
            const subCount = STARTER_CATEGORIES.filter(
              (s) => s.parent_id === cat.id
            ).length;

            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all tap-target ${
                  isChecked
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isChecked
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    <IconRenderer name={cat.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base">{cat.name}</div>
                    <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {subCount} items
                    </div>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    isChecked
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isChecked && <Check className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Telemetry Opt-in Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Anonymous Usage Telemetry
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Help improve Notare by sending coarse, un-linkable usage counts (no names, no text, no personal IDs). Off by default.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 pt-1 cursor-pointer tap-target">
            <input
              type="checkbox"
              checked={telemetryOptIn}
              onChange={(e) => setTelemetryOptIn(e.target.checked)}
              className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
            />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Share anonymous usage stats
            </span>
          </label>
        </div>

        {/* Finish Button */}
        <button
          onClick={handleFinish}
          disabled={selectedCatIds.length === 0}
          className="w-full py-4 px-6 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all tap-target flex items-center justify-center gap-2"
        >
          Start Using Notare
        </button>
      </div>
    </div>
  );
};

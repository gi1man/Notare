import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { GoalWizardModal } from '../goals/GoalWizardModal';
import { Plus } from 'lucide-react';

export const CategoryPicker: React.FC = () => {
  const { setSelectedCategory, setEntryStep, isDebounced, triggerDebounce } = useApp();
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // Fetch active top-level categories from Dexie (filtering user-created only when not in demo mode)
  const categories = useLiveQuery(async () => {
    const list = await db.categories
      .filter((c) => (!c.parent_id || c.parent_id === null) && !c.deleted_at)
      .toArray();

    // Sort: Pinned first, then by sort_order
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.sort_order - b.sort_order;
    });
  }, []);

  const handleSelectCategory = (cat: Category) => {
    if (isDebounced) return;
    triggerDebounce(1200);

    setSelectedCategory(cat);
    setEntryStep('subcategory_picker');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 🏷️ Header: Title + Top Action Button */}
      <div className="flex items-center justify-between border-b border-notare-parchment-dark dark:border-slate-800 pb-4">
        <h1 className="text-3xl font-serif-logo font-bold text-[#0F4C45] dark:text-white leading-tight">
          Log activity
        </h1>

        <button
          onClick={() => setShowAddGoalModal(true)}
          className="px-4 py-2.5 bg-[#0F4C45] text-[#F5F1E8] hover:bg-[#135c54] dark:bg-sky-900/60 dark:text-sky-300 dark:hover:bg-sky-900 font-bold text-sm rounded-xl transition-all tap-target flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 text-[#8FA99B] dark:text-sky-300" />
          Add Goal
        </button>
      </div>

      {/* Empty State when 0 Categories exist */}
      {categories && categories.length === 0 && (
        <div className="text-center py-12 p-8 rounded-3xl bg-white/60 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-4">
          <div className="text-4xl">🎯</div>
          <h3 className="text-2xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
            No Goals Set Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            Set your first goal to create your categories and start tracking habits!
          </p>
          <button
            onClick={() => setShowAddGoalModal(true)}
            className="px-6 py-3 bg-[#0F4C45] hover:bg-[#135c54] dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-bold text-base rounded-2xl shadow-md transition-all tap-target inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create First Goal & Activity
          </button>
        </div>
      )}

      {/* 🎴 Responsive Floating Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelectCategory(cat)}
            disabled={isDebounced}
            className="group flex flex-col items-center justify-between p-6 rounded-3xl bg-[#0F4C45] text-[#F5F1E8] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/80 dark:border dark:border-slate-700 dark:hover:border-sky-500 hover:bg-[#135c54] transition-all shadow-md hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-95 tap-target no-select text-center space-y-4 aspect-square"
          >
            <div className="p-3.5 rounded-2xl bg-[#8FA99B] text-[#0F4C45] dark:bg-slate-900 dark:text-sky-400 group-hover:scale-110 transition-transform shadow-sm">
              <IconRenderer name={cat.icon} className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="font-extrabold text-xl leading-snug line-clamp-2">
              {cat.name}
            </div>
          </button>
        ))}
      </div>

      {/* Unified Goal Creation Wizard Modal */}
      {showAddGoalModal && (
        <GoalWizardModal onClose={() => setShowAddGoalModal(false)} />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { GoalEditorModal } from '../goals/GoalEditorModal';
import { GoalWizardModal } from '../goals/GoalWizardModal';
import { ChevronLeft, Plus } from 'lucide-react';

export const SubcategoryPicker: React.FC = () => {
  const { selectedCategory, setSelectedSubcategory, setEntryStep, isDebounced, triggerDebounce } = useApp();
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [goalModalSub, setGoalModalSub] = useState<Category | null>(null);

  // Fetch subcategories for selected parent category
  const subcategories = useLiveQuery(async () => {
    if (!selectedCategory) return [];
    const list = await db.categories
      .where('parent_id')
      .equals(selectedCategory.id)
      .filter((c) => !c.deleted_at)
      .toArray();

    return list.sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedCategory?.id]);

  const handleSelectSubcategory = (sub: Category) => {
    if (isDebounced) return;
    triggerDebounce(1200);

    setSelectedSubcategory(sub);
    setEntryStep('entry_form');
  };

  if (!selectedCategory) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* ‹ Header: Category Name */}
      <div className="flex items-center justify-between border-b border-notare-parchment-dark dark:border-slate-800 pb-4">
        <button
          onClick={() => setEntryStep('category_picker')}
          className="inline-flex items-center gap-1.5 text-2xl font-bold font-serif-logo text-[#0F4C45] dark:text-sky-400 hover:opacity-80 transition-opacity tap-target"
        >
          <ChevronLeft className="w-7 h-7 text-[#0F4C45] dark:text-sky-400 stroke-[2.5]" />
          <span>{selectedCategory.name}</span>
        </button>

        <button
          onClick={() => setShowAddGoalModal(true)}
          className="px-4 py-2.5 bg-[#0F4C45] text-[#F5F1E8] hover:bg-[#135c54] dark:bg-sky-900/60 dark:text-sky-300 dark:hover:bg-sky-900 font-bold text-sm rounded-xl shadow-sm flex items-center gap-1.5 tap-target"
        >
          <Plus className="w-4 h-4 text-[#8FA99B] dark:text-sky-300" />
          Add Goal
        </button>
      </div>

      {/* 🎴 Subcategory Sage Green Buttons Stack */}
      <div className="space-y-3.5">
        {subcategories?.map((sub, idx) => {
          const isRecent = idx === 0;

          return (
            <button
              key={sub.id}
              onClick={() => handleSelectSubcategory(sub)}
              disabled={isDebounced}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-[#8FA99B] text-[#0F4C45] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/80 dark:border dark:border-slate-700 dark:hover:border-sky-500 font-bold text-xl hover:bg-[#7d998b] transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-98 tap-target no-select text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#0F4C45] text-[#F5F1E8] dark:bg-sky-900/60 dark:text-sky-300">
                  <IconRenderer name={sub.icon || selectedCategory.icon} className="w-6 h-6" />
                </div>
                <span>{sub.name}</span>
              </div>

              {isRecent && (
                <span className="text-xs font-medium text-[#0F4C45] dark:text-sky-300 bg-white/40 dark:bg-sky-950/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  recent
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Goal Editor Modal (for editing existing item goal) */}
      {goalModalSub && (
        <GoalEditorModal
          subcategory={goalModalSub}
          onClose={() => setGoalModalSub(null)}
        />
      )}

      {/* Unified Goal Creation Wizard Modal */}
      {showAddGoalModal && (
        <GoalWizardModal
          initialCategory={selectedCategory}
          onClose={() => setShowAddGoalModal(false)}
        />
      )}
    </div>
  );
};

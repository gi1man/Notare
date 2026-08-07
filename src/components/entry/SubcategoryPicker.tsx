import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { syncCategoryToCloud } from '../../db/firestoreSync';
import { useApp } from '../../context/AppContext';
import { Category, ValueSchemaType } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { IconPicker } from '../common/IconPicker';
import { GoalEditorModal } from '../goals/GoalEditorModal';
import { ChevronLeft, Plus, X } from 'lucide-react';

export const SubcategoryPicker: React.FC = () => {
  const { settings, selectedCategory, setSelectedSubcategory, setEntryStep, isDebounced, triggerDebounce } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [goalModalSub, setGoalModalSub] = useState<Category | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('Activity');
  const [schemaType, setSchemaType] = useState<ValueSchemaType>('duration');
  const [schemaUnit, setSchemaUnit] = useState('mins');

  // Fetch subcategories for selected parent category
  const subcategories = useLiveQuery(async () => {
    if (!selectedCategory) return [];
    const list = await db.categories
      .where('parent_id')
      .equals(selectedCategory.id)
      .filter((c) => !c.deleted_at && (settings.is_demo_mode || !c.is_demo))
      .toArray();

    return list.sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedCategory?.id, settings.is_demo_mode]);

  const handleSelectSubcategory = (sub: Category) => {
    if (isDebounced) return;
    triggerDebounce(1200);

    setSelectedSubcategory(sub);
    setEntryStep('entry_form');
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !newSubName.trim()) return;

    const newSub: Category = {
      id: `sub-${Date.now()}`,
      parent_id: selectedCategory.id,
      name: newSubName.trim(),
      icon: newSubIcon,
      value_schema: {
        type: schemaType,
        unit: schemaUnit.trim() || undefined,
        dual_labels: schemaType === 'dual_number' ? ['Value 1', 'Value 2'] : undefined,
      },
      sort_order: (subcategories?.length || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    await db.categories.add(newSub);
    await syncCategoryToCloud(newSub);
    setNewSubName('');
    setShowAddModal(false);
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
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#0F4C45] text-[#F5F1E8] hover:bg-[#135c54] dark:bg-sky-900/60 dark:text-sky-300 dark:hover:bg-sky-900 font-bold text-sm rounded-xl shadow-sm flex items-center gap-1.5"
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

      {/* Goal Editor Modal */}
      {goalModalSub && (
        <GoalEditorModal
          subcategory={goalModalSub}
          onClose={() => setGoalModalSub(null)}
        />
      )}

      {/* Add Subcategory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F5F1E8] dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-3">
              <h3 className="text-xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
                Add to {selectedCategory.name}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubcategory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Walking, Pilates, Book Reading"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Input Type
                </label>
                <select
                  value={schemaType}
                  onChange={(e) => setSchemaType(e.target.value as ValueSchemaType)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                >
                  <option value="duration">Duration (e.g. Minutes, Hours)</option>
                  <option value="count">Count / Reps (e.g. Times, Glasses)</option>
                  <option value="rating">Rating (1-5 Stars)</option>
                  <option value="boolean">Done / Not Done (Checkbox)</option>
                  <option value="decimal">Decimal Number (e.g. Weight 165.5 lbs)</option>
                  <option value="dual_number">Dual Number (e.g. Blood Pressure 120/80)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. mins, reps, lbs"
                  value={schemaUnit}
                  onChange={(e) => setSchemaUnit(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose Icon
                </label>
                <IconPicker
                  selectedIcon={newSubIcon}
                  onSelectIcon={(icon) => setNewSubIcon(icon)}
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#0F4C45] dark:bg-sky-600 text-white hover:bg-[#135c54] dark:hover:bg-sky-700 font-bold rounded-xl shadow-md"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

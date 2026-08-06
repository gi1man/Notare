import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useApp } from '../../context/AppContext';
import { Category, ValueSchemaType } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { IconPicker } from '../common/IconPicker';
import { GoalEditorModal } from '../goals/GoalEditorModal';
import { ArrowLeft, Plus, ChevronRight, X, Target } from 'lucide-react';

export const SubcategoryPicker: React.FC = () => {
  const { selectedCategory, setSelectedSubcategory, setEntryStep, isDebounced, triggerDebounce } = useApp();
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
    setNewSubName('');
    setShowAddModal(false);
  };

  if (!selectedCategory) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Back Navigation & Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setEntryStep('category_picker')}
          className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-base hover:underline tap-target"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Categories
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-sky-100 dark:bg-sky-900/50 hover:bg-sky-200 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold text-sm rounded-xl transition-all tap-target flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <IconRenderer name={selectedCategory.icon} className="w-7 h-7 text-sky-600 dark:text-sky-400" />
          {selectedCategory.name}
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Step 2 of 3 — Select specific activity
        </p>
      </div>

      {/* Subcategory List Rows */}
      <div className="space-y-3">
        {subcategories?.map((sub) => (
          <button
            key={sub.id}
            onClick={() => handleSelectSubcategory(sub)}
            disabled={isDebounced}
            className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:bg-sky-100 border border-slate-200 dark:border-slate-700 hover:border-sky-500 rounded-2xl transition-all shadow-sm tap-target no-select text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                <IconRenderer name={sub.icon || selectedCategory.icon} className="w-6 h-6" />
              </div>

              <div>
                <div className="font-bold text-lg text-slate-900 dark:text-white">
                  {sub.name}
                </div>
                {sub.value_schema && (
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Input: {sub.value_schema.type} {sub.value_schema.unit ? `(${sub.value_schema.unit})` : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGoalModalSub(sub);
                }}
                className="p-2 text-xs font-bold text-sky-700 bg-sky-100 dark:bg-sky-900/60 dark:text-sky-300 rounded-lg hover:bg-sky-200 transition-colors tap-target flex items-center gap-1"
                title="Set Goal"
              >
                <Target className="w-4 h-4" />
                Goal
              </button>
              <ChevronRight className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
          </button>
        ))}
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
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
                  Subcategory Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pilates, Green Tea"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Value Input Type
                </label>
                <select
                  value={schemaType}
                  onChange={(e) => setSchemaType(e.target.value as ValueSchemaType)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="duration">Duration (Time in minutes/hours)</option>
                  <option value="count">Count / Quantity (Reps, cups, etc.)</option>
                  <option value="rating">Rating (1 to 5 Stars)</option>
                  <option value="boolean">Yes / No (Completion check)</option>
                  <option value="decimal">Decimal Number (Weight lbs/kg)</option>
                  <option value="dual_number">Dual Number (e.g. Blood Pressure 120/80)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. mins, lbs, glasses"
                  value={schemaUnit}
                  onChange={(e) => setSchemaUnit(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

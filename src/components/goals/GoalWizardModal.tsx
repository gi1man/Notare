import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Category, Goal, GoalFrequency } from '../../types';
import { clearDemoData } from '../../db/dummyDataGenerator';
import { syncCategoryToCloud, syncGoalToCloud } from '../../db/firestoreSync';
import { IconPicker } from '../common/IconPicker';
import { Target, X, Plus, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface GoalWizardModalProps {
  initialCategory?: Category | null;
  onClose: () => void;
}

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

export const GoalWizardModal: React.FC<GoalWizardModalProps> = ({ initialCategory, onClose }) => {
  const { updateSettings } = useApp();

  // Existing parent categories
  const categories = useLiveQuery(
    () => db.categories.filter((c) => c.parent_id === null && !c.deleted_at && !c.is_demo).toArray(),
    []
  );

  const [selectedTemplate, setSelectedTemplate] = useState<CategoryTemplate | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCategory ? initialCategory.id : 'new');
  const [customCatName, setCustomCatName] = useState<string>('');
  const [catIcon, setCatIcon] = useState<string>('Folder');

  const [itemName, setItemName] = useState<string>('');
  const [itemIcon] = useState<string>('Activity');
  const [targetVal, setTargetVal] = useState<number>(30);
  const [targetUnit, setTargetUnit] = useState<string>('mins');
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectTemplate = (tpl: CategoryTemplate) => {
    setSelectedTemplate(tpl);
    setSelectedCatId('new');
    setCustomCatName(tpl.name);
    setCatIcon(tpl.icon);
    if (tpl.suggestedItems.length > 0 && !itemName) {
      setItemName(tpl.suggestedItems[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let parentCatId = selectedCatId;

      // 1. Create new top-level category or preserve existing category as non-demo
      if (selectedCatId === 'new') {
        const catName = selectedTemplate ? selectedTemplate.name : customCatName.trim() || 'Custom Category';
        parentCatId = selectedTemplate ? selectedTemplate.id : `cat-${Date.now()}`;
        
        let existingParent = await db.categories.get(parentCatId);
        if (!existingParent) {
          const newCat: Category = {
            id: parentCatId,
            parent_id: null,
            name: catName,
            icon: catIcon || 'Folder',
            pinned: false,
            sort_order: (categories?.length || 0) + 1,
            is_demo: false,
            updated_at: new Date().toISOString(),
          };
          await db.categories.put(newCat);
          await syncCategoryToCloud(newCat);
        } else {
          await db.categories.put({ ...existingParent, is_demo: false, updated_at: new Date().toISOString() });
        }
      } else {
        const existingCat = await db.categories.get(selectedCatId);
        if (existingCat) {
          const preservedCat: Category = {
            ...existingCat,
            is_demo: false,
            updated_at: new Date().toISOString(),
          };
          await db.categories.put(preservedCat);
          await syncCategoryToCloud(preservedCat);
        }
      }

      // 2. Create Subcategory Activity Item
      const subId = `sub-${Date.now()}`;
      const newSub: Category = {
        id: subId,
        parent_id: parentCatId,
        name: itemName.trim(),
        icon: itemIcon,
        value_schema: {
          type: targetUnit === 'glasses' || targetUnit === 'times' || targetUnit === 'steps' ? 'count' : 'duration',
          unit: targetUnit,
        },
        sort_order: 1,
        is_demo: false,
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
        target_type: targetUnit === 'glasses' || targetUnit === 'times' || targetUnit === 'steps' ? 'count' : 'time',
        target_value: Number(targetVal) || 1,
        is_demo: false,
        updated_at: new Date().toISOString(),
      };
      await db.goals.put(newGoal);
      await syncGoalToCloud(newGoal);

      // 4. Purge unused demo data & turn off demo mode
      await clearDemoData();
      await updateSettings({ is_demo_mode: false, onboarding_completed: true });

      onClose();
    } catch (err) {
      console.error('Failed to create goal and activity item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSuggestedItems = selectedTemplate ? selectedTemplate.suggestedItems : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#F5F1E8] dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-notare-parchment-dark dark:border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2 text-[#0F4C45] dark:text-white font-extrabold text-xl font-serif-logo">
            <Target className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Create New Activity Goal</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🌟 Suggested Category Templates */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Suggested Categories
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3 rounded-2xl border font-bold text-xs flex items-center gap-2 transition-all tap-target text-left ${
                      isSelected
                        ? 'border-[#0F4C45] bg-[#0F4C45] text-white dark:bg-sky-600 dark:border-sky-600 shadow-md'
                        : 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span>{tpl.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Dropdown & Custom Category Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Category Choice
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                if (e.target.value !== 'new') {
                  setSelectedTemplate(null);
                }
              }}
              className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
            >
              <option value="new">✨ + Create New Category...</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  📁 {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Category Details (if 'new' selected and no template) */}
          {selectedCatId === 'new' && !selectedTemplate && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                New Category Name & Icon
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Health, Hobbies, Work..."
                value={customCatName}
                onChange={(e) => setCustomCatName(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white"
              />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select Category Icon
                </label>
                <IconPicker selectedIcon={catIcon} onSelectIcon={setCatIcon} />
              </div>
            </div>
          )}

          {/* Goal Activity Item Name */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Activity Item Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Daily Walk, Hydration, Meditation, Reading..."
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
            />

            {/* Suggested Activity Item Chips */}
            {activeSuggestedItems.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Suggested Activities for {selectedTemplate?.name}:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeSuggestedItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setItemName(item)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border tap-target ${
                        itemName === item
                          ? 'bg-[#0F4C45] text-white border-[#0F4C45] dark:bg-sky-600'
                          : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target Goal Values */}
          <div className="space-y-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Target Goal Details
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Amount
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={targetVal}
                  onChange={(e) => setTargetVal(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Unit
                </label>
                <select
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                >
                  <option value="mins">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="glasses">Glasses</option>
                  <option value="times">Times</option>
                  <option value="steps">Steps</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['daily', 'weekly', 'monthly'] as GoalFrequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setFrequency(freq)}
                    className={`py-2 rounded-xl text-xs font-extrabold capitalize transition-all border ${
                      frequency === freq
                        ? 'bg-[#0F4C45] text-white border-[#0F4C45] dark:bg-sky-600 dark:border-sky-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !itemName.trim()}
            className="w-full py-4 px-6 bg-[#0F4C45] hover:bg-[#135c54] disabled:opacity-40 text-white font-extrabold rounded-2xl text-base shadow-lg transition-all tap-target flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Goal & Activity Item →
          </button>
        </form>
      </div>
    </div>
  );
};

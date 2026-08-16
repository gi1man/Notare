import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Category, Goal, GoalFrequency, GoalDirection } from '../../types';
import { clearDemoData } from '../../db/dummyDataGenerator';
import { syncCategoryToCloud, syncGoalToCloud } from '../../db/firestoreSync';
import { IconRenderer } from '../common/IconRenderer';
import { IconPicker } from '../common/IconPicker';
import { Target, X, Check, Sparkles, Palette } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface CategoryTemplate {
  id: string;
  name: string;
  icon: string;
  suggestedItems: string[];
}

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
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
  {
    id: 'cat-creativity',
    name: 'Creativity',
    icon: 'Palette',
    suggestedItems: ['Painting', 'Writing', 'Music Practice', 'Sketching'],
  },
  {
    id: 'cat-social',
    name: 'Social Life',
    icon: 'Smile',
    suggestedItems: ['Family Time', 'Phone Call', 'Date Night', 'Catch Up'],
  },
];

interface UnifiedGoalWizardModalProps {
  initialCategory?: Category | null;
  onClose: () => void;
}

export const UnifiedGoalWizardModal: React.FC<UnifiedGoalWizardModalProps> = ({
  initialCategory,
  onClose,
}) => {
  const { updateSettings } = useApp();

  const existingCategories = useLiveQuery(
    () => db.categories.filter((c) => c.parent_id === null && !c.deleted_at && !c.is_demo).toArray(),
    []
  );

  // If initialCategory was passed, match template or custom
  const [selectedTemplate, setSelectedTemplate] = useState<CategoryTemplate | null>(() => {
    if (initialCategory) {
      return CATEGORY_TEMPLATES.find((t) => t.name === initialCategory.name) || null;
    }
    return CATEGORY_TEMPLATES[0]; // Default to Fitness & Health
  });

  const [customCatName, setCustomCatName] = useState<string>(
    initialCategory && !CATEGORY_TEMPLATES.some((t) => t.name === initialCategory.name)
      ? initialCategory.name
      : ''
  );
  const [catIcon, setCatIcon] = useState<string>('Folder');

  const [itemName, setItemName] = useState<string>(
    initialCategory ? '' : CATEGORY_TEMPLATES[0].suggestedItems[0]
  );
  const [itemIcon, setItemIcon] = useState<string>('Activity');
  const [showItemIconPicker, setShowItemIconPicker] = useState<boolean>(false);

  const [targetVal, setTargetVal] = useState<number>(30);
  const [targetUnit, setTargetUnit] = useState<string>('mins');
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [direction, setDirection] = useState<GoalDirection>('at_least');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectTemplate = (tmpl: CategoryTemplate) => {
    setSelectedTemplate(tmpl);
    setCustomCatName('');
    if (tmpl.suggestedItems.length > 0) {
      setItemName(tmpl.suggestedItems[0]);
    }
  };

  const handleCreateCategoryAndGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCatName = selectedTemplate ? selectedTemplate.name : customCatName.trim();
    const finalItemName = itemName.trim();

    if (!finalCatName || !finalItemName || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Create or update parent category
      let parentCatId = selectedTemplate
        ? selectedTemplate.id
        : `cat-${Date.now()}`;
      
      if (initialCategory) {
        parentCatId = initialCategory.id;
      }

      let parentCat = await db.categories.get(parentCatId);
      if (!parentCat) {
        parentCat = {
          id: parentCatId,
          parent_id: null,
          name: finalCatName,
          icon: selectedTemplate ? selectedTemplate.icon : catIcon || 'Folder',
          pinned: true,
          sort_order: (existingCategories?.length || 0) + 1,
          is_demo: false,
          updated_at: new Date().toISOString(),
        };
        await db.categories.put(parentCat);
        await syncCategoryToCloud(parentCat);
      } else {
        const updatedParent = {
          ...parentCat,
          is_demo: false,
          updated_at: new Date().toISOString(),
        };
        await db.categories.put(updatedParent);
        await syncCategoryToCloud(updatedParent);
      }

      // 2. Create Subcategory Activity Item
      const subId = `sub-${Date.now()}`;
      const newSub: Category = {
        id: subId,
        parent_id: parentCatId,
        name: finalItemName,
        icon: itemIcon || (selectedTemplate ? selectedTemplate.icon : 'Activity'),
        value_schema: {
          type: targetUnit === 'glasses' || targetUnit === 'times' || targetUnit === 'steps' ? 'count' : 'duration',
          unit: targetUnit || 'mins',
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
        direction,
        target_type: targetUnit === 'glasses' || targetUnit === 'times' || targetUnit === 'steps' ? 'count' : 'time',
        target_value: Number(targetVal) || 1,
        is_demo: false,
        updated_at: new Date().toISOString(),
      };
      await db.goals.put(newGoal);
      await syncGoalToCloud(newGoal);

      // 4. Clean up unused demo data & turn off demo mode
      await clearDemoData();
      await updateSettings({ is_demo_mode: false, onboarding_completed: true });

      onClose();
    } catch (err) {
      console.error('Failed to create category and goal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitGoal = (selectedTemplate || customCatName.trim()) && itemName.trim();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#F5F1E8] dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-notare-parchment-dark dark:border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2 text-[#0F4C45] dark:text-white font-extrabold text-xl font-serif-logo">
            <Target className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>Create Your Activity Goal 🎯</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors tap-target"
          >
            <X className="w-6 h-6" />
          </button>
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

            {/* Custom Category Input & Icon Picker */}
            <div className="pt-1 space-y-3">
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

              {!selectedTemplate && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-[#0F4C45] dark:text-sky-400" />
                    Custom Category Icon
                  </label>
                  <IconPicker selectedIcon={catIcon} onSelectIcon={setCatIcon} />
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Activity Item Name & Icon Picker */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Name Your Activity Item & Choose Icon
            </label>

            {selectedTemplate && selectedTemplate.suggestedItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTemplate.suggestedItems.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setItemName(sug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors tap-target ${
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

            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="e.g. Walking, Green Tea, Book Reading..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="flex-1 p-3.5 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0F4C45]"
              />

              <button
                type="button"
                onClick={() => setShowItemIconPicker(!showItemIconPicker)}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[#0F4C45] dark:text-sky-400 font-bold hover:bg-slate-100 flex items-center gap-2 shrink-0 tap-target"
                title="Change Activity Icon"
              >
                <IconRenderer name={itemIcon} className="w-5 h-5" />
                <span className="text-xs">Icon</span>
              </button>
            </div>

            {/* Collapsible Activity Item Icon Picker */}
            {showItemIconPicker && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#0F4C45] dark:text-sky-400" />
                  Select Activity Item Icon
                </label>
                <IconPicker
                  selectedIcon={itemIcon}
                  onSelectIcon={(ic) => {
                    setItemIcon(ic);
                    setShowItemIconPicker(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Step 3: Target Amount, Unit & Frequency */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              3. Target Goal Amount & Unit
            </label>

            {/* Goal Direction (Encourage vs Limit) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('at_least')}
                className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all tap-target ${
                  direction === 'at_least'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>At Least (Encourage)</span>
                <span className="text-[10px] font-normal opacity-80">e.g. Walk ≥ 30 mins</span>
              </button>

              <button
                type="button"
                onClick={() => setDirection('at_most')}
                className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all tap-target ${
                  direction === 'at_most'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>At Most (Limit Cap)</span>
                <span className="text-[10px] font-normal opacity-80">e.g. TV ≤ 60 mins</span>
              </button>
            </div>

            {/* Default Unit Chips */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Quick Unit Chips (or type below):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['mins', 'hours', 'glasses', 'times', 'steps', 'pages', 'miles', 'km'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setTargetUnit(u)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border tap-target ${
                      targetUnit === u
                        ? 'bg-[#0F4C45] text-white border-[#0F4C45] dark:bg-sky-600'
                        : 'bg-white text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Target Amount & Unit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={targetVal}
                    onChange={(e) => setTargetVal(Number(e.target.value))}
                    className="w-24 p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-lg text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="e.g. mins, laps..."
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                    className="flex-1 p-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Frequency
                </label>
                <div className="flex rounded-2xl border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-900 p-1">
                  {(['daily', 'weekly', 'monthly'] as GoalFrequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={`flex-1 py-2 font-bold text-xs capitalize rounded-xl transition-all tap-target ${
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
    </div>
  );
};

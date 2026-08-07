import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { IconPicker } from '../common/IconPicker';
import { Plus, X } from 'lucide-react';

export const CategoryPicker: React.FC = () => {
  const { settings, setSelectedCategory, setEntryStep, isDebounced, triggerDebounce } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Bookmark');

  // Fetch active top-level categories from Dexie (filtering user-created only when not in demo mode)
  const categories = useLiveQuery(async () => {
    const list = await db.categories
      .filter((c) => c.parent_id === null && !c.deleted_at && (settings.is_demo_mode || !c.is_demo))
      .toArray();

    // Sort: Pinned first, then by sort_order
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [settings.is_demo_mode]);

  const handleSelectCategory = (cat: Category) => {
    if (isDebounced) return;
    triggerDebounce(1200);

    setSelectedCategory(cat);
    setEntryStep('subcategory_picker');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      parent_id: null,
      name: newCatName.trim(),
      icon: newCatIcon,
      pinned: false,
      sort_order: (categories?.length || 0) + 1,
      updated_at: new Date().toISOString(),
    };

    await db.categories.add(newCat);
    setNewCatName('');
    setShowAddModal(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 🏷️ Header: Title + Top Action Button */}
      <div className="flex items-center justify-between border-b border-notare-parchment-dark dark:border-slate-800 pb-4">
        <h1 className="text-3xl font-serif-logo font-bold text-[#0F4C45] dark:text-white leading-tight">
          Log activity
        </h1>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#0F4C45] text-[#F5F1E8] hover:bg-[#135c54] dark:bg-sky-900/60 dark:text-sky-300 dark:hover:bg-sky-900 font-bold text-sm rounded-xl transition-all tap-target flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 text-[#8FA99B] dark:text-sky-300" />
          Add Category
        </button>
      </div>

      {/* Empty State when 0 Categories exist */}
      {categories && categories.length === 0 && (
        <div className="text-center py-12 p-8 rounded-3xl bg-white/60 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 space-y-4">
          <div className="text-4xl">📂</div>
          <h3 className="text-2xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
            No Categories Yet
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            Create your first activity category or set a goal to start logging!
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-[#0F4C45] hover:bg-[#135c54] dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-bold text-base rounded-2xl shadow-md transition-all tap-target inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create First Category
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
            className="group flex flex-col items-center justify-center p-6 rounded-3xl bg-[#8FA99B] text-[#0F4C45] hover:bg-[#7d998b] dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/80 dark:border-2 dark:border-slate-700 dark:hover:border-sky-500 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 tap-target no-select text-center"
          >
            {/* Icon container */}
            <div className="mb-3 p-3.5 rounded-2xl bg-[#0F4C45] text-[#F5F1E8] dark:bg-sky-900/60 dark:text-sky-300 group-hover:scale-110 transition-transform">
              <IconRenderer name={cat.icon} className="w-8 h-8 stroke-[2.2]" />
            </div>

            {/* Category Name */}
            <span className="font-bold text-lg tracking-tight leading-tight text-[#0F4C45] dark:text-white">
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F5F1E8] dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-300 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-3">
              <h3 className="text-xl font-bold font-serif-logo text-[#0F4C45] dark:text-white">
                New Category
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hobbies, Gardening"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose Icon
                </label>
                <IconPicker
                  selectedIcon={newCatIcon}
                  onSelectIcon={(icon) => setNewCatIcon(icon)}
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
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

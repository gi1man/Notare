import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { IconPicker } from '../common/IconPicker';
import { Pin, Plus, X } from 'lucide-react';

export const CategoryPicker: React.FC = () => {
  const { setSelectedCategory, setEntryStep, isDebounced, triggerDebounce } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Bookmark');

  // Fetch active top-level categories from Dexie
  const categories = useLiveQuery(async () => {
    const list = await db.categories
      .filter((c) => c.parent_id === null && !c.deleted_at)
      .toArray();

    // Sort: Pinned first, then by sort_order
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.sort_order - b.sort_order;
    });
  });

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
      {/* Step Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Select Category
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Step 1 of 3 — Tap any activity category
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-sky-100 dark:bg-sky-900/50 hover:bg-sky-200 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold text-sm rounded-xl transition-all tap-target flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelectCategory(cat)}
            disabled={isDebounced}
            className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 active:bg-sky-100 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-500 rounded-2xl transition-all shadow-sm hover:shadow-md tap-target no-select text-center"
          >
            {cat.pinned && (
              <span className="absolute top-3 right-3 text-amber-500" title="Pinned Category">
                <Pin className="w-4 h-4 fill-amber-500" />
              </span>
            )}

            <div className="p-3.5 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 group-hover:scale-110 transition-transform mb-3">
              <IconRenderer name={cat.icon} className="w-8 h-8" />
            </div>

            <span className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
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

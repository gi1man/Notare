import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Category } from '../../types';
import { IconRenderer } from '../common/IconRenderer';
import { Folder, Trash2, ArrowRightLeft, Pin, X, Pencil } from 'lucide-react';
import { GoalEditorModal } from '../goals/GoalEditorModal';

interface CategoryManagerModalProps {
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ onClose }) => {
  const categories = useLiveQuery(() => db.categories.filter((c) => !c.deleted_at).toArray());

  const [editingSub, setEditingSub] = useState<Category | null>(null);
  const [editingGoalSub, setEditingGoalSub] = useState<Category | null>(null);
  const [targetParentId, setTargetParentId] = useState<string>('');

  const topCategories = categories?.filter((c) => c.parent_id === null) || [];
  const subcategoryMap = new Map<string, Category[]>();

  categories?.forEach((c) => {
    if (c.parent_id) {
      const list = subcategoryMap.get(c.parent_id) || [];
      list.push(c);
      subcategoryMap.set(c.parent_id, list);
    }
  });

  // Toggle Pin Category
  const handleTogglePin = async (cat: Category) => {
    await db.categories.update(cat.id, {
      pinned: !cat.pinned,
      updated_at: new Date().toISOString(),
    });
  };

  // Delete Category (Soft Delete)
  const handleDeleteCategory = async (cat: Category) => {
    if (confirm(`Are you sure you want to delete category "${cat.name}"? Past entry logs will be preserved.`)) {
      await db.categories.update(cat.id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Delete Goal / Subcategory (Soft Delete)
  const handleDeleteSubcategory = async (sub: Category) => {
    if (confirm(`Are you sure you want to delete goal "${sub.name}"? Past entry logs will be preserved.`)) {
      await db.categories.update(sub.id, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Move Goal to Different Parent Category
  const handleMoveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !targetParentId) return;

    await db.categories.update(editingSub.id, {
      parent_id: targetParentId,
      updated_at: new Date().toISOString(),
    });

    setEditingSub(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Folder className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              Manage Categories & Goals
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Re-order, move goals, pin favorites, or delete categories
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category List Accordion */}
        <div className="space-y-4">
          {topCategories.map((cat) => {
            const subs = subcategoryMap.get(cat.id) || [];

            return (
              <div
                key={cat.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 font-bold text-base text-slate-900 dark:text-white">
                    <IconRenderer name={cat.icon} className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    {cat.name}
                    {cat.pinned && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-xs font-semibold">
                        Pinned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTogglePin(cat)}
                      className={`p-2 rounded-lg text-xs font-bold transition-all tap-target ${
                        cat.pinned
                          ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/50'
                          : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                      title={cat.pinned ? 'Unpin Category' : 'Pin Category'}
                    >
                      <Pin className={`w-4 h-4 ${cat.pinned ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2 text-slate-400 hover:text-rose-600 transition-colors tap-target"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories List */}
                {subs.length === 0 ? (
                  <div className="text-xs text-slate-400 italic pl-8">No goals in this category</div>
                ) : (
                  <div className="pl-6 space-y-2 border-l-2 border-slate-200 dark:border-slate-800">
                    {subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                          <IconRenderer name={sub.icon || cat.icon} className="w-4 h-4 text-sky-600" />
                          {sub.name}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Move Button */}
                          <button
                            onClick={() => {
                              setEditingSub(sub);
                              setTargetParentId(sub.parent_id || '');
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 rounded-md hover:bg-sky-100 flex items-center gap-1 tap-target"
                            title="Move to another category"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Move
                          </button>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => handleDeleteSubcategory(sub)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors tap-target"
                            title="Delete Goal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Edit Goal Button */}
                          <button
                            onClick={() => setEditingGoalSub(sub)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 transition-colors tap-target"
                            title="Edit goal targets"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Move Goal Modal */}
        {editingSub && (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-sky-600" />
                Move "{editingSub.name}"
              </h4>

              <form onSubmit={handleMoveSubcategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select New Category
                  </label>
                  <select
                    value={targetParentId}
                    onChange={(e) => setTargetParentId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-sm"
                  >
                    {topCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSub(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-sm shadow-md"
                  >
                    Save Move
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Goal Editor Modal */}
        {editingGoalSub && (
          <GoalEditorModal
            subcategory={editingGoalSub}
            onClose={() => setEditingGoalSub(null)}
          />
        )}
      </div>
    </div>
  );
};
